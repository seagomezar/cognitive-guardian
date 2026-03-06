from dotenv import load_dotenv
load_dotenv()  # Must be before ADK imports so env vars are set at init time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part
from cognitive_guardian.agent import root_agent
import json
import uvicorn
from urllib.parse import urlparse
from pydantic import BaseModel

app = FastAPI(title="Cognitive Guardian API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

APP_NAME = "cognitive_guardian"
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, app_name=APP_NAME, session_service=session_service)
COOLDOWN_MS = 15_000


class AnalyzeRequest(BaseModel):
    image: str    # base64 data URL
    metadata: dict
    timestamp: int


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
    history_text = (
        f"Recent URLs visited: {[h.get('url', '') for h in history[-5:]]}"
        if history
        else ""
    )

    new_message = Content(
        role="user",
        parts=[
            Part(text=f"Analyze this browser screenshot.\nURL: {url}\nTitle: {title}\n{history_text}"),
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

    if result.get("confidence", 0) < 0.7:
        return {"action": "none"}

    history.append({"timestamp": request.timestamp, "url": url, "title": title})
    session.state["frame_history"] = history[-10:]
    if result.get("action") != "none":
        session.state["last_intervention_time"] = request.timestamp

    return result


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
