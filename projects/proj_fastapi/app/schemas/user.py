"""User Pydantic schemas for request/response validation."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, HttpUrl, field_validator


class UserBase(BaseModel):
    """Base user schema with common fields."""
    
    email: EmailStr = Field(..., description="User email address")
    username: str = Field(
        ..., 
        min_length=3, 
        max_length=50,
        pattern=r"^[a-zA-Z0-9_-]+$",
        description="Unique username"
    )
    full_name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255,
        description="User's full name"
    )
    is_active: bool = Field(default=True, description="User account status")
    email_verified: bool = Field(default=False, description="Email verification status")


class UserCreate(UserBase):
    """Schema for creating a new user."""
    
    password: Optional[str] = Field(
        None,
        min_length=8,
        max_length=128,
        description="User password (required for non-OAuth users)"
    )
    is_superuser: bool = Field(default=False, description="Superuser privileges")
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: Optional[str]) -> Optional[str]:
        """Validate password if provided."""
        if v is not None and len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "newuser@example.com",
                "username": "newuser123",
                "full_name": "New User",
                "password": "SecurePass123!",
                "is_active": True,
                "is_superuser": False,
                "email_verified": False
            }
        }


class UserUpdate(BaseModel):
    """Schema for updating user information."""
    
    email: Optional[EmailStr] = Field(None, description="User email address")
    username: Optional[str] = Field(
        None,
        min_length=3,
        max_length=50,
        pattern=r"^[a-zA-Z0-9_-]+$",
        description="Username"
    )
    full_name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255,
        description="User's full name"
    )
    password: Optional[str] = Field(
        None,
        min_length=8,
        max_length=128,
        description="New password"
    )
    is_active: Optional[bool] = Field(None, description="User account status")
    is_superuser: Optional[bool] = Field(None, description="Superuser privileges")
    email_verified: Optional[bool] = Field(None, description="Email verification status")
    
    # Profile fields
    bio: Optional[str] = Field(
        None,
        max_length=1000,
        description="User biography"
    )
    location: Optional[str] = Field(
        None,
        max_length=100,
        description="User location"
    )
    website: Optional[HttpUrl] = Field(None, description="User website URL")
    avatar_url: Optional[HttpUrl] = Field(None, description="Avatar image URL")
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: Optional[str]) -> Optional[str]:
        """Validate password if provided."""
        if v is not None and len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "updated@example.com",
                "username": "updated_username",
                "full_name": "Updated Name",
                "bio": "Software developer passionate about Python",
                "location": "San Francisco, CA",
                "website": "https://example.com",
                "is_active": True
            }
        }


class UserProfileUpdate(BaseModel):
    """Schema for updating user profile (non-admin fields only)."""
    
    username: Optional[str] = Field(
        None,
        min_length=3,
        max_length=50,
        pattern=r"^[a-zA-Z0-9_-]+$",
        description="Username"
    )
    full_name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255,
        description="User's full name"
    )
    bio: Optional[str] = Field(
        None,
        max_length=1000,
        description="User biography"
    )
    location: Optional[str] = Field(
        None,
        max_length=100,
        description="User location"
    )
    website: Optional[HttpUrl] = Field(None, description="User website URL")
    
    class Config:
        json_schema_extra = {
            "example": {
                "username": "myusername",
                "full_name": "My Full Name",
                "bio": "Software developer passionate about Python and FastAPI",
                "location": "San Francisco, CA",
                "website": "https://mywebsite.com"
            }
        }


class UserResponse(BaseModel):
    """Schema for user response data."""
    
    id: int = Field(..., description="User ID")
    email: str = Field(..., description="User email address")
    username: str = Field(..., description="Username")
    full_name: Optional[str] = Field(None, description="User's full name")
    is_active: bool = Field(..., description="User account status")
    is_superuser: bool = Field(..., description="Superuser privileges")
    email_verified: bool = Field(..., description="Email verification status")
    
    # OAuth information
    oauth_provider: Optional[str] = Field(None, description="OAuth provider")
    
    # Profile fields
    avatar_url: Optional[str] = Field(None, description="Avatar image URL")
    bio: Optional[str] = Field(None, description="User biography")
    location: Optional[str] = Field(None, description="User location")
    website: Optional[str] = Field(None, description="User website URL")
    
    # Timestamps
    created_at: datetime = Field(..., description="Account creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    last_login_at: Optional[datetime] = Field(None, description="Last login timestamp")
    
    class Config:
        from_attributes = True  # Enable ORM mode for SQLAlchemy models
        json_schema_extra = {
            "example": {
                "id": 1,
                "email": "user@example.com",
                "username": "user123",
                "full_name": "John Doe",
                "is_active": True,
                "is_superuser": False,
                "email_verified": True,
                "oauth_provider": None,
                "avatar_url": "https://example.com/avatar.jpg",
                "bio": "Software developer",
                "location": "San Francisco, CA",
                "website": "https://johndoe.com",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T12:00:00Z",
                "last_login_at": "2024-01-01T11:30:00Z"
            }
        }


class UserListResponse(BaseModel):
    """Schema for paginated user list response."""
    
    users: List[UserResponse] = Field(..., description="List of users")
    total: int = Field(..., description="Total number of users")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    pages: int = Field(..., description="Total number of pages")
    
    class Config:
        json_schema_extra = {
            "example": {
                "users": [
                    {
                        "id": 1,
                        "email": "user1@example.com",
                        "username": "user1",
                        "full_name": "User One",
                        "is_active": True,
                        "is_superuser": False,
                        "email_verified": True,
                        "created_at": "2024-01-01T00:00:00Z",
                        "updated_at": "2024-01-01T12:00:00Z",
                        "last_login_at": "2024-01-01T11:30:00Z"
                    }
                ],
                "total": 50,
                "page": 1,
                "size": 10,
                "pages": 5
            }
        }


class UserStatsResponse(BaseModel):
    """Schema for user statistics response."""
    
    total_users: int = Field(..., description="Total number of users")
    active_users: int = Field(..., description="Number of active users")
    verified_users: int = Field(..., description="Number of verified users")
    superusers: int = Field(..., description="Number of superusers")
    oauth_users: int = Field(..., description="Number of OAuth users")
    recent_signups: int = Field(..., description="Recent signups (last 30 days)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_users": 1000,
                "active_users": 950,
                "verified_users": 800,
                "superusers": 5,
                "oauth_users": 300,
                "recent_signups": 50
            }
        }


class UserSearchResponse(BaseModel):
    """Schema for user search response."""
    
    users: List[UserResponse] = Field(..., description="Search results")
    query: str = Field(..., description="Search query")
    total_results: int = Field(..., description="Total number of results")
    
    class Config:
        json_schema_extra = {
            "example": {
                "users": [
                    {
                        "id": 1,
                        "email": "john@example.com",
                        "username": "johndoe",
                        "full_name": "John Doe",
                        "is_active": True,
                        "is_superuser": False,
                        "email_verified": True,
                        "created_at": "2024-01-01T00:00:00Z",
                        "updated_at": "2024-01-01T12:00:00Z"
                    }
                ],
                "query": "john",
                "total_results": 1
            }
        }


class UserPublicProfile(BaseModel):
    """Schema for public user profile (limited information)."""
    
    id: int = Field(..., description="User ID")
    username: str = Field(..., description="Username")
    full_name: Optional[str] = Field(None, description="User's full name")
    avatar_url: Optional[str] = Field(None, description="Avatar image URL")
    bio: Optional[str] = Field(None, description="User biography")
    location: Optional[str] = Field(None, description="User location")
    website: Optional[str] = Field(None, description="User website URL")
    created_at: datetime = Field(..., description="Account creation timestamp")
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "username": "johndoe",
                "full_name": "John Doe",
                "avatar_url": "https://example.com/avatar.jpg",
                "bio": "Software developer passionate about Python",
                "location": "San Francisco, CA",
                "website": "https://johndoe.com",
                "created_at": "2024-01-01T00:00:00Z"
            }
        }