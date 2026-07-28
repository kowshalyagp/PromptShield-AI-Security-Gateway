import logging
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from app.config import settings

logger = logging.getLogger("promptshield.auth_service")

class AuthService:
    """
    Dedicated Service Layer for Administrative Authentication operations.
    Handles secure password hashing, verification, and JWT creation/validation.
    Uses the modern bcrypt library directly to avoid legacy passlib compatibility issues with Python 3.13.
    """

    @staticmethod
    def hash_password(password: str) -> str:
        """Hashes a password using bcrypt."""
        if not password:
            raise ValueError("Password cannot be empty.")
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode('utf-8')

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verifies a plain password against its bcrypt hash."""
        if not plain_password or not hashed_password:
            return False
        try:
            return bcrypt.checkpw(
                plain_password.encode('utf-8'),
                hashed_password.encode('utf-8')
            )
        except Exception as e:
            logger.error(f"Password verification failure: {str(e)}")
            return False

    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Generates a secure JSON Web Token (JWT)."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        try:
            encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
            return encoded_jwt
        except JWTError as e:
            logger.error(f"Failed to generate JWT: {str(e)}")
            raise

    @staticmethod
    def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
        """Decodes and validates a JWT access token."""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            # Check required fields
            if "sub" not in payload or "role" not in payload:
                logger.warning("Decoded token lacks required sub/role claims.")
                return None
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("JWT validation failed: Token has expired.")
            raise
        except JWTError as e:
            logger.warning(f"JWT validation failed: {str(e)}")
            raise
