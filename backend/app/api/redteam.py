import csv
import json
import io
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.api.deps import require_admin
from app.models.redteam import RedTeamReport, RedTeamResult
from app.services.redteam_runner import RedTeamRunner
from typing import List, Dict, Any, Optional

router = APIRouter(prefix="/redteam", tags=["Red-Teaming Suite"])

@router.post("/run")
async def run_entire_suite(
    payload: Optional[Dict[str, Any]] = None,
    current_admin = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Executes the entire red teaming test suite or filters by category provided in payload body.
    """
    category_filter = payload.get("category") if payload else None
    runner = RedTeamRunner()
    try:
        report = await runner.execute_suite(db, category_filter=category_filter)
        return {
            "status": "success",
            "message": "Red Team execution completed successfully.",
            "report_id": report.id,
            "total_tests": report.total_tests,
            "detected_count": report.detected_count,
            "blocked_count": report.blocked_count,
            "false_positives": report.false_positives,
            "false_negatives": report.false_negatives,
            "avg_latency_ms": report.avg_latency_ms
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Red Team execution failed: {str(e)}")


@router.post("/run/category/{category}")
async def run_single_category(
    category: str,
    current_admin = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Executes a single attack category from the red teaming dataset.
    """
    runner = RedTeamRunner()
    try:
        report = await runner.execute_suite(db, category_filter=category)
        return {
            "status": "success",
            "message": f"Red Team execution for category '{category}' completed.",
            "report_id": report.id,
            "total_tests": report.total_tests,
            "blocked_count": report.blocked_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports")
async def list_reports(
    current_admin = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns list of all historical Red Team reports.
    """
    query = select(RedTeamReport).order_by(RedTeamReport.timestamp.desc())
    result = await db.execute(query)
    reports = result.scalars().all()
    
    response = []
    for r in reports:
        acc_map = {}
        if r.category_accuracy:
            try:
                acc_map = json.loads(r.category_accuracy)
            except:
                pass
        
        response.append({
            "id": r.id,
            "timestamp": r.timestamp.isoformat(),
            "category": r.category,
            "total_tests": r.total_tests,
            "detected_count": r.detected_count,
            "blocked_count": r.blocked_count,
            "false_positives": r.false_positives,
            "false_negatives": r.false_negatives,
            "avg_latency_ms": r.avg_latency_ms,
            "category_accuracy": acc_map
        })
    return response


@router.get("/reports/{report_id}")
async def get_report_details(
    report_id: int,
    current_admin = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves full details of a specific Red Team report including individual result logs.
    """
    query = select(RedTeamReport).options(selectinload(RedTeamReport.results)).where(RedTeamReport.id == report_id)
    result = await db.execute(query)
    report = result.scalar_one_or_none()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    acc_map = {}
    if report.category_accuracy:
        try:
            acc_map = json.loads(report.category_accuracy)
        except:
            pass

    return {
        "id": report.id,
        "timestamp": report.timestamp.isoformat(),
        "category": report.category,
        "total_tests": report.total_tests,
        "detected_count": report.detected_count,
        "blocked_count": report.blocked_count,
        "false_positives": report.false_positives,
        "false_negatives": report.false_negatives,
        "avg_latency_ms": report.avg_latency_ms,
        "category_accuracy": acc_map,
        "results": [
            {
                "id": res.id,
                "attack_id": res.attack_id,
                "category": res.category,
                "prompt": res.prompt,
                "risk_score": res.risk_score,
                "threat_classification": res.threat_classification,
                "decision": res.decision,
                "gemini_called": res.gemini_called,
                "latency_ms": res.latency_ms,
                "detection_reason": res.detection_reason,
                "status": res.status
            }
            for res in report.results
        ]
    }


@router.get("/reports/{report_id}/export")
async def export_report(
    report_id: int,
    format: str = Query("json", regex="^(json|csv)$"),
    current_admin = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Exports a specific report in JSON or CSV format.
    """
    query = select(RedTeamReport).options(selectinload(RedTeamReport.results)).where(RedTeamReport.id == report_id)
    result = await db.execute(query)
    report = result.scalar_one_or_none()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if format == "json":
        # Export as JSON file download
        acc_map = {}
        if report.category_accuracy:
            try:
                acc_map = json.loads(report.category_accuracy)
            except:
                pass
        
        data = {
            "report_summary": {
                "id": report.id,
                "timestamp": report.timestamp.isoformat(),
                "category": report.category,
                "total_tests": report.total_tests,
                "detected_count": report.detected_count,
                "blocked_count": report.blocked_count,
                "false_positives": report.false_positives,
                "false_negatives": report.false_negatives,
                "avg_latency_ms": report.avg_latency_ms,
                "category_accuracy": acc_map
            },
            "results": [
                {
                    "attack_id": res.attack_id,
                    "category": res.category,
                    "prompt": res.prompt,
                    "risk_score": res.risk_score,
                    "threat_classification": res.threat_classification,
                    "decision": res.decision,
                    "gemini_called": res.gemini_called,
                    "latency_ms": res.latency_ms,
                    "detection_reason": res.detection_reason,
                    "status": res.status
                }
                for res in report.results
            ]
        }
        
        stream = io.BytesIO(json.dumps(data, indent=2).encode("utf-8"))
        return StreamingResponse(
            stream, 
            media_type="application/json", 
            headers={"Content-Disposition": f"attachment; filename=redteam_report_{report_id}.json"}
        )
    
    else:
        # Export as CSV file download
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write CSV headers
        writer.writerow([
            "Attack ID", "Category", "Prompt", "Risk Score", 
            "Threat Classification", "Decision", "Gemini Called", 
            "Latency (ms)", "Detection Reason", "Test Status"
        ])
        
        # Write rows
        for res in report.results:
            writer.writerow([
                res.attack_id, res.category, res.prompt, res.risk_score,
                res.threat_classification, res.decision, res.gemini_called,
                res.latency_ms, res.detection_reason, res.status
            ])
            
        stream = io.BytesIO(output.getvalue().encode("utf-8"))
        return StreamingResponse(
            stream, 
            media_type="text/csv", 
            headers={"Content-Disposition": f"attachment; filename=redteam_report_{report_id}.csv"}
        )
