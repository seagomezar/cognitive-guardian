from dotenv import load_dotenv
load_dotenv()  # Must be before ADK imports so env vars are set at init time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part
from cognitive_guardian.agent import root_agent, ai_image_agent
import json
import uvicorn
from urllib.parse import urlparse
from pydantic import BaseModel
import struct
import base64
import asyncio
from google import genai as _genai_tts
from google.genai import types as _genai_types

app = FastAPI(title="Cognitive Guardian API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

APP_NAME = "cognitive_guardian"
AI_IMAGE_APP_NAME = "ai_image_detector"
session_service = InMemorySessionService()
ai_image_session_service = InMemorySessionService()
runner = Runner(agent=root_agent, app_name=APP_NAME, session_service=session_service)
ai_image_runner = Runner(agent=ai_image_agent, app_name=AI_IMAGE_APP_NAME, session_service=ai_image_session_service)
COOLDOWN_MS = 15_000

# Hash-based dedup: tracks already-analyzed image src hashes within process lifetime
_analyzed_image_hashes: set[str] = set()


class AnalyzeRequest(BaseModel):
    image: str    # base64 data URL
    metadata: dict
    timestamp: int
    locale: str = "en"  # BCP-47 language tag, defaults for backwards compatibility


_TTS_VOICE_MAP = {"en": "Aoede", "es": "Charon", "fr": "Kore", "pt": "Fenrir"}

def _pcm_to_wav(pcm_data: bytes, sample_rate: int = 24000, channels: int = 1, bits: int = 16) -> bytes:
    data_size = len(pcm_data)
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF", 36 + data_size, b"WAVE", b"fmt ", 16, 1, channels,
        sample_rate, sample_rate * channels * bits // 8,
        channels * bits // 8, bits, b"data", data_size,
    )
    return header + pcm_data

def _generate_tts_audio_sync(text: str, locale: str) -> str | None:
    """Synchronous TTS — must be called via asyncio.to_thread()."""
    if not text:
        return None
    voice_name = _TTS_VOICE_MAP.get(locale, "Aoede")
    try:
        client = _genai_tts.Client()
        response = client.models.generate_content(
            model="gemini-2.5-flash-preview-tts",
            contents=text,
            config=_genai_types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=_genai_types.SpeechConfig(
                    voice_config=_genai_types.VoiceConfig(
                        prebuilt_voice_config=_genai_types.PrebuiltVoiceConfig(
                            voice_name=voice_name
                        )
                    )
                ),
            ),
        )
        pcm_bytes = response.candidates[0].content.parts[0].inline_data.data
        wav_bytes = _pcm_to_wav(pcm_bytes)
        b64 = base64.b64encode(wav_bytes).decode("utf-8")
        return f"data:audio/wav;base64,{b64}"
    except Exception as exc:
        print(f"[TTS] generation failed: {exc}")
        return None


class AnalyzeImageRequest(BaseModel):
    image: str    # base64 data URL (for same-origin) or empty string
    url: str      # image src URL (for cross-origin, backend fetches it)
    context: str  # page URL for session keying
    timestamp: int
    image_hash: str  # short hash of src URL for dedup


