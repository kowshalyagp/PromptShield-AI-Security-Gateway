from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class RedTeamReport(Base):
    __tablename__ = "red_team_reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    category = Column(String, nullable=True)  # Null if all categories, otherwise name of category
    total_tests = Column(Integer, default=0)
    detected_count = Column(Integer, default=0)
    blocked_count = Column(Integer, default=0)
    false_positives = Column(Integer, default=0)
    false_negatives = Column(Integer, default=0)
    avg_latency_ms = Column(Float, default=0.0)
    category_accuracy = Column(String, nullable=True)  # JSON-string map of category -> accuracy percentage

    # Relationship to individual test results
    results = relationship("RedTeamResult", back_populates="report", cascade="all, delete-orphan")


class RedTeamResult(Base):
    __tablename__ = "red_team_results"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    report_id = Column(Integer, ForeignKey("red_team_reports.id"), nullable=False)
    attack_id = Column(String, nullable=False)
    category = Column(String, nullable=False)
    prompt = Column(String, nullable=False)
    risk_score = Column(Integer, default=0)
    threat_classification = Column(String, nullable=False)
    decision = Column(String, nullable=False)  # Allowed / Blocked
    gemini_called = Column(Boolean, default=False)
    latency_ms = Column(Integer, default=0)
    detection_reason = Column(String, nullable=True)
    status = Column(String, nullable=False)  # Passed / Failed (based on expected outcome match)

    # Reference to parent report
    report = relationship("RedTeamReport", back_populates="results")
