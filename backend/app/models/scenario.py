from sqlalchemy import Column, Integer, String
from app.database import Base

class RedTeamScenario(Base):
    __tablename__ = "red_team_scenarios"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    payload_type = Column(String, nullable=False)  # Jailbreak, Injection, Leakage
    payload = Column(String, nullable=False)       # The adversarial text template
