import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy import select
from app.main import app
from app.database import SessionLocal
from app.models.log import SecurityLog
from app.api.gateway import rate_limiter

@pytest.fixture
def client():
    # Reset rate limit history before running tests to prevent side effects
    rate_limiter.history.clear()
    with TestClient(app) as c:
        yield c

def test_rate_limiter_allows_under_limit(client):
    # Send requests under the configured threshold (e.g. 5 requests)
    for _ in range(5):
        response = client.post(
            "/api/v1/gateway/chat",
            json={"prompt": "Hello, how are you today?"}
        )
        assert response.status_code in [200, 502]  # 502 if gemini key is missing, but indicates bypass of rate limit!

def test_rate_limiter_blocks_above_limit(client):
    # Configure temporary lower limits to trigger rate limit block quickly
    rate_limiter.max_requests = 3
    rate_limiter.window = 5

    # Trigger 3 allowed requests
    for _ in range(3):
        client.post(
            "/api/v1/gateway/chat",
            json={"prompt": "This request is allowed."}
        )

    # 4th request must be blocked
    response = client.post(
        "/api/v1/gateway/chat",
        json={"prompt": "This request should be rate-limited."}
    )
    
    assert response.status_code == 429
    assert "Rate limit exceeded" in response.json()["detail"]

@pytest.mark.asyncio
async def test_rate_limit_violation_logged(client):
    # Reset limit parameters
    rate_limiter.max_requests = 2
    rate_limiter.window = 5
    
    # Exceed limit
    client.post("/api/v1/gateway/chat", json={"prompt": "Rate test 1"})
    client.post("/api/v1/gateway/chat", json={"prompt": "Rate test 2"})
    client.post("/api/v1/gateway/chat", json={"prompt": "Trigger rate limit log"})

    # Wait briefly for background logging
    await asyncio.sleep(0.5)

    # Query db to verify rate limit violation log exists
    async with SessionLocal() as session:
        result = await session.execute(
            select(SecurityLog).where(
                SecurityLog.threat_type == "Rate Limit Exceeded"
            )
        )
        logs = result.scalars().all()
        assert len(logs) > 0
        assert logs[0].status == "Blocked"
        assert logs[0].threat_category == "Suspicious"
        assert logs[0].error_message == "HTTP 429 Too Many Requests"
