import time
import uuid
import logging
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.gateway import PromptRequest, PromptResponse, SecurityMetrics
from app.security.engine import SecurityEngine
from app.security.rate_limiter import InMemoryRateLimiter
from app.services.gemini_service import GeminiService, GeminiServiceError
from app.services.audit_logger import AuditLogger

logger = logging.getLogger("promptshield.gateway")

router = APIRouter(prefix="/gateway", tags=["AI Security Gateway"])

# Initialize singleton engine, service, and rate limiter instances
security_engine = SecurityEngine()
gemini_service = GeminiService()
rate_limiter = InMemoryRateLimiter()

@router.post("/chat", response_model=PromptResponse)
async def chat_gateway(
    payload: PromptRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    request_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat()
    start_time = time.perf_counter()
    
    # 0. Check Rate Limiting
    client_ip = request.client.host if request.client else "127.0.0.1"
    is_rate_limited, req_count = rate_limiter.check_limit(client_ip)
    
    if is_rate_limited:
        latency_ms = int((time.perf_counter() - start_time) * 1000)
        
        # Log rate limit violation in Audit Database
        import asyncio
        asyncio.create_task(
            AuditLogger.save_log_async(
                request_id=request_id,
                prompt=payload.prompt,
                response="Rate limit exceeded. Too many requests.",
                risk_score=50,
                threat_category="Suspicious",
                threat_type="Rate Limit Exceeded",
                status="Blocked",
                gemini_called=False,
                latency_ms=max(latency_ms, 1),
                error_message="HTTP 429 Too Many Requests"
            )
        )
        
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too Many Requests. Rate limit exceeded."
        )

    # 1. Run security engine check
    scan_result = await security_engine.scan_prompt(payload.prompt)
    is_malicious = scan_result["status"] == "Blocked"
    classification = scan_result["threat_category"]
    
    # Setup metrics tracking
    metrics = SecurityMetrics(
        risk_score=scan_result["risk_score"],
        threat_category=classification,
        threat_type=scan_result["threat_type"],
        status=scan_result["status"],
        latency_ms=0
    )
    
    # 2. Handle block flow
    if is_malicious:
        latency_ms = int((time.perf_counter() - start_time) * 1000)
        metrics.latency_ms = max(latency_ms, 1)
        
        # Log event immediately
        logger.warning(
            f"AUDIT LOG | RID: {request_id} | TS: {timestamp} | CLASSIFICATION: {classification} | "
            f"CALL_GEMINI: False | LATENCY: {metrics.latency_ms}ms | STATUS: Blocked | TYPE: {metrics.threat_type}"
        )
        
        # Queue background log task
        background_tasks.add_task(
            AuditLogger.save_log_async,
            request_id=request_id,
            prompt=payload.prompt,
            response="Security policy violation: Your prompt was blocked by PromptShield.",
            risk_score=metrics.risk_score,
            threat_category=metrics.threat_category,
            threat_type=metrics.threat_type,
            status=metrics.status,
            gemini_called=False,
            latency_ms=metrics.latency_ms,
            error_message=None,
            scan_details=json.dumps(scan_result)
        )
        
        return PromptResponse(
            response="Security policy violation: Your prompt was blocked by PromptShield.",
            blocked=True,
            metrics=metrics
        )
        
    # 3. Handle allowed prompt -> Call Gemini Service
    logger.info(
        f"AUDIT LOG | RID: {request_id} | TS: {timestamp} | CLASSIFICATION: {classification} | "
        f"CALL_GEMINI: True | STATUS: Processing"
    )
    
    gemini_called = True
    ai_response = None
    api_error = None
    
    try:
        # Call Gemini service
        ai_response = await gemini_service.generate_response(payload.prompt)
        
        # 4. Run response guardrail check on response
        guard_result = security_engine.response_guard.verify_response(ai_response)
        if guard_result["leakage_detected"]:
            logger.error(
                f"AUDIT LOG | RID: {request_id} | TS: {timestamp} | RESPONSE_GUARDRAIL: Violating leakage patterns detected"
            )
            metrics.status = "Blocked"
            metrics.threat_category = "Malicious"
            metrics.threat_type = "System Leakage"
            ai_response = guard_result["remediation"]
            
    except GeminiServiceError as e:
        api_error = str(e)
        logger.error(
            f"AUDIT LOG | RID: {request_id} | TS: {timestamp} | API_ERROR: {api_error}"
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Downstream LLM Service Error: {api_error}"
        )
        
    finally:
        latency_ms = int((time.perf_counter() - start_time) * 1000)
        metrics.latency_ms = max(latency_ms, 1)
        
        # Final audit logging
        logger.info(
            f"AUDIT LOG | RID: {request_id} | TS: {timestamp} | CLASSIFICATION: {classification} | "
            f"CALL_GEMINI: {gemini_called} | LATENCY: {metrics.latency_ms}ms | "
            f"STATUS: {metrics.status} | ERROR: {api_error or 'None'}"
        )
        
        # Queue background log task
        background_tasks.add_task(
            AuditLogger.save_log_async,
            request_id=request_id,
            prompt=payload.prompt,
            response=ai_response,
            risk_score=metrics.risk_score,
            threat_category=metrics.threat_category,
            threat_type=metrics.threat_type,
            status=metrics.status,
            gemini_called=gemini_called,
            latency_ms=metrics.latency_ms,
            error_message=api_error,
            scan_details=json.dumps(scan_result)
        )
        
    return PromptResponse(
        response=ai_response,
        blocked=metrics.status == "Blocked",
        metrics=metrics
    )
