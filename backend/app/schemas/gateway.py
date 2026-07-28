from pydantic import BaseModel
from typing import Optional, List

class PromptRequest(BaseModel):
    prompt: str

class SecurityMetrics(BaseModel):
    risk_score: int
    threat_category: str
    threat_type: str
    status: str
    latency_ms: int

class PromptResponse(BaseModel):
    response: Optional[str] = None
    blocked: bool
    metrics: SecurityMetrics
    error: Optional[str] = None
