from sqlalchemy import Column, Integer, String, Boolean
from app.database import Base

class SecurityPolicy(Base):
    __tablename__ = "security_policies"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    enabled = Column(Boolean, default=True)
    threshold = Column(Integer, default=70)  # Sensitivity threshold 0-100
