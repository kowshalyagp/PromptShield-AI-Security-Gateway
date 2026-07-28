import logging
import json
from typing import List, Optional
from datetime import datetime, time as datetime_time
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc
from app.database import get_db
from app.models.log import SecurityLog
from app.api.deps import require_admin

logger = logging.getLogger("promptshield.api.logs")

router = APIRouter(prefix="/logs", tags=["Audit Logs"])

@router.get("")
async def get_logs(
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    threat_type: Optional[str] = None,
    min_risk: Optional[int] = None,
    max_risk: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    sort_by: str = "timestamp",
    sort_order: str = "desc",
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_admin = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves audit logs from the database with advanced searching,
    filtering, sorting, and pagination capabilities.
    """
    try:
        # Start constructing query
        query = select(SecurityLog)
        count_query = select(func.count()).select_from(SecurityLog)
        
        filters = []
        
        # 1. Search term filter (matches prompt, response, request_id, threat_type)
        if search:
            search_pattern = f"%{search}%"
            filters.append(
                or_(
                    SecurityLog.prompt.ilike(search_pattern),
                    SecurityLog.response.ilike(search_pattern),
                    SecurityLog.request_id.ilike(search_pattern),
                    SecurityLog.threat_type.ilike(search_pattern)
                )
            )
            
        # 2. Status filter (Allowed / Blocked)
        if status_filter:
            filters.append(SecurityLog.status == status_filter)
            
        # 3. Threat Type filter
        if threat_type:
            filters.append(SecurityLog.threat_type == threat_type)
            
        # 4. Risk Score range filters
        if min_risk is not None:
            filters.append(SecurityLog.risk_score >= min_risk)
        if max_risk is not None:
            filters.append(SecurityLog.risk_score <= max_risk)
            
        # 5. Date range filters
        if start_date:
            try:
                start_dt = datetime.combine(datetime.strptime(start_date, "%Y-%m-%d").date(), datetime_time.min)
                filters.append(SecurityLog.timestamp >= start_dt)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD.")
                
        if end_date:
            try:
                end_dt = datetime.combine(datetime.strptime(end_date, "%Y-%m-%d").date(), datetime_time.max)
                filters.append(SecurityLog.timestamp <= end_dt)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD.")
                
        # Apply filters to both queries
        if filters:
            query = query.where(and_(*filters))
            count_query = count_query.where(and_(*filters))
            
        # 6. Sorting
        order_column = SecurityLog.timestamp
        if sort_by == "risk_score":
            order_column = SecurityLog.risk_score
        elif sort_by == "latency_ms":
            order_column = SecurityLog.latency_ms
            
        if sort_order == "asc":
            query = query.order_by(asc(order_column))
        else:
            query = query.order_by(desc(order_column))
            
        # 7. Pagination
        query = query.offset(offset).limit(limit)
        
        # Execute queries
        result = await db.execute(query)
        logs = result.scalars().all()
        
        total_result = await db.execute(count_query)
        total_count = total_result.scalar() or 0
        
        # Format response
        formatted_logs = []
        for log in logs:
            parsed_details = None
            if log.scan_details:
                try:
                    parsed_details = json.loads(log.scan_details)
                except Exception:
                    pass
            formatted_logs.append({
                "id": log.id,
                "request_id": log.request_id,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "prompt": log.prompt,
                "response": log.response,
                "risk_score": log.risk_score,
                "threat_category": log.threat_category,
                "threat_type": log.threat_type,
                "status": log.status,
                "gemini_called": log.gemini_called,
                "latency_ms": log.latency_ms,
                "error_message": log.error_message,
                "scan_details": parsed_details
            })
            
        return {
            "total": total_count,
            "logs": formatted_logs,
            "limit": limit,
            "offset": offset
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying logs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving logs from database: {str(e)}"
        )

@router.get("/{log_id}")
async def get_log_by_id(
    log_id: int,
    current_admin = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves details of a specific security log by ID."""
    result = await db.execute(select(SecurityLog).where(SecurityLog.id == log_id))
    log = result.scalar_one_or_none()
    
    if not log:
        raise HTTPException(status_code=404, detail="Log entry not found.")
        
    parsed_details = None
    if log.scan_details:
        try:
            parsed_details = json.loads(log.scan_details)
        except Exception:
            pass
            
    return {
        "id": log.id,
        "request_id": log.request_id,
        "timestamp": log.timestamp.isoformat() if log.timestamp else None,
        "prompt": log.prompt,
        "response": log.response,
        "risk_score": log.risk_score,
        "threat_category": log.threat_category,
        "threat_type": log.threat_type,
        "status": log.status,
        "gemini_called": log.gemini_called,
        "latency_ms": log.latency_ms,
        "error_message": log.error_message,
        "scan_details": parsed_details
    }
