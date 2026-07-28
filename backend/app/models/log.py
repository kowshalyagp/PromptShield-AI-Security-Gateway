from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from datetime import datetime
from app.database import Base

class SecurityLog(Base):
    __tablename__ = "security_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    request_id = Column(String, index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    prompt = Column(String, nullable=False)
    response = Column(String, nullable=True)
    risk_score = Column(Integer, nullable=False)
    threat_category = Column(String, nullable=False)  # Safe, Suspicious, Malicious
    threat_type = Column(String, nullable=False)      # Inject, Jailbreak, Leakage, Harmful, etc.
    status = Column(String, nullable=False)           # Allowed, Blocked
    gemini_called = Column(Boolean, default=False)
    latency_ms = Column(Integer, default=0)
    error_message = Column(String, nullable=True)
    scan_details = Column(String, nullable=True)  # JSON string of safety scanning details

