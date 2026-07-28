import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "PromptShield Gateway"
    API_V1_STR: str = "/api/v1"
    
    # Security Configurations
    SECRET_KEY: str = "supersecretdevelopmentkeythatisthirtytwobyteslong"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./promptshield.db"
    
    # AI API keys
    GEMINI_API_KEY: str = ""
    
    # Rate Limiting
    RATE_LIMIT_WINDOW_SECONDS: int = 60
    RATE_LIMIT_MAX_REQUESTS: int = 10
    
    # Risk Thresholds & System Logging
    RISK_THRESHOLD_MALICIOUS: int = 70
    RISK_THRESHOLD_SUSPICIOUS: int = 30
    LOGGING_LEVEL: str = "INFO"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
