"""FastAPI dependencies for authentication, database, and other common needs."""

from typing import AsyncGenerator, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthenticationError, jwt_manager, verify_token_not_revoked
from app.core.database import get_database_session
from app.core.redis import get_redis
from app.core.observability import get_logger
from app.models.user import User
from app.schemas.user import UserResponse

logger = get_logger("deps")
security = HTTPBearer()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get database session dependency."""
    async with get_database_session() as session:
        yield session


async def get_redis_client():
    """Get Redis client dependency."""
    return await get_redis()


async def get_current_user_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Get and validate current user token.
    Returns token payload if valid, raises HTTPException if invalid.
    """
    try:
        token = credentials.credentials
        
        # Verify token not revoked
        await verify_token_not_revoked(token)
        
        # Verify and decode token
        payload = jwt_manager.verify_token(token)
        if payload is None:
            raise AuthenticationError("Invalid token")
        
        # Check token type
        if payload.get("type") != "access":
            raise AuthenticationError("Invalid token type")
        
        return payload
        
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token_data: dict = Depends(get_current_user_token)
) -> User:
    """
    Get current user from database based on token.
    Raises HTTPException if user not found or inactive.
    """
    try:
        user_id = int(token_data.get("sub"))
        
        # Get user from database
        user = await User.get(db, user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Inactive user",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Get current user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate user",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current active user.
    This is an alias for get_current_user since we already check for active status.
    """
    return current_user


async def get_current_superuser(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current superuser.
    Raises HTTPException if user is not a superuser.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


async def get_optional_current_user(
    db: AsyncSession = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    )
) -> Optional[User]:
    """
    Get current user if token is provided, None otherwise.
    This is useful for endpoints that work differently for authenticated users.
    """
    if credentials is None:
        return None
    
    try:
        # Validate token
        token_data = await get_current_user_token(credentials)
        
        # Get user
        user_id = int(token_data.get("sub"))
        user = await User.get(db, user_id)
        
        if user and user.is_active:
            return user
        return None
        
    except (HTTPException, ValueError, Exception):
        # If any error occurs, just return None instead of raising
        return None


class RateLimiter:
    """Rate limiting dependency."""
    
    def __init__(self, requests: int = 60, window: int = 60):
        self.requests = requests
        self.window = window
    
    async def __call__(
        self,
        request,
        redis_client = Depends(get_redis_client)
    ):
        """Rate limit based on IP address."""
        from app.core.redis import redis_manager
        
        # Get client IP
        client_ip = request.client.host
        if not client_ip:
            return  # Skip if IP not available
        
        # Check rate limit
        allowed, remaining, reset_time = await redis_manager.rate_limit(
            key="api_requests",
            limit=self.requests,
            window=self.window,
            identifier=client_ip
        )
        
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Try again in {reset_time - int(time.time())} seconds.",
                headers={
                    "X-RateLimit-Limit": str(self.requests),
                    "X-RateLimit-Remaining": str(remaining),
                    "X-RateLimit-Reset": str(reset_time),
                }
            )


class PermissionChecker:
    """Check user permissions."""
    
    def __init__(self, required_permission: str):
        self.required_permission = required_permission
    
    async def __call__(
        self,
        current_user: User = Depends(get_current_user)
    ):
        """Check if user has required permission."""
        # For now, we only have basic role checking
        # In a more complex system, you would check specific permissions
        
        if self.required_permission == "admin" and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin permissions required"
            )
        
        return current_user


# Common rate limiters
rate_limit_strict = RateLimiter(requests=10, window=60)  # 10 requests per minute
rate_limit_normal = RateLimiter(requests=60, window=60)  # 60 requests per minute  
rate_limit_loose = RateLimiter(requests=100, window=60)  # 100 requests per minute

# Common permission checkers
require_admin = PermissionChecker("admin")


async def validate_pagination(
    page: int = 1,
    size: int = 10,
    max_size: int = 100
) -> tuple[int, int]:
    """
    Validate pagination parameters.
    Returns (offset, limit)
    """
    if page < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Page must be >= 1"
        )
    
    if size < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Size must be >= 1"
        )
    
    if size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Size must be <= {max_size}"
        )
    
    offset = (page - 1) * size
    return offset, size


async def get_pagination_params(
    page: int = 1,
    size: int = 10
) -> tuple[int, int]:
    """Get pagination parameters dependency."""
    return await validate_pagination(page, size)


import time