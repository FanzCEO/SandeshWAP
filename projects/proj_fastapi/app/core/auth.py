"""JWT Authentication and OAuth2 implementation using Authlib."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union

from authlib.integrations.starlette_client import OAuth
from authlib.jose import JsonWebToken, JWTClaims
from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import settings
from app.core.redis import redis_manager

logger = logging.getLogger(__name__)

# OAuth2 setup
oauth = OAuth()

# Register OAuth providers
if settings.google_client_id and settings.google_client_secret:
    oauth.register(
        name='google',
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        server_metadata_url='https://accounts.google.com/.well-known/openid_configuration',
        client_kwargs={
            'scope': 'openid email profile'
        }
    )

if settings.github_client_id and settings.github_client_secret:
    oauth.register(
        name='github',
        client_id=settings.github_client_id,
        client_secret=settings.github_client_secret,
        access_token_url='https://github.com/login/oauth/access_token',
        authorize_url='https://github.com/login/oauth/authorize',
        api_base_url='https://api.github.com/',
        client_kwargs={'scope': 'user:email'},
    )


class JWTTokenManager:
    """JWT token creation and validation manager."""
    
    def __init__(self) -> None:
        self.jwt_handler = JsonWebToken(['HS256'])
        self.security = HTTPBearer()
    
    def create_access_token(
        self,
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT access token."""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(
                minutes=settings.access_token_expire_minutes
            )
        
        to_encode.update({
            "exp": expire.timestamp(),
            "iat": datetime.now(timezone.utc).timestamp(),
            "type": "access"
        })
        
        return jwt.encode(
            to_encode,
            settings.secret_key,
            algorithm=settings.algorithm
        )
    
    def create_refresh_token(
        self,
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT refresh token."""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(
                days=settings.refresh_token_expire_days
            )
        
        to_encode.update({
            "exp": expire.timestamp(),
            "iat": datetime.now(timezone.utc).timestamp(),
            "type": "refresh"
        })
        
        return jwt.encode(
            to_encode,
            settings.secret_key,
            algorithm=settings.algorithm
        )
    
    def create_password_reset_token(
        self,
        email: str,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create password reset token."""
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(
                hours=settings.password_reset_token_expire_hours
            )
        
        to_encode = {
            "email": email,
            "exp": expire.timestamp(),
            "iat": datetime.now(timezone.utc).timestamp(),
            "type": "password_reset"
        }
        
        return jwt.encode(
            to_encode,
            settings.secret_key,
            algorithm=settings.algorithm
        )
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode JWT token."""
        try:
            payload = jwt.decode(
                token,
                settings.secret_key,
                algorithms=[settings.algorithm]
            )
            
            # Check token expiration
            exp = payload.get("exp")
            if exp is None:
                return None
            
            if datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
                return None
            
            return payload
        except JWTError as e:
            logger.error(f"JWT verification error: {e}")
            return None
    
    def verify_password_reset_token(self, token: str) -> Optional[str]:
        """Verify password reset token and return email."""
        payload = self.verify_token(token)
        if not payload:
            return None
        
        if payload.get("type") != "password_reset":
            return None
        
        return payload.get("email")
    
    async def revoke_token(self, token: str) -> bool:
        """Add token to revocation list (Redis blacklist)."""
        try:
            payload = self.verify_token(token)
            if not payload:
                return False
            
            # Calculate remaining TTL
            exp = payload.get("exp")
            if not exp:
                return False
            
            ttl = int(exp - datetime.now(timezone.utc).timestamp())
            if ttl <= 0:
                return True  # Token already expired
            
            # Add to blacklist
            blacklist_key = f"blacklist:token:{token}"
            return await redis_manager.set(blacklist_key, "revoked", expire=ttl)
            
        except Exception as e:
            logger.error(f"Token revocation error: {e}")
            return False
    
    async def is_token_revoked(self, token: str) -> bool:
        """Check if token is in revocation list."""
        try:
            blacklist_key = f"blacklist:token:{token}"
            return await redis_manager.exists(blacklist_key)
        except Exception as e:
            logger.error(f"Token revocation check error: {e}")
            return False


class AuthenticationError(HTTPException):
    """Custom authentication error."""
    
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class AuthorizationError(HTTPException):
    """Custom authorization error."""
    
    def __init__(self, detail: str = "Not enough permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )


class SessionManager:
    """User session management with Redis."""
    
    def __init__(self):
        self.session_prefix = f"{settings.cache_namespace}:session"
    
    async def create_session(
        self,
        user_id: int,
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create user session."""
        import secrets
        session_id = secrets.token_urlsafe(32)
        session_key = f"{self.session_prefix}:{session_id}"
        
        session_data = {
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            **data
        }
        
        expire_seconds = settings.redis_session_expire
        if expires_delta:
            expire_seconds = int(expires_delta.total_seconds())
        
        success = await redis_manager.set_json(
            session_key,
            session_data,
            expire=expire_seconds
        )
        
        if success:
            return session_id
        raise RuntimeError("Failed to create session")
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data."""
        session_key = f"{self.session_prefix}:{session_id}"
        return await redis_manager.get_json(session_key)
    
    async def update_session(
        self,
        session_id: str,
        data: Dict[str, Any]
    ) -> bool:
        """Update session data."""
        session_key = f"{self.session_prefix}:{session_id}"
        current_data = await redis_manager.get_json(session_key)
        
        if current_data:
            current_data.update(data)
            return await redis_manager.set_json(session_key, current_data)
        return False
    
    async def delete_session(self, session_id: str) -> bool:
        """Delete session."""
        session_key = f"{self.session_prefix}:{session_id}"
        return await redis_manager.delete(session_key)
    
    async def extend_session(
        self,
        session_id: str,
        expires_delta: Optional[timedelta] = None
    ) -> bool:
        """Extend session expiration."""
        session_key = f"{self.session_prefix}:{session_id}"
        expire_seconds = settings.redis_session_expire
        
        if expires_delta:
            expire_seconds = int(expires_delta.total_seconds())
        
        return await redis_manager.expire(session_key, expire_seconds)


# Global instances
jwt_manager = JWTTokenManager()
session_manager = SessionManager()


def get_current_user_id(credentials: HTTPAuthorizationCredentials) -> int:
    """Extract user ID from JWT token."""
    token = credentials.credentials
    payload = jwt_manager.verify_token(token)
    
    if payload is None:
        raise AuthenticationError()
    
    user_id = payload.get("sub")
    if user_id is None:
        raise AuthenticationError()
    
    try:
        return int(user_id)
    except (ValueError, TypeError):
        raise AuthenticationError()


async def verify_token_not_revoked(token: str) -> None:
    """Verify token is not in revocation list."""
    if await jwt_manager.is_token_revoked(token):
        raise AuthenticationError("Token has been revoked")


def create_token_pair(user_id: int, additional_data: Optional[Dict[str, Any]] = None) -> Dict[str, str]:
    """Create access and refresh token pair."""
    data = {"sub": str(user_id)}
    if additional_data:
        data.update(additional_data)
    
    access_token = jwt_manager.create_access_token(data)
    refresh_token = jwt_manager.create_refresh_token({"sub": str(user_id), "type": "refresh"})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.access_token_expire_minutes * 60,
    }