from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class LogResponse(BaseModel):
    id: int
    timestamp: datetime
    prompt: str
    response: Optional[str]
    risk_score: int
    threat_category: str
    threat_type: str
    status: str
    latency_ms: int

    class Config:
        from_attributes = True