@app.post("/api/analyze")
async def analyze_frame(request: AnalyzeRequest):
    url = request.metadata.get("url", "")
    title = request.metadata.get("title", "")
    session_id = f"cg-{urlparse(url).netloc or 'unknown'}"
    user_id = "extension-user"

    session = await session_service.get_session(
        app_name=APP_NAME, user_id=user_id, session_id=session_id
    )
    if session is None:
        session = await session_service.create_session(
            app_name=APP_NAME,
            user_id=user_id,
            session_id=session_id,
            state={"last_intervention_time": 0, "frame_history": []},
        )

    # Cooldown check — saves API cost
    if request.timestamp - session.state.get("last_intervention_time", 0) < COOLDOWN_MS:
        return {"action": "none"}

    raw_b64 = request.image.split(",")[1] if "," in request.image else request.image
    mime = "image/jpeg"

    history = session.state.get("frame_history", [])

    # Count consecutive frames on the current domain (for doomscrolling detection)
    current_domain = urlparse(url).netloc
    consecutive_same_domain = 0
    for h in reversed(history[-10:]):
        if urlparse(h.get("url", "")).netloc == current_domain:
            consecutive_same_domain += 1
        else:
            break

    history_text = f"Recent URLs visited: {[h.get('url', '') for h in history[-5:]]}" if history else ""
    context_text = (
        f"Analyze this browser screenshot.\n"
        f"URL: {url}\nTitle: {title}\n"
        f"consecutive_same_domain: {consecutive_same_domain}\n"
        f"consecutive_social_frames: {consecutive_same_domain}\n"
        f"{history_text}"
    )

    new_message = Content(
        role="user",
        parts=[
            Part(text=context_text),
            Part(inline_data={"mime_type": mime, "data": raw_b64}),
        ],
    )

    final_response = None
    async for event in runner.run_async(
        user_id=user_id, session_id=session_id, new_message=new_message
    ):
        if event.is_final_response() and event.content and event.content.parts:
            for part in event.content.parts:
                if hasattr(part, "text") and part.text:
                    final_response = part.text
                    break

    if not final_response:
        return {"action": "none"}

    try:
        result = json.loads(final_response)
    except (json.JSONDecodeError, TypeError):
        return {"action": "none"}

    if result.get("confidence", 0) < 0.65:
        return {"action": "none"}

    history.append({"timestamp": request.timestamp, "url": url, "title": title})
    session.state["frame_history"] = history[-10:]
    if result.get("action") != "none":
        session.state["last_intervention_time"] = request.timestamp

    # Generate TTS audio server-side
    voice_text = result.get("voice_message") or result.get("message")
    if result.get("action") != "none" and voice_text:
        audio_data = await asyncio.to_thread(_generate_tts_audio_sync, voice_text, request.locale)
        if audio_data:
            result["audio_data"] = audio_data

    return result


@app.post("/api/analyze-image")
async def analyze_image(request: AnalyzeImageRequest):
    # Dedup: skip if we've already analyzed this image in this session
    if request.image_hash in _analyzed_image_hashes:
        return {"is_ai_generated": False, "confidence": 0.0, "reasoning": "Already analyzed"}
    _analyzed_image_hashes.add(request.image_hash)

    session_id = f"aiimg-{request.image_hash}"
    user_id = "extension-user"

    session = await ai_image_session_service.get_session(
        app_name=AI_IMAGE_APP_NAME, user_id=user_id, session_id=session_id
    )
    if session is None:
        session = await ai_image_session_service.create_session(
            app_name=AI_IMAGE_APP_NAME,
            user_id=user_id,
            session_id=session_id,
            state={},
        )

    parts = [Part(text=f"Analyze this image from page: {request.context}")]

    if request.image:
        # Same-origin: base64 data provided directly
        raw_b64 = request.image.split(",")[1] if "," in request.image else request.image
        # Detect mime type from data URL prefix
        mime = "image/jpeg"
        if request.image.startswith("data:image/png"):
            mime = "image/png"
        elif request.image.startswith("data:image/webp"):
            mime = "image/webp"
        parts.append(Part(inline_data={"mime_type": mime, "data": raw_b64}))
    elif request.url:
        # Cross-origin: fetch server-side to bypass CORS
        import httpx
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(request.url, headers={"User-Agent": "Mozilla/5.0"})
                if resp.status_code == 200:
                    import base64
                    img_b64 = base64.b64encode(resp.content).decode()
                    content_type = resp.headers.get("content-type", "image/jpeg").split(";")[0]
                    parts.append(Part(inline_data={"mime_type": content_type, "data": img_b64}))
                else:
                    return {"is_ai_generated": False, "confidence": 0.0, "reasoning": "Could not fetch image"}
        except Exception as e:
            return {"is_ai_generated": False, "confidence": 0.0, "reasoning": f"Fetch error: {str(e)}"}
    else:
        return {"is_ai_generated": False, "confidence": 0.0, "reasoning": "No image data provided"}

    new_message = Content(role="user", parts=parts)

    final_response = None
    async for event in ai_image_runner.run_async(
        user_id=user_id, session_id=session_id, new_message=new_message
    ):
        if event.is_final_response() and event.content and event.content.parts:
            for part in event.content.parts:
                if hasattr(part, "text") and part.text:
                    final_response = part.text
                    break

    if not final_response:
        return {"is_ai_generated": False, "confidence": 0.0, "reasoning": "No response from model"}

    try:
        result = json.loads(final_response)
    except (json.JSONDecodeError, TypeError):
        return {"is_ai_generated": False, "confidence": 0.0, "reasoning": "Parse error"}

    print(f"[AI Image] hash={request.image_hash} is_ai={result.get('is_ai_generated')} conf={result.get('confidence'):.2f} | {result.get('reasoning', '')[:80]}")
    return result


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
