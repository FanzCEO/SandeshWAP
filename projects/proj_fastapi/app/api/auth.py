"""Authentication API endpoints for registration, login, and OAuth."""

from datetime import timedelta
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_current_user,
    get_db,
    rate_limit_strict,
    rate_limit_normal
)
from app.core.auth import (
    create_token_pair,
    jwt_manager,
    oauth,
    session_manager
)
from app.core.config import settings
from app.core.observability import get_logger
from app.core.security import (
    input_sanitizer,
    password_manager,
    password_validator,
    token_generator
)
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    PasswordResetRequest,
    PasswordResetConfirm,
    ChangePasswordRequest
)

logger = get_logger("auth")
router = APIRouter()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit_strict)]
)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user account."""
    
    if not settings.feature_user_registration:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User registration is disabled"
        )
    
    try:
        # Sanitize input
        email = input_sanitizer.sanitize_email(request.email)
        username = input_sanitizer.sanitize_username(request.username) if request.username else None
        
        # Validate password strength
        is_valid, errors = password_validator.validate(request.password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Password does not meet requirements", "errors": errors}
            )
        
        # Check if user already exists
        existing_user = await User.get_by_email(db, email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        if username:
            existing_username = await User.get_by_username(db, username)
            if existing_username:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )
        
        # Create user
        hashed_password = password_manager.hash_password(request.password)
        
        user_data = {
            "email": email,
            "username": username or email.split("@")[0],  # Use email prefix if no username
            "full_name": request.full_name,
            "hashed_password": hashed_password,
            "is_active": True,
            "email_verified": not settings.feature_email_verification,  # Auto-verify if email verification disabled
        }
        
        user = await User.create(db, **user_data)
        
        # Send verification email if enabled
        if settings.feature_email_verification and not user.email_verified:
            # TODO: Implement email verification
            logger.info(f"Email verification required for user {user.id}")
        
        logger.info(f"New user registered: {user.email}")
        
        return UserResponse.model_validate(user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post(
    "/login",
    response_model=LoginResponse,
    dependencies=[Depends(rate_limit_normal)]
)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate user and return access tokens."""
    
    try:
        # Get user by email or username
        user = await User.get_by_email(db, request.email)
        if not user:
            user = await User.get_by_username(db, request.email)  # Allow login with username
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Verify password
        if not password_manager.verify_password(request.password, user.hashed_password):
            logger.warning(f"Failed login attempt for user: {request.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is deactivated"
            )
        
        # Check email verification
        if settings.feature_email_verification and not user.email_verified:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email not verified"
            )
        
        # Update last login
        await user.update(db, last_login_at=user.updated_at)
        
        # Create token pair
        tokens = create_token_pair(
            user.id,
            additional_data={
                "email": user.email,
                "username": user.username,
                "is_superuser": user.is_superuser
            }
        )
        
        # Create session
        session_id = await session_manager.create_session(
            user.id,
            {
                "ip": "unknown",  # Would get from request in production
                "user_agent": "unknown",
                "login_method": "password"
            }
        )
        
        logger.info(f"User logged in: {user.email}")
        
        return LoginResponse(
            user=UserResponse.model_validate(user),
            **tokens,
            session_id=session_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post("/login/form", response_model=LoginResponse)
async def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """OAuth2 compatible login endpoint."""
    
    request = LoginRequest(
        email=form_data.username,
        password=form_data.password
    )
    return await login(request, db)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit_normal)]
)
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token."""
    
    try:
        # Verify refresh token
        payload = jwt_manager.verify_token(request.refresh_token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Check token type
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        # Get user
        user_id = int(payload.get("sub"))
        user = await User.get(db, user_id)
        
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Create new token pair
        tokens = create_token_pair(
            user.id,
            additional_data={
                "email": user.email,
                "username": user.username,
                "is_superuser": user.is_superuser
            }
        )
        
        logger.info(f"Token refreshed for user: {user.email}")
        
        return TokenResponse(**tokens)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token refresh failed"
        )


@router.post("/logout")
async def logout(
    session_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Logout user and invalidate session."""
    
    try:
        # Delete session if provided
        if session_id:
            await session_manager.delete_session(session_id)
        
        # TODO: Add token to blacklist
        # For now, we rely on short token expiry times
        
        logger.info(f"User logged out: {current_user.email}")
        
        return {"message": "Successfully logged out"}
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information."""
    return UserResponse.model_validate(current_user)


@router.post("/password/reset-request")
async def request_password_reset(
    request: PasswordResetRequest,
    db: AsyncSession = Depends(get_db)
):
    """Request password reset email."""
    
    try:
        email = input_sanitizer.sanitize_email(request.email)
        
        # Get user (but don't reveal if email exists for security)
        user = await User.get_by_email(db, email)
        
        if user and user.is_active:
            # Create password reset token
            reset_token = jwt_manager.create_password_reset_token(email)
            
            # TODO: Send password reset email
            logger.info(f"Password reset requested for: {email}")
        
        # Always return success to prevent email enumeration
        return {"message": "If the email exists, a password reset link has been sent"}
        
    except Exception as e:
        logger.error(f"Password reset request error: {e}")
        # Still return success for security
        return {"message": "If the email exists, a password reset link has been sent"}


@router.post("/password/reset-confirm")
async def confirm_password_reset(
    request: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db)
):
    """Confirm password reset with token."""
    
    try:
        # Verify reset token
        email = jwt_manager.verify_password_reset_token(request.token)
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        # Validate new password
        is_valid, errors = password_validator.validate(request.new_password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Password does not meet requirements", "errors": errors}
            )
        
        # Get user
        user = await User.get_by_email(db, email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User not found"
            )
        
        # Update password
        hashed_password = password_manager.hash_password(request.new_password)
        await user.update(db, hashed_password=hashed_password)
        
        logger.info(f"Password reset completed for: {email}")
        
        return {"message": "Password reset successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset confirm error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed"
        )


@router.post("/password/change")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Change user password."""
    
    try:
        # Verify current password
        if not password_manager.verify_password(request.current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Validate new password
        is_valid, errors = password_validator.validate(request.new_password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Password does not meet requirements", "errors": errors}
            )
        
        # Update password
        hashed_password = password_manager.hash_password(request.new_password)
        await current_user.update(db, hashed_password=hashed_password)
        
        logger.info(f"Password changed for user: {current_user.email}")
        
        return {"message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password change error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password change failed"
        )


# OAuth2 endpoints
if settings.feature_oauth_login:
    
    @router.get("/oauth/{provider}")
    async def oauth_login(provider: str, request: Request):
        """Initiate OAuth login."""
        
        if provider not in ["google", "github"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported OAuth provider"
            )
        
        client = oauth.create_client(provider)
        if not client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"OAuth provider {provider} not configured"
            )
        
        # Generate redirect URI
        redirect_uri = request.url_for('oauth_callback', provider=provider)
        return await client.authorize_redirect(request, redirect_uri)
    
    
    @router.get("/oauth/{provider}/callback")
    async def oauth_callback(
        provider: str,
        request: Request,
        db: AsyncSession = Depends(get_db)
    ):
        """Handle OAuth callback."""
        
        try:
            client = oauth.create_client(provider)
            if not client:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"OAuth provider {provider} not configured"
                )
            
            # Get token and user info
            token = await client.authorize_access_token(request)
            user_info = token.get('userinfo') or await client.parse_id_token(request, token)
            
            if not user_info or not user_info.get('email'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to get user information from OAuth provider"
                )
            
            email = user_info.get('email')
            name = user_info.get('name') or user_info.get('login')
            
            # Get or create user
            user = await User.get_by_email(db, email)
            
            if not user:
                # Create new user from OAuth
                user_data = {
                    "email": email,
                    "username": name or email.split("@")[0],
                    "full_name": name,
                    "is_active": True,
                    "email_verified": True,  # OAuth emails are pre-verified
                    "oauth_provider": provider,
                    "oauth_id": str(user_info.get('sub') or user_info.get('id')),
                }
                
                user = await User.create(db, **user_data)
                logger.info(f"New user created via OAuth {provider}: {email}")
            else:
                # Update OAuth info if needed
                if not user.oauth_provider:
                    await user.update(
                        db,
                        oauth_provider=provider,
                        oauth_id=str(user_info.get('sub') or user_info.get('id')),
                        email_verified=True
                    )
            
            # Create tokens
            tokens = create_token_pair(
                user.id,
                additional_data={
                    "email": user.email,
                    "username": user.username,
                    "is_superuser": user.is_superuser,
                    "oauth_provider": provider
                }
            )
            
            logger.info(f"OAuth login successful for {provider}: {email}")
            
            return LoginResponse(
                user=UserResponse.model_validate(user),
                **tokens
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"OAuth callback error for {provider}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="OAuth authentication failed"
            )