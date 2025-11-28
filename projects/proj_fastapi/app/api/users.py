"""User management API endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_current_user,
    get_current_superuser,
    get_db,
    get_pagination_params,
    rate_limit_normal,
    require_admin
)
from app.core.observability import get_logger
from app.core.security import input_sanitizer, password_manager, password_validator
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserResponse,
    UserUpdate,
    UserListResponse,
    UserProfileUpdate
)

logger = get_logger("users")
router = APIRouter()


@router.get(
    "/",
    response_model=UserListResponse,
    dependencies=[Depends(require_admin), Depends(rate_limit_normal)]
)
async def get_users(
    pagination: tuple[int, int] = Depends(get_pagination_params),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_superuser: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Get list of users (admin only)."""
    
    try:
        offset, limit = pagination
        
        # Build filters
        filters = {}
        if is_active is not None:
            filters['is_active'] = is_active
        if is_superuser is not None:
            filters['is_superuser'] = is_superuser
        
        # Get users with pagination and search
        users, total = await User.get_multi(
            db,
            offset=offset,
            limit=limit,
            search=search,
            **filters
        )
        
        return UserListResponse(
            users=[UserResponse.model_validate(user) for user in users],
            total=total,
            page=offset // limit + 1,
            size=limit,
            pages=(total + limit - 1) // limit
        )
        
    except Exception as e:
        logger.error(f"Get users error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve users"
        )


@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)]
)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Create new user (admin only)."""
    
    try:
        # Sanitize input
        email = input_sanitizer.sanitize_email(user_data.email)
        username = input_sanitizer.sanitize_username(user_data.username) if user_data.username else None
        
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
        
        # Validate password if provided
        if user_data.password:
            is_valid, errors = password_validator.validate(user_data.password)
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"message": "Password does not meet requirements", "errors": errors}
                )
            hashed_password = password_manager.hash_password(user_data.password)
        else:
            hashed_password = None
        
        # Create user
        create_data = {
            "email": email,
            "username": username or email.split("@")[0],
            "full_name": user_data.full_name,
            "hashed_password": hashed_password,
            "is_active": user_data.is_active,
            "is_superuser": user_data.is_superuser,
            "email_verified": user_data.email_verified,
        }
        
        user = await User.create(db, **create_data)
        
        logger.info(f"User created by admin {current_user.id}: {user.email}")
        
        return UserResponse.model_validate(user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User creation failed"
        )


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    dependencies=[Depends(rate_limit_normal)]
)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user by ID."""
    
    try:
        # Users can only see their own profile unless they're admin
        if user_id != current_user.id and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        user = await User.get(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return UserResponse.model_validate(user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user"
        )


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user."""
    
    try:
        # Get target user
        user = await User.get(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Permission check
        is_self = user_id == current_user.id
        is_admin = current_user.is_superuser
        
        if not is_self and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        
        # Prepare update data
        update_data = {}
        
        # Fields that users can update themselves
        if user_data.full_name is not None:
            update_data['full_name'] = user_data.full_name
        
        if user_data.username is not None:
            # Check username availability
            username = input_sanitizer.sanitize_username(user_data.username)
            existing = await User.get_by_username(db, username)
            if existing and existing.id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )
            update_data['username'] = username
        
        # Admin-only fields
        if is_admin:
            if user_data.email is not None:
                # Check email availability
                email = input_sanitizer.sanitize_email(user_data.email)
                existing = await User.get_by_email(db, email)
                if existing and existing.id != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email already registered"
                    )
                update_data['email'] = email
            
            if user_data.is_active is not None:
                # Prevent admin from deactivating themselves
                if user_id == current_user.id and not user_data.is_active:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot deactivate your own account"
                    )
                update_data['is_active'] = user_data.is_active
            
            if user_data.is_superuser is not None:
                # Prevent admin from removing their own superuser status
                if user_id == current_user.id and not user_data.is_superuser:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot remove your own superuser status"
                    )
                update_data['is_superuser'] = user_data.is_superuser
            
            if user_data.email_verified is not None:
                update_data['email_verified'] = user_data.email_verified
        
        # Password update (users can update their own password)
        if user_data.password is not None:
            if not is_self and not is_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot change other user's password"
                )
            
            is_valid, errors = password_validator.validate(user_data.password)
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"message": "Password does not meet requirements", "errors": errors}
                )
            
            update_data['hashed_password'] = password_manager.hash_password(user_data.password)
        
        # Update user
        if update_data:
            await user.update(db, **update_data)
        
        logger.info(f"User {user_id} updated by user {current_user.id}")
        
        return UserResponse.model_validate(user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User update failed"
        )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Delete user (admin only)."""
    
    try:
        user = await User.get(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent admin from deleting themselves
        if user_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account"
            )
        
        await user.delete(db)
        
        logger.info(f"User {user_id} deleted by admin {current_user.id}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User deletion failed"
        )


@router.put("/me/profile", response_model=UserResponse)
async def update_profile(
    profile_data: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile."""
    
    try:
        update_data = {}
        
        if profile_data.full_name is not None:
            update_data['full_name'] = profile_data.full_name
        
        if profile_data.username is not None:
            username = input_sanitizer.sanitize_username(profile_data.username)
            existing = await User.get_by_username(db, username)
            if existing and existing.id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )
            update_data['username'] = username
        
        if update_data:
            await current_user.update(db, **update_data)
        
        logger.info(f"Profile updated by user {current_user.id}")
        
        return UserResponse.model_validate(current_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Profile update failed"
        )


@router.post("/{user_id}/activate", response_model=UserResponse)
async def activate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Activate user account (admin only)."""
    
    try:
        user = await User.get(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        await user.update(db, is_active=True)
        
        logger.info(f"User {user_id} activated by admin {current_user.id}")
        
        return UserResponse.model_validate(user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"User activation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User activation failed"
        )


@router.post("/{user_id}/deactivate", response_model=UserResponse)
async def deactivate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    """Deactivate user account (admin only)."""
    
    try:
        user = await User.get(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent admin from deactivating themselves
        if user_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate your own account"
            )
        
        await user.update(db, is_active=False)
        
        logger.info(f"User {user_id} deactivated by admin {current_user.id}")
        
        return UserResponse.model_validate(user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"User deactivation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User deactivation failed"
        )