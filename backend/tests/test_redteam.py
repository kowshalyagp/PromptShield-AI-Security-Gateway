import pytest
import json
import asyncio
from sqlalchemy import select
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.redteam import RedTeamReport, RedTeamResult
from app.services.redteam_runner import RedTeamRunner

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture
def admin_token(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "adminpassword123"}
    )
    return response.json()["access_token"]

@pytest.mark.asyncio
async def test_redteam_runner_direct_execution():
    """
    Directly tests the RedTeamRunner execute_suite service with a database session.
    """
    runner = RedTeamRunner()
    async with SessionLocal() as db:
        # Run suite with a category filter to keep the test extremely fast (e.g. Jailbreak Attempts)
        report = await runner.execute_suite(db, category_filter="Jailbreak Attempts")
        
        assert report is not None
        assert report.id is not None
        assert report.total_tests > 0
        assert report.avg_latency_ms >= 0.0
        
        # Verify database details were persisted
        query = select(RedTeamReport).where(RedTeamReport.id == report.id)
        result = await db.execute(query)
        db_report = result.scalar_one()
        assert db_report.total_tests == report.total_tests
        assert db_report.blocked_count >= 0

        # Verify individual results are saved
        query_results = select(RedTeamResult).where(RedTeamResult.report_id == report.id)
        res_result = await db.execute(query_results)
        db_results = res_result.scalars().all()
        assert len(db_results) == report.total_tests


@pytest.mark.asyncio
async def test_redteam_api_execution_and_reports(client, admin_token):
    """
    Tests REST APIs for running suites, viewing, and exporting reports.
    """
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Run single category
    response = client.post(
        "/api/v1/redteam/run",
        json={"category": "Jailbreak Attempts"},
        headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    report_id = data["report_id"]
    assert report_id is not None

    # 2. View reports list
    list_response = client.get("/api/v1/redteam/reports", headers=headers)
    assert list_response.status_code == 200
    reports = list_response.json()
    assert len(reports) > 0
    assert any(r["id"] == report_id for r in reports)

    # 3. View specific report details
    details_response = client.get(f"/api/v1/redteam/reports/{report_id}", headers=headers)
    assert details_response.status_code == 200
    details = details_response.json()
    assert details["id"] == report_id
    assert len(details["results"]) > 0

    # 4. Export report - JSON
    export_json = client.get(f"/api/v1/redteam/reports/{report_id}/export?format=json", headers=headers)
    assert export_json.status_code == 200
    assert export_json.headers["content-type"] == "application/json"
    exported_data = export_json.json()
    assert "report_summary" in exported_data
    assert len(exported_data["results"]) > 0

    # 5. Export report - CSV
    export_csv = client.get(f"/api/v1/redteam/reports/{report_id}/export?format=csv", headers=headers)
    assert export_csv.status_code == 200
    assert "text/csv" in export_csv.headers["content-type"]
    assert "Attack ID,Category,Prompt" in export_csv.text


def test_redteam_api_unauthorized(client):
    """
    Verifies that unauthenticated requests are blocked.
    """
    response = client.post("/api/v1/redteam/run", json={})
    assert response.status_code == 401
