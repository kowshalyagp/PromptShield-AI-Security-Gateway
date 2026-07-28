import logging
from typing import List
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UserCreate,
    UserResponse,
    UserRoleUpdate,
    UserStatusUpdate
)
from app.services.auth_service import AuthService
from app.services.audit_logger import AuditLogger
from app.api.deps import get_current_user, require_admin

logger = logging.getLogger("promptshield.api.auth")

router = APIRouter(prefix="/auth", tags=["Authentication & Admin RBAC"])

@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    
    # 1. Fetch user from DB
    result = await db.execute(select(User).where(User.username == payload.username))
    user = result.scalar_one_or_none()
    
    # 2. Verify existence and password hash
    if not user or not AuthService.verify_password(payload.password, user.hashed_password):
        # Await log in error path to ensure persistence before raising
        await AuditLogger.save_log_async(
            request_id="auth-login-failed",
            prompt=f"[Auth Warning] Failed login attempt for username '{payload.username}' from IP: {client_ip}",
            response="Unauthorized: Incorrect credentials.",
            risk_score=35,
            threat_category="Suspicious",
            threat_type="Failed Login",
            status="Blocked",
            gemini_called=False,
            latency_ms=0,
            error_message="HTTP 401 Unauthorized"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        # Await log in deactivated path
        await AuditLogger.save_log_async(
            request_id="auth-login-inactive",
            prompt=f"[Auth Warning] Login attempt for deactivated account '{payload.username}' from IP: {client_ip}",
            response="Unauthorized: Account is deactivated.",
            risk_score=30,
            threat_category="Suspicious",
            threat_type="Deactivated Login",
            status="Blocked",
            gemini_called=False,
            latency_ms=0,
            error_message="HTTP 401 Account Deactivated"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated.",
        )
        
    # 3. Create access token
    access_token = AuthService.create_access_token(
        data={"sub": user.username, "role": user.role}
    )
    
    # Queue successful login log via BackgroundTasks
    background_tasks.add_task(
        AuditLogger.save_log_async,
        request_id="auth-login-success",
        prompt=f"User '{user.username}' (Role: {user.role}) successfully authenticated from IP: {client_ip}",
        response="Authentication successful. JWT access token issued.",
        risk_score=0,
        threat_category="Safe",
        threat_type="Safe",
        status="Allowed",
        gemini_called=False,
        latency_ms=0
    )
    
    return TokenResponse(access_token=access_token, token_type="bearer")

@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    """Returns the authenticated profile of the current active user."""
    return current_user

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    
    # Check if username or email already exists
    username_check = await db.execute(select(User).where(User.username == payload.username))
    if username_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already registered."
        )
        
    email_check = await db.execute(select(User).where(User.email == payload.email))
    if email_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is already registered."
        )
        
    # Create new User
    hashed_pwd = AuthService.hash_password(payload.password)
    new_user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hashed_pwd,
        role=payload.role if payload.role in ["Admin", "User"] else "User",
        is_active=True
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Queue creation audit log via BackgroundTasks
    background_tasks.add_task(
        AuditLogger.save_log_async,
        request_id="auth-user-created",
        prompt=f"Admin '{current_admin.username}' created new user account '{new_user.username}' (Role: {new_user.role}) from IP: {client_ip}",
        response="User creation successful.",
        risk_score=0,
        threat_category="Safe",
        threat_type="Safe",
        status="Allowed",
        gemini_called=False,
        latency_ms=0
    )
    
    return new_user

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves list of all registered users (Admin Only)."""
    result = await db.execute(select(User).order_by(User.id.asc()))
    return result.scalars().all()

@router.put("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    
    # Fetch target user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found."
        )
        
    old_role = user.role
    user.role = payload.role
    await db.commit()
    await db.refresh(user)
    
    # Queue role update audit log via BackgroundTasks
    background_tasks.add_task(
        AuditLogger.save_log_async,
        request_id="auth-role-updated",
        prompt=f"Admin '{current_admin.username}' updated user role of '{user.username}' from '{old_role}' to '{user.role}' from IP: {client_ip}",
        response="Role update successful.",
        risk_score=0,
        threat_category="Safe",
        threat_type="Safe",
        status="Allowed",
        gemini_called=False,
        latency_ms=0
    )
    
    return user

@router.put("/users/{user_id}/disable", response_model=UserResponse)
async def disable_user(
    user_id: int,
    payload: UserStatusUpdate,
    request: Request,
    background_tasks: BackgroundTasks,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    
    # Fetch target user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found."
        )
        
    # Prevent admin from disabling their own account
    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot disable your own admin account."
        )
        
    user.is_active = payload.is_active
    await db.commit()
    await db.refresh(user)
    
    action = "activated" if user.is_active else "deactivated"
    
    # Queue status update audit log via BackgroundTasks
    background_tasks.add_task(
        AuditLogger.save_log_async,
        request_id="auth-status-updated",
        prompt=f"Admin '{current_admin.username}' {action} user account '{user.username}' from IP: {client_ip}",
        response="Status update successful.",
        risk_score=0,
        threat_category="Safe",
        threat_type="Safe",
        status="Allowed",
        gemini_called=False,
        latency_ms=0
    )
    
    return user
