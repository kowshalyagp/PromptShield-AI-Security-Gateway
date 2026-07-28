from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.database import get_db
from app.models.log import SecurityLog
from app.models.user import User
from app.api.deps import require_admin

router = APIRouter(prefix="/dashboard", tags=["Dashboard Analytics"])

@router.get("/stats")
async def get_dashboard_stats(
    current_admin = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves high-level summary KPIs (Admin Only)."""
    # Total Queries
    total_q_res = await db.execute(select(func.count(SecurityLog.id)))
    total_queries = total_q_res.scalar() or 0

    # Blocked
    blocked_q_res = await db.execute(select(func.count(SecurityLog.id)).where(SecurityLog.status == "Blocked"))
    blocked_queries = blocked_q_res.scalar() or 0

    # Allowed
    allowed_queries = total_queries - blocked_queries

    # Gemini API calls
    gemini_res = await db.execute(select(func.count(SecurityLog.id)).where(SecurityLog.gemini_called == True))
    gemini_calls = gemini_res.scalar() or 0

    # Avg Latency
    latency_res = await db.execute(select(func.avg(SecurityLog.latency_ms)))
    avg_latency = latency_res.scalar() or 0.0
    avg_latency = round(float(avg_latency), 1)

    # Today's requests
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_q_res = await db.execute(select(func.count(SecurityLog.id)).where(SecurityLog.timestamp >= today_start))
    todays_requests = today_q_res.scalar() or 0

    # High Risk Requests (score >= 70)
    high_risk_res = await db.execute(select(func.count(SecurityLog.id)).where(SecurityLog.risk_score >= 70))
    high_risk_requests = high_risk_res.scalar() or 0

    # Active Users
    active_users_res = await db.execute(select(func.count(User.id)).where(User.is_active == True))
    active_users = active_users_res.scalar() or 0

    # Default responses if no data exists
    if total_queries == 0:
        total_queries = 1420
        blocked_queries = 98
        allowed_queries = 1322
        gemini_calls = 1205
        avg_latency = 42.0
        todays_requests = 145
        high_risk_requests = 35
        active_users = 1

    return {
        "totalQueries": total_queries,
        "blockedQueries": blocked_queries,
        "allowedQueries": allowed_queries,
        "geminiCalls": gemini_calls,
        "averageLatency": avg_latency,
        "todaysRequests": todays_requests,
        "highRiskRequests": high_risk_requests,
        "activeUsers": active_users
    }

@router.get("/analytics")
async def get_dashboard_analytics(
    current_admin = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves data for dashboard charts (Admin Only)."""
    # Category distribution
    cat_res = await db.execute(
        select(SecurityLog.threat_category, func.count(SecurityLog.id))
        .group_by(SecurityLog.threat_category)
    )
    cat_data = {row[0]: row[1] for row in cat_res.all()}
    
    # Risk Score ranges
    score_ranges = {
        "0-20": 0,
        "21-40": 0,
        "41-60": 0,
        "61-80": 0,
        "81-100": 0
    }
    
    for r_start, r_end, label in [(0, 20, "0-20"), (21, 40, "21-40"), (41, 60, "41-60"), (61, 80, "61-80"), (81, 100, "81-100")]:
        score_res = await db.execute(
            select(func.count(SecurityLog.id))
            .where(and_(SecurityLog.risk_score >= r_start, SecurityLog.risk_score <= r_end))
        )
        score_ranges[label] = score_res.scalar() or 0
        
    # Allowed vs Blocked
    status_res = await db.execute(
        select(SecurityLog.status, func.count(SecurityLog.id))
        .group_by(SecurityLog.status)
    )
    status_data = {row[0]: row[1] for row in status_res.all()}
    
    # Daily Request trend (last 7 days)
    daily_trend = []
    for i in range(6, -1, -1):
        day_date = (datetime.utcnow() - timedelta(days=i)).date()
        day_start = datetime.combine(day_date, datetime.min.time())
        day_end = datetime.combine(day_date, datetime.max.time())
        
        req_res = await db.execute(
            select(func.count(SecurityLog.id))
            .where(and_(SecurityLog.timestamp >= day_start, SecurityLog.timestamp <= day_end))
        )
        req_count = req_res.scalar() or 0
        
        blk_res = await db.execute(
            select(func.count(SecurityLog.id))
            .where(and_(SecurityLog.timestamp >= day_start, SecurityLog.timestamp <= day_end, SecurityLog.status == "Blocked"))
        )
        blk_count = blk_res.scalar() or 0
        
        daily_trend.append({
            "name": day_date.strftime("%b %d"),
            "requests": req_count,
            "blocked": blk_count
        })

    # Gemini Usage
    gemini_yes_res = await db.execute(
        select(func.count(SecurityLog.id)).where(SecurityLog.gemini_called == True)
    )
    gemini_yes = gemini_yes_res.scalar() or 0
    
    gemini_no_res = await db.execute(
        select(func.count(SecurityLog.id)).where(SecurityLog.gemini_called == False)
    )
    gemini_no = gemini_no_res.scalar() or 0
    
    # Top Attack Types
    attack_res = await db.execute(
        select(SecurityLog.threat_type, func.count(SecurityLog.id))
        .where(SecurityLog.threat_type != "Safe")
        .group_by(SecurityLog.threat_type)
        .order_by(func.count(SecurityLog.id).desc())
        .limit(5)
    )
    top_attacks = [{"name": row[0], "value": row[1]} for row in attack_res.all()]
    
    # Fallback default mock data if no db logs exist
    total_logs_res = await db.execute(select(func.count(SecurityLog.id)))
    if (total_logs_res.scalar() or 0) == 0:
        return {
            "threatCategoryDistribution": [
                {"name": "Safe", "value": 1150},
                {"name": "Suspicious", "value": 172},
                {"name": "Malicious", "value": 98}
            ],
            "riskScoreDistribution": [
                {"name": "0-20", "value": 850},
                {"name": "21-40", "value": 300},
                {"name": "41-60", "value": 172},
                {"name": "61-80", "value": 58},
                {"name": "81-100", "value": 40}
            ],
            "allowedVsBlocked": [
                {"name": "Allowed", "value": 1322},
                {"name": "Blocked", "value": 98}
            ],
            "dailyRequestTrend": [
                {"name": "Mon", "requests": 180, "blocked": 12},
                {"name": "Tue", "requests": 220, "blocked": 15},
                {"name": "Wed", "requests": 190, "blocked": 8},
                {"name": "Thu", "requests": 250, "blocked": 20},
                {"name": "Fri", "requests": 310, "blocked": 25},
                {"name": "Sat", "requests": 150, "blocked": 10},
                {"name": "Sun", "requests": 120, "blocked": 8}
            ],
            "geminiUsage": [
                {"name": "LLM Generated", "value": 1322},
                {"name": "Blocked/Direct", "value": 98}
            ],
            "topAttackTypes": [
                {"name": "Prompt Injection", "value": 42},
                {"name": "Jailbreak", "value": 28},
                {"name": "System Leakage", "value": 15},
                {"name": "Harmful Content", "value": 10},
                {"name": "Role Manipulation", "value": 3}
            ]
        }
        
    return {
        "threatCategoryDistribution": [
            {"name": "Safe", "value": cat_data.get("Safe", 0)},
            {"name": "Suspicious", "value": cat_data.get("Suspicious", 0)},
            {"name": "Malicious", "value": cat_data.get("Malicious", 0)}
        ],
        "riskScoreDistribution": [
            {"name": k, "value": v} for k, v in score_ranges.items()
        ],
        "allowedVsBlocked": [
            {"name": "Allowed", "value": status_data.get("Allowed", 0)},
            {"name": "Blocked", "value": status_data.get("Blocked", 0)}
        ],
        "dailyRequestTrend": daily_trend,
        "geminiUsage": [
            {"name": "LLM Generated", "value": gemini_yes},
            {"name": "Blocked/Direct", "value": gemini_no}
        ],
        "topAttackTypes": top_attacks
    }
