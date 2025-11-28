"""User SQLAlchemy model with comprehensive CRUD operations."""

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.observability import db_metrics


class User(Base):
    """User model with authentication and profile information."""
    
    __tablename__ = "users"
    
    # Primary key
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # Authentication fields
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Nullable for OAuth users
    
    # Profile fields
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Status fields
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # OAuth fields
    oauth_provider: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # google, github, etc.
    oauth_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Metadata fields
    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    def __repr__(self) -> str:
        """String representation of User."""
        return f"<User(id={self.id}, email='{self.email}', username='{self.username}')>"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert user to dictionary."""
        return {
            "id": self.id,
            "email": self.email,
            "username": self.username,
            "full_name": self.full_name,
            "is_active": self.is_active,
            "is_superuser": self.is_superuser,
            "email_verified": self.email_verified,
            "oauth_provider": self.oauth_provider,
            "avatar_url": self.avatar_url,
            "bio": self.bio,
            "location": self.location,
            "website": self.website,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_login_at": self.last_login_at.isoformat() if self.last_login_at else None,
        }
    
    # CRUD Operations
    
    @classmethod
    async def create(cls, db: AsyncSession, **kwargs) -> "User":
        """Create a new user."""
        try:
            user = cls(**kwargs)
            db.add(user)
            await db.commit()
            await db.refresh(user)
            
            db_metrics.record_operation("CREATE", "users", True)
            return user
            
        except Exception as e:
            await db.rollback()
            db_metrics.record_operation("CREATE", "users", False)
            raise e
    
    @classmethod
    async def get(cls, db: AsyncSession, user_id: int) -> Optional["User"]:
        """Get user by ID."""
        try:
            result = await db.execute(select(cls).where(cls.id == user_id))
            user = result.scalar_one_or_none()
            
            db_metrics.record_operation("SELECT", "users", True)
            return user
            
        except Exception as e:
            db_metrics.record_operation("SELECT", "users", False)
            raise e
    
    @classmethod
    async def get_by_email(cls, db: AsyncSession, email: str) -> Optional["User"]:
        """Get user by email address."""
        try:
            result = await db.execute(select(cls).where(cls.email == email))
            user = result.scalar_one_or_none()
            
            db_metrics.record_operation("SELECT", "users", True)
            return user
            
        except Exception as e:
            db_metrics.record_operation("SELECT", "users", False)
            raise e
    
    @classmethod
    async def get_by_username(cls, db: AsyncSession, username: str) -> Optional["User"]:
        """Get user by username."""
        try:
            result = await db.execute(select(cls).where(cls.username == username))
            user = result.scalar_one_or_none()
            
            db_metrics.record_operation("SELECT", "users", True)
            return user
            
        except Exception as e:
            db_metrics.record_operation("SELECT", "users", False)
            raise e
    
    @classmethod
    async def get_by_oauth(
        cls, 
        db: AsyncSession, 
        provider: str, 
        oauth_id: str
    ) -> Optional["User"]:
        """Get user by OAuth provider and ID."""
        try:
            result = await db.execute(
                select(cls).where(
                    cls.oauth_provider == provider,
                    cls.oauth_id == oauth_id
                )
            )
            user = result.scalar_one_or_none()
            
            db_metrics.record_operation("SELECT", "users", True)
            return user
            
        except Exception as e:
            db_metrics.record_operation("SELECT", "users", False)
            raise e
    
    @classmethod
    async def get_multi(
        cls,
        db: AsyncSession,
        *,
        offset: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        **filters
    ) -> Tuple[List["User"], int]:
        """Get multiple users with pagination and filtering."""
        try:
            # Build base query
            query = select(cls)
            count_query = select(func.count(cls.id))
            
            # Apply search filter
            if search:
                search_filter = cls.email.ilike(f"%{search}%") | cls.username.ilike(f"%{search}%")
                if "full_name" in search:
                    search_filter |= cls.full_name.ilike(f"%{search}%")
                
                query = query.where(search_filter)
                count_query = count_query.where(search_filter)
            
            # Apply additional filters
            for key, value in filters.items():
                if hasattr(cls, key) and value is not None:
                    attr = getattr(cls, key)
                    query = query.where(attr == value)
                    count_query = count_query.where(attr == value)
            
            # Get total count
            count_result = await db.execute(count_query)
            total = count_result.scalar()
            
            # Apply pagination and ordering
            query = query.order_by(cls.created_at.desc()).offset(offset).limit(limit)
            
            # Execute query
            result = await db.execute(query)
            users = result.scalars().all()
            
            db_metrics.record_operation("SELECT", "users", True)
            return list(users), total
            
        except Exception as e:
            db_metrics.record_operation("SELECT", "users", False)
            raise e
    
    async def update(self, db: AsyncSession, **kwargs) -> "User":
        """Update user with provided data."""
        try:
            for key, value in kwargs.items():
                if hasattr(self, key):
                    setattr(self, key, value)
            
            await db.commit()
            await db.refresh(self)
            
            db_metrics.record_operation("UPDATE", "users", True)
            return self
            
        except Exception as e:
            await db.rollback()
            db_metrics.record_operation("UPDATE", "users", False)
            raise e
    
    async def delete(self, db: AsyncSession) -> bool:
        """Delete user."""
        try:
            await db.delete(self)
            await db.commit()
            
            db_metrics.record_operation("DELETE", "users", True)
            return True
            
        except Exception as e:
            await db.rollback()
            db_metrics.record_operation("DELETE", "users", False)
            raise e
    
    async def soft_delete(self, db: AsyncSession) -> "User":
        """Soft delete user by setting is_active to False."""
        return await self.update(db, is_active=False)
    
    @classmethod
    async def get_active_users_count(cls, db: AsyncSession) -> int:
        """Get count of active users."""
        try:
            result = await db.execute(
                select(func.count(cls.id)).where(cls.is_active == True)
            )
            count = result.scalar()
            
            db_metrics.record_operation("SELECT", "users", True)
            return count or 0
            
        except Exception as e:
            db_metrics.record_operation("SELECT", "users", False)
            raise e
    
    @classmethod
    async def get_superusers(cls, db: AsyncSession) -> List["User"]:
        """Get all superusers."""
        try:
            result = await db.execute(
                select(cls).where(
                    cls.is_superuser == True,
                    cls.is_active == True
                )
            )
            users = result.scalars().all()
            
            db_metrics.record_operation("SELECT", "users", True)
            return list(users)
            
        except Exception as e:
            db_metrics.record_operation("SELECT", "users", False)
            raise e
    
    @classmethod
    async def search_users(
        cls,
        db: AsyncSession,
        query: str,
        limit: int = 10
    ) -> List["User"]:
        """Search users by email, username, or full name."""
        try:
            search_filter = (
                cls.email.ilike(f"%{query}%") |
                cls.username.ilike(f"%{query}%") |
                cls.full_name.ilike(f"%{query}%")
            )
            
            result = await db.execute(
                select(cls)
                .where(search_filter, cls.is_active == True)
                .order_by(cls.username)
                .limit(limit)
            )
            users = result.scalars().all()
            
            db_metrics.record_operation("SELECT", "users", True)
            return list(users)
            
        except Exception as e:
            db_metrics.record_operation("SELECT", "users", False)
            raise e
    
    # Helper properties
    
    @property
    def display_name(self) -> str:
        """Get display name for user."""
        return self.full_name or self.username or self.email
    
    @property
    def is_oauth_user(self) -> bool:
        """Check if user is OAuth user."""
        return bool(self.oauth_provider and self.oauth_id)
    
    @property
    def has_password(self) -> bool:
        """Check if user has a password set."""
        return bool(self.hashed_password)
    
    def can_login(self) -> bool:
        """Check if user can login."""
        return self.is_active and (self.has_password or self.is_oauth_user)
    
    def needs_email_verification(self) -> bool:
        """Check if user needs email verification."""
        return not self.email_verified and not self.is_oauth_user