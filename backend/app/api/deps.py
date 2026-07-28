import logging
import asyncio
from typing import List
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError, ExpiredSignatureError
from app.database import get_db
from app.models.user import User
from app.services.auth_service import AuthService
from app.services.audit_logger import AuditLogger

logger = logging.getLogger("promptshield.deps")

# OAuth2 scheme looking for token in Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

async def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency to validate JWT token and extract the current authenticated User.
    Logs token expirations and invalidations to the Audit Log.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"

    if not token:
        # No token provided
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = AuthService.decode_access_token(token)
        if not payload:
            raise JWTError()
            
        username = payload.get("sub")
        
        # Query user from database
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authenticated user not found.",
            )
            
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is deactivated.",
            )
            
        return user

    except ExpiredSignatureError:
        # Log Expired Token
        await AuditLogger.save_log_async(
            request_id="auth-expired-token",
            prompt=f"[Auth Violation] Expired token access attempt from IP: {client_ip}",
            response="Unauthorized: Access token signature has expired.",
            risk_score=40,
            threat_category="Suspicious",
            threat_type="Expired Token",
            status="Blocked",
            gemini_called=False,
            latency_ms=0,
            error_message="HTTP 401 Token Expired"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        # Log Invalid Token
        await AuditLogger.save_log_async(
            request_id="auth-invalid-token",
            prompt=f"[Auth Violation] Invalid token access attempt from IP: {client_ip}",
            response="Unauthorized: Invalid token signature.",
            risk_score=45,
            threat_category="Suspicious",
            threat_type="Invalid Token",
            status="Blocked",
            gemini_called=False,
            latency_ms=0,
            error_message="HTTP 401 Invalid Token"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

class RoleChecker:
    """
    RBAC Authorization checker. Raises 403 Forbidden if the authenticated user
    does not possess a role matching the allowed criteria.
    """
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    async def __call__(self, request: Request, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            client_ip = request.client.host if request.client else "127.0.0.1"
            
            # Log Unauthorized Access Attempt
            await AuditLogger.save_log_async(
                request_id="auth-rbac-violation",
                prompt=f"[RBAC Violation] User '{current_user.username}' (Role: {current_user.role}) attempted to access protected administrative resource from IP: {client_ip}",
                response="Forbidden: Role-based access denied.",
                risk_score=60,
                threat_category="Suspicious",
                threat_type="Unauthorized Access",
                status="Blocked",
                gemini_called=False,
                latency_ms=0,
                error_message="HTTP 403 Forbidden"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied. You do not have the required administrative role to access this resource."
            )
        return current_user

# Pre-defined RBAC checks
require_admin = RoleChecker(["Admin"])
require_any_user = RoleChecker(["Admin", "User"])
