from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from agent import CognitiveAgent

app = FastAPI(title="Cognitive Guardian API")

# Setup CORS for the extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for the hackathon extension
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the stateful logic agent
guardian_agent = CognitiveAgent()

class AnalyzeRequest(BaseModel):
    image: str # Base64 data URL
    metadata: dict
    timestamp: int

@app.post("/api/analyze")
async def analyze_frame(request: AnalyzeRequest):
    result = await guardian_agent.process_frame(request.image, request.metadata, request.timestamp)
    return result

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
