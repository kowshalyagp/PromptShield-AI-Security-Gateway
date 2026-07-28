import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import SessionLocal
from app.models.log import SecurityLog

logger = logging.getLogger("promptshield.audit")

class AuditLogger:
    """
    Service layer responsible for persisting security gateway logs to the database.
    Operates asynchronously to prevent network/disk latency from impacting gateway throughput.
    """

    @staticmethod
    async def save_log_async(
        request_id: str,
        prompt: str,
        response: str | None,
        risk_score: int,
        threat_category: str,
        threat_type: str,
        status: str,
        gemini_called: bool,
        latency_ms: int,
        error_message: str | None = None,
        scan_details: str | None = None
    ) -> None:
        """
        Creates a new db session and writes the security log to SQLite.
        Designed to run safely inside FastAPI BackgroundTasks.
        """
        # Use sessionmanager to retrieve a clean, isolated session context for background executions
        async with SessionLocal() as session:
            try:
                log_entry = SecurityLog(
                    request_id=request_id,
                    prompt=prompt,
                    response=response,
                    risk_score=risk_score,
                    threat_category=threat_category,
                    threat_type=threat_type,
                    status=status,
                    gemini_called=gemini_called,
                    latency_ms=latency_ms,
                    error_message=error_message,
                    scan_details=scan_details,
                    timestamp=datetime.utcnow()
                )
                session.add(log_entry)
                await session.commit()
                logger.debug(f"Audit log saved successfully for RID: {request_id}")
            except Exception as e:
                logger.error(f"Failed to persist audit log for RID {request_id}: {str(e)}")
                await session.rollback()

