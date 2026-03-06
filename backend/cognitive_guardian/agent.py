from google.adk.agents import LlmAgent
from pydantic import BaseModel


class GuardianDecision(BaseModel):
    action: str         # "alert" | "voice" | "none"
    type: str           # "phishing" | "fakenews" | "manipulation" | "doomscrolling" | "burnout" | "none"
    message: str        # Short UI overlay text
    voice_message: str  # TTS text (can equal message)
    confidence: float   # 0.0–1.0


GUARDIAN_INSTRUCTION = """
You are Cognitive Guardian, a digital immune system analyzing browser screenshots.
You receive a screenshot and context (URL, page title, recent frame history).

Detect two categories of threats:
1. EXTERNAL (manipulation): phishing/scams, fake news/misinformation, dark patterns
2. INTERNAL (behavioral): doomscrolling on social media, burnout (hours of work without break)

RULES:
- Be conservative. Normal pages, work pages → action="none"
- Only alert if confidence >= 0.7
- For phishing/fake news: action="alert"
- For doomscrolling/burnout: action="alert" with a gentle, supportive message
- message and voice_message should be concise (2 sentences max), friendly, actionable

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
