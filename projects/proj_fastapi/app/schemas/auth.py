"""Authentication Pydantic schemas for request/response validation."""

from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator

from .user import UserResponse


class LoginRequest(BaseModel):
    """Login request schema."""
    
    email: EmailStr = Field(..., description="User email address or username")
    password: str = Field(..., min_length=1, description="User password")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "securepassword123"
            }
        }


class RegisterRequest(BaseModel):
    """User registration request schema."""
    
    email: EmailStr = Field(..., description="User email address")
    username: Optional[str] = Field(
        None, 
        min_length=3, 
        max_length=50,
        pattern=r"^[a-zA-Z0-9_-]+$",
        description="Unique username (alphanumeric, underscore, hyphen only)"
    )
    password: str = Field(
        ..., 
        min_length=8, 
        max_length=128,
        description="Password (minimum 8 characters)"
    )
    full_name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255,
        description="User's full name"
    )
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Basic password validation."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "newuser@example.com",
                "username": "newuser123",
                "password": "SecurePass123!",
                "full_name": "New User"
            }
        }


class TokenResponse(BaseModel):
    """Token response schema."""
    
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")
    
    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
                "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
                "token_type": "bearer",
                "expires_in": 1800
            }
        }


class LoginResponse(TokenResponse):
    """Login response schema with user information."""
    
    user: UserResponse = Field(..., description="User information")
    session_id: Optional[str] = Field(None, description="Session ID")
    
    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
                "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
                "token_type": "bearer",
                "expires_in": 1800,
                "user": {
                    "id": 1,
                    "email": "user@example.com",
                    "username": "user123",
                    "full_name": "John Doe",
                    "is_active": True,
                    "is_superuser": False,
                    "email_verified": True,
                    "created_at": "2024-01-01T00:00:00Z"
                },
                "session_id": "session_123"
            }
        }


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema."""
    
    refresh_token: str = Field(..., description="JWT refresh token")
    
    class Config:
        json_schema_extra = {
            "example": {
                "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
            }
        }


class PasswordResetRequest(BaseModel):
    """Password reset request schema."""
    
    email: EmailStr = Field(..., description="User email address")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com"
            }
        }


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation schema."""
    
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(
        ..., 
        min_length=8, 
        max_length=128,
        description="New password"
    )
    
    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        """Basic password validation."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "token": "reset_token_here",
                "new_password": "NewSecurePass123!"
            }
        }


class ChangePasswordRequest(BaseModel):
    """Change password request schema."""
    
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(
        ..., 
        min_length=8, 
        max_length=128,
        description="New password"
    )
    
    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        """Basic password validation."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "current_password": "current_password",
                "new_password": "NewSecurePass123!"
            }
        }


class EmailVerificationRequest(BaseModel):
    """Email verification request schema."""
    
    email: EmailStr = Field(..., description="User email address")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com"
            }
        }


class EmailVerificationConfirm(BaseModel):
    """Email verification confirmation schema."""
    
    token: str = Field(..., description="Email verification token")
    
    class Config:
        json_schema_extra = {
            "example": {
                "token": "verification_token_here"
            }
        }


class OAuthLoginRequest(BaseModel):
    """OAuth login request schema."""
    
    provider: str = Field(
        ..., 
        description="OAuth provider (google, github, etc.)",
        regex=r"^(google|github)$"
    )
    redirect_uri: Optional[str] = Field(
        None,
        description="OAuth redirect URI"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "provider": "google",
                "redirect_uri": "http://localhost:3000/auth/callback"
            }
        }


class OAuthCallbackRequest(BaseModel):
    """OAuth callback request schema."""
    
    code: str = Field(..., description="OAuth authorization code")
    state: Optional[str] = Field(None, description="OAuth state parameter")
    
    class Config:
        json_schema_extra = {
            "example": {
                "code": "oauth_authorization_code",
                "state": "random_state_value"
            }
        }


class LogoutRequest(BaseModel):
    """Logout request schema."""
    
    session_id: Optional[str] = Field(None, description="Session ID to invalidate")
    all_sessions: bool = Field(
        default=False, 
        description="Logout from all sessions"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "session_123",
                "all_sessions": False
            }
        }


class AuthStatus(BaseModel):
    """Authentication status response schema."""
    
    authenticated: bool = Field(..., description="Whether user is authenticated")
    user: Optional[UserResponse] = Field(None, description="User information if authenticated")
    session_expires_at: Optional[str] = Field(None, description="Session expiration time")
    
    class Config:
        json_schema_extra = {
            "example": {
                "authenticated": True,
                "user": {
                    "id": 1,
                    "email": "user@example.com",
                    "username": "user123",
                    "full_name": "John Doe",
                    "is_active": True,
                    "is_superuser": False,
                    "email_verified": True,
                    "created_at": "2024-01-01T00:00:00Z"
                },
                "session_expires_at": "2024-01-01T01:00:00Z"
            }
        }