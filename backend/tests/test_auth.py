import pytest
import asyncio
from datetime import timedelta
from fastapi.testclient import TestClient
from sqlalchemy import select
from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.log import SecurityLog
from app.services.auth_service import AuthService

@pytest.fixture
def client():
    # Make sure database is seeded by executing context manager
    with TestClient(app) as c:
        yield c

def test_successful_login(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "adminpassword123"}
    )
    assert response.status_code == 200
    json_data = response.json()
    assert "access_token" in json_data
    assert json_data["token_type"] == "bearer"

def test_login_invalid_password(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert "Incorrect username or password" in response.json()["detail"]

def test_access_profile_valid_token(client):
    # Log in to get token
    login_response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "adminpassword123"}
    )
    token = login_response.json()["access_token"]
    
    # Get profile
    profile_response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert profile_response.status_code == 200
    assert profile_response.json()["username"] == "admin"
    assert profile_response.json()["role"] == "Admin"

def test_access_profile_invalid_token(client):
    profile_response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalidtokenhere"}
    )
    assert profile_response.status_code == 401
    assert "Invalid access token" in profile_response.json()["detail"]

def test_access_profile_expired_token(client):
    # Create expired token
    expired_token = AuthService.create_access_token(
        data={"sub": "admin", "role": "Admin"},
        expires_delta=timedelta(seconds=-10)
    )
    
    profile_response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert profile_response.status_code == 401
    assert "token has expired" in profile_response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_admin_rbac_create_and_deactivate_user(client):
    import uuid
    rand_suffix = str(uuid.uuid4())[:8]
    test_username = f"user_{rand_suffix}"
    test_email = f"user_{rand_suffix}@promptshield.com"

    # Log in as Admin to obtain access token
    login_response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "adminpassword123"}
    )
    admin_token = login_response.json()["access_token"]
    
    # 1. Admin creates a new User
    create_response = client.post(
        "/api/v1/auth/users",
        json={
            "username": test_username,
            "email": test_email,
            "password": "testpassword123",
            "role": "User"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert create_response.status_code == 201
    user_id = create_response.json()["id"]
    
    # 2. Test User Login
    user_login = client.post(
        "/api/v1/auth/login",
        json={"username": test_username, "password": "testpassword123"}
    )
    assert user_login.status_code == 200
    user_token = user_login.json()["access_token"]

    # 3. Test RBAC: Non-admin User attempts to list users (should get 403 Forbidden)
    list_attempt = client.get(
        "/api/v1/auth/users",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert list_attempt.status_code == 403
    assert "Permission denied" in list_attempt.json()["detail"]

    # 4. Admin updates User's role to Admin
    role_update = client.put(
        f"/api/v1/auth/users/{user_id}/role",
        json={"role": "Admin"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert role_update.status_code == 200
    assert role_update.json()["role"] == "Admin"

    # 5. Admin deactivates/disables user account
    deactivate = client.put(
        f"/api/v1/auth/users/{user_id}/disable",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert deactivate.status_code == 200
    assert deactivate.json()["is_active"] is False

    # 6. Deactivated user attempts to login (should get 401 Unauthorized)
    deactivated_login = client.post(
        "/api/v1/auth/login",
        json={"username": test_username, "password": "testpassword123"}
    )
    assert deactivated_login.status_code == 401
    assert "deactivated" in deactivated_login.json()["detail"].lower()
