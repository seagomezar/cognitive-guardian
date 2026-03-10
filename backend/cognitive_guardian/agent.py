from google.adk.agents import LlmAgent
from pydantic import BaseModel


class GuardianDecision(BaseModel):
    action: str         # "alert" | "voice" | "none"
    type: str           # "phishing" | "fakenews" | "manipulation" | "doomscrolling" | "burnout" | "aiimage" | "none"
    message: str        # Short UI overlay text
    voice_message: str  # TTS text (can equal message)
    confidence: float   # 0.0–1.0


class AiImageDecision(BaseModel):
    is_ai_generated: bool
    confidence: float   # 0.0–1.0
    reasoning: str      # Short explanation of signals detected


GUARDIAN_INSTRUCTION = """
You are Cognitive Guardian, a digital immune system analyzing browser screenshots.
You receive a screenshot and context (URL, page title, recent frame history).

Detect two categories of threats:
1. EXTERNAL (manipulation): phishing/scams, fake news/misinformation, dark patterns
2. INTERNAL (behavioral): doomscrolling on social media, burnout (hours of work without break)
3. AI-GENERATED IMAGES: if the page contains images that appear AI-generated or synthetic (distorted hands, garbled text, impossible lighting, hyper-smooth textures, uncanny faces), use type="aiimage"

RULES:
- Be conservative. Normal pages, work pages → action="none"
- Only alert if confidence >= 0.7
- For phishing/fake news: action="alert"
- For doomscrolling/burnout: action="alert" with a gentle, supportive message
- For aiimage: action="alert" with a brief informational message
- message and voice_message should be concise (2 sentences max), friendly, actionable

Always respond with a valid JSON matching the schema.
"""

AI_IMAGE_INSTRUCTION = """
You are an expert forensic image analyst. Analyze this single image and determine if it is AI-generated or synthetically created.

Look for:
- Unnatural hand anatomy (wrong finger count, fused digits, impossible poses)
- Garbled, blurry, or nonsensical text rendered inside the image
- Physically impossible or inconsistent lighting/shadows
- Objects bleeding into backgrounds
- Hyper-smooth skin or over-perfected textures
- Facial asymmetry artifacts common in diffusion models
- AI art style signatures (Midjourney aesthetic, DALL-E smoothness)
- Context mismatch (image too perfect for claimed context)

Be conservative. Only flag as AI-generated if confidence >= 0.75.
Natural photography, stock photos, and illustrations are NOT AI-generated.

Always respond with a valid JSON matching the schema.
"""

root_agent = LlmAgent(
    name="cognitive_guardian",
    model="gemini-2.5-flash",
    description="Digital immune system detecting cognitive threats in browser screenshots.",
    instruction=GUARDIAN_INSTRUCTION,
    output_schema=GuardianDecision,
    output_key="guardian_decision",
)

ai_image_agent = LlmAgent(
    name="ai_image_detector",
    model="gemini-2.5-flash",
    description="Forensic image analyst detecting AI-generated or synthetic images.",
    instruction=AI_IMAGE_INSTRUCTION,
    output_schema=AiImageDecision,
    output_key="ai_image_decision",
)
