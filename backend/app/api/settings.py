import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.settings import SystemSetting
from app.config import settings
from app.api.deps import require_admin
from app.api.gateway import rate_limiter
import pydantic

logger = logging.getLogger("promptshield.api.settings")

router = APIRouter(prefix="/settings", tags=["System Settings"])

class SettingsUpdateSchema(pydantic.BaseModel):
    rate_limit_window: int = pydantic.Field(..., ge=1, le=3600)
    rate_limit_max_requests: int = pydantic.Field(..., ge=1, le=1000)
    risk_threshold_malicious: int = pydantic.Field(..., ge=0, le=100)
    risk_threshold_suspicious: int = pydantic.Field(..., ge=0, le=100)
    logging_level: str = pydantic.Field(..., pattern="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$")

@router.get("")
async def get_system_settings(
    current_admin = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves all active system configurations."""
    result = await db.execute(select(SystemSetting))
    db_settings = result.scalars().all()
    
    settings_dict = {s.key: s.value for s in db_settings}
    
    return {
        "rate_limit_window": int(settings_dict.get("rate_limit_window", settings.RATE_LIMIT_WINDOW_SECONDS)),
        "rate_limit_max_requests": int(settings_dict.get("rate_limit_max_requests", settings.RATE_LIMIT_MAX_REQUESTS)),
        "risk_threshold_malicious": int(settings_dict.get("risk_threshold_malicious", settings.RISK_THRESHOLD_MALICIOUS)),
        "risk_threshold_suspicious": int(settings_dict.get("risk_threshold_suspicious", settings.RISK_THRESHOLD_SUSPICIOUS)),
        "logging_level": settings_dict.get("logging_level", settings.LOGGING_LEVEL)
    }

@router.put("")
async def update_system_settings(
    payload: SettingsUpdateSchema,
    current_admin = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Updates system configurations both in the SQLite DB and in memory."""
    try:
        updates = {
            "rate_limit_window": str(payload.rate_limit_window),
            "rate_limit_max_requests": str(payload.rate_limit_max_requests),
            "risk_threshold_malicious": str(payload.risk_threshold_malicious),
            "risk_threshold_suspicious": str(payload.risk_threshold_suspicious),
            "logging_level": payload.logging_level
        }
        
        for key, val in updates.items():
            result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
            setting_item = result.scalar_one_or_none()
            if setting_item:
                setting_item.value = val
            else:
                db.add(SystemSetting(key=key, value=val))
                
        await db.commit()
        
        # Sync to memory configurations
        settings.RATE_LIMIT_WINDOW_SECONDS = payload.rate_limit_window
        settings.RATE_LIMIT_MAX_REQUESTS = payload.rate_limit_max_requests
        settings.RISK_THRESHOLD_MALICIOUS = payload.risk_threshold_malicious
        settings.RISK_THRESHOLD_SUSPICIOUS = payload.risk_threshold_suspicious
        settings.LOGGING_LEVEL = payload.logging_level
        
        # Sync in-memory rate limiter
        rate_limiter.window = payload.rate_limit_window
        rate_limiter.max_requests = payload.rate_limit_max_requests
        
        # Set dynamic logging levels
        logging.getLogger("promptshield").setLevel(payload.logging_level)
        
        return {
            "rate_limit_window": payload.rate_limit_window,
            "rate_limit_max_requests": payload.rate_limit_max_requests,
            "risk_threshold_malicious": payload.risk_threshold_malicious,
            "risk_threshold_suspicious": payload.risk_threshold_suspicious,
            "logging_level": payload.logging_level
        }
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to update settings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating configuration settings: {str(e)}"
        )
