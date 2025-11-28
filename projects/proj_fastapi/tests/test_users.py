"""User management API tests."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from tests.conftest import auth_headers


class TestGetUsers:
    """Test GET /users endpoints."""
    
    async def test_get_users_as_admin(
        self,
        client: AsyncClient,
        superuser_token: str,
        multiple_users: list[User]
    ):
        """Test getting user list as admin."""
        headers = auth_headers(superuser_token)
        response = await client.get("/api/v1/users/", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "users" in data
        assert "total" in data
        assert "page" in data
        assert "size" in data
        assert "pages" in data
        assert data["total"] >= len(multiple_users)
        assert len(data["users"]) <= data["size"]
    
    async def test_get_users_with_pagination(
        self,
        client: AsyncClient,
        superuser_token: str,
        multiple_users: list[User]
    ):
        """Test user list pagination."""
        headers = auth_headers(superuser_token)
        
        # First page
        response1 = await client.get("/api/v1/users/?page=1&size=5", headers=headers)
        assert response1.status_code == 200
        
        data1 = response1.json()
        assert data1["page"] == 1
        assert data1["size"] == 5
        assert len(data1["users"]) <= 5
        
        # Second page
        response2 = await client.get("/api/v1/users/?page=2&size=5", headers=headers)
        assert response2.status_code == 200
        
        data2 = response2.json()
        assert data2["page"] == 2
        
        # Users should be different between pages
        page1_ids = {user["id"] for user in data1["users"]}
        page2_ids = {user["id"] for user in data2["users"]}
        assert page1_ids.isdisjoint(page2_ids)
    
    async def test_get_users_with_search(
        self,
        client: AsyncClient,
        superuser_token: str,
        test_user: User
    ):
        """Test user search functionality."""
        headers = auth_headers(superuser_token)
        response = await client.get(f"/api/v1/users/?search={test_user.username}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should find the user
        user_ids = [user["id"] for user in data["users"]]
        assert test_user.id in user_ids
    
    async def test_get_users_with_filters(
        self,
        client: AsyncClient,
        superuser_token: str,
        inactive_user: User
    ):
        """Test user list filtering."""
        headers = auth_headers(superuser_token)
        
        # Filter by active status
        response = await client.get("/api/v1/users/?is_active=false", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        inactive_user_ids = [user["id"] for user in data["users"]]
        assert inactive_user.id in inactive_user_ids
        
        # All returned users should be inactive
        for user in data["users"]:
            assert user["is_active"] is False
    
    async def test_get_users_as_regular_user(
        self,
        client: AsyncClient,
        user_token: str
    ):
        """Test that regular users cannot access user list."""
        headers = auth_headers(user_token)
        response = await client.get("/api/v1/users/", headers=headers)
        
        assert response.status_code == 403
    
    async def test_get_users_without_auth(
        self,
        client: AsyncClient
    ):
        """Test that unauthenticated users cannot access user list."""
        response = await client.get("/api/v1/users/")
        
        assert response.status_code == 403


class TestGetUser:
    """Test GET /users/{id} endpoint."""
    
    async def test_get_own_user(
        self,
        client: AsyncClient,
        test_user: User,
        user_token: str
    ):
        """Test getting own user profile."""
        headers = auth_headers(user_token)
        response = await client.get(f"/api/v1/users/{test_user.id}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == test_user.id
        assert data["email"] == test_user.email
        assert data["username"] == test_user.username
        assert data["full_name"] == test_user.full_name
    
    async def test_get_other_user_as_admin(
        self,
        client: AsyncClient,
        test_user: User,
        superuser_token: str
    ):
        """Test admin getting another user's profile."""
        headers = auth_headers(superuser_token)
        response = await client.get(f"/api/v1/users/{test_user.id}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_user.id
    
    async def test_get_other_user_as_regular_user(
        self,
        client: AsyncClient,
        test_superuser: User,
        user_token: str
    ):
        """Test regular user trying to get another user's profile."""
        headers = auth_headers(user_token)
        response = await client.get(f"/api/v1/users/{test_superuser.id}", headers=headers)
        
        assert response.status_code == 403
    
    async def test_get_nonexistent_user(
        self,
        client: AsyncClient,
        superuser_token: str
    ):
        """Test getting non-existent user."""
        headers = auth_headers(superuser_token)
        response = await client.get("/api/v1/users/99999", headers=headers)
        
        assert response.status_code == 404


class TestCreateUser:
    """Test POST /users endpoint."""
    
    async def test_create_user_as_admin(
        self,
        client: AsyncClient,
        superuser_token: str
    ):
        """Test creating user as admin."""
        user_data = {
            "email": "newadminuser@example.com",
            "username": "newadminuser",
            "full_name": "New Admin User",
            "password": "AdminPassword123!",
            "is_active": True,
            "is_superuser": False,
            "email_verified": True
        }
        
        headers = auth_headers(superuser_token)
        response = await client.post("/api/v1/users/", json=user_data, headers=headers)
        
        assert response.status_code == 201
        data = response.json()
        
        assert data["email"] == user_data["email"]
        assert data["username"] == user_data["username"]
        assert data["full_name"] == user_data["full_name"]
        assert data["is_active"] == user_data["is_active"]
        assert data["is_superuser"] == user_data["is_superuser"]
        assert "password" not in data
        assert "hashed_password" not in data
    
    async def test_create_user_duplicate_email(
        self,
        client: AsyncClient,
        test_user: User,
        superuser_token: str
    ):
        """Test creating user with duplicate email."""
        user_data = {
            "email": test_user.email,
            "username": "different_username",
            "password": "Password123!"
        }
        
        headers = auth_headers(superuser_token)
        response = await client.post("/api/v1/users/", json=user_data, headers=headers)
        
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]
    
    async def test_create_user_as_regular_user(
        self,
        client: AsyncClient,
        user_token: str
    ):
        """Test that regular users cannot create users."""
        user_data = {
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "Password123!"
        }
        
        headers = auth_headers(user_token)
        response = await client.post("/api/v1/users/", json=user_data, headers=headers)
        
        assert response.status_code == 403


class TestUpdateUser:
    """Test PUT /users/{id} endpoint."""
    
    async def test_update_own_profile(
        self,
        client: AsyncClient,
        test_user: User,
        user_token: str
    ):
        """Test user updating their own profile."""
        update_data = {
            "full_name": "Updated Full Name",
            "username": "updated_username"
        }
        
        headers = auth_headers(user_token)
        response = await client.put(f"/api/v1/users/{test_user.id}", json=update_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["full_name"] == update_data["full_name"]
        assert data["username"] == update_data["username"]
        assert data["email"] == test_user.email  # Email unchanged
    
    async def test_update_user_as_admin(
        self,
        client: AsyncClient,
        test_user: User,
        superuser_token: str
    ):
        """Test admin updating any user."""
        update_data = {
            "email": "updated@example.com",
            "is_active": False,
            "is_superuser": True
        }
        
        headers = auth_headers(superuser_token)
        response = await client.put(f"/api/v1/users/{test_user.id}", json=update_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["email"] == update_data["email"]
        assert data["is_active"] == update_data["is_active"]
        assert data["is_superuser"] == update_data["is_superuser"]
    
    async def test_user_cannot_change_admin_fields(
        self,
        client: AsyncClient,
        test_user: User,
        user_token: str
    ):
        """Test that regular users cannot change admin-only fields."""
        update_data = {
            "is_superuser": True,
            "is_active": False,
            "email": "hacked@example.com"
        }
        
        headers = auth_headers(user_token)
        response = await client.put(f"/api/v1/users/{test_user.id}", json=update_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Admin fields should not be changed
        assert data["is_superuser"] == test_user.is_superuser
        assert data["is_active"] == test_user.is_active
        assert data["email"] == test_user.email
    
    async def test_admin_cannot_deactivate_self(
        self,
        client: AsyncClient,
        test_superuser: User,
        superuser_token: str
    ):
        """Test that admin cannot deactivate their own account."""
        update_data = {"is_active": False}
        
        headers = auth_headers(superuser_token)
        response = await client.put(f"/api/v1/users/{test_superuser.id}", json=update_data, headers=headers)
        
        assert response.status_code == 400
        assert "Cannot deactivate" in response.json()["detail"]
    
    async def test_admin_cannot_remove_own_superuser_status(
        self,
        client: AsyncClient,
        test_superuser: User,
        superuser_token: str
    ):
        """Test that admin cannot remove their own superuser status."""
        update_data = {"is_superuser": False}
        
        headers = auth_headers(superuser_token)
        response = await client.put(f"/api/v1/users/{test_superuser.id}", json=update_data, headers=headers)
        
        assert response.status_code == 400
        assert "Cannot remove" in response.json()["detail"]
    
    async def test_update_other_user_as_regular_user(
        self,
        client: AsyncClient,
        test_superuser: User,
        user_token: str
    ):
        """Test regular user trying to update another user."""
        update_data = {"full_name": "Hacked Name"}
        
        headers = auth_headers(user_token)
        response = await client.put(f"/api/v1/users/{test_superuser.id}", json=update_data, headers=headers)
        
        assert response.status_code == 403


class TestDeleteUser:
    """Test DELETE /users/{id} endpoint."""
    
    async def test_delete_user_as_admin(
        self,
        client: AsyncClient,
        test_user: User,
        superuser_token: str
    ):
        """Test admin deleting a user."""
        headers = auth_headers(superuser_token)
        response = await client.delete(f"/api/v1/users/{test_user.id}", headers=headers)
        
        assert response.status_code == 204
        
        # Verify user is deleted
        get_response = await client.get(f"/api/v1/users/{test_user.id}", headers=headers)
        assert get_response.status_code == 404
    
    async def test_admin_cannot_delete_self(
        self,
        client: AsyncClient,
        test_superuser: User,
        superuser_token: str
    ):
        """Test that admin cannot delete their own account."""
        headers = auth_headers(superuser_token)
        response = await client.delete(f"/api/v1/users/{test_superuser.id}", headers=headers)
        
        assert response.status_code == 400
        assert "Cannot delete" in response.json()["detail"]
    
    async def test_delete_user_as_regular_user(
        self,
        client: AsyncClient,
        test_user: User,
        user_token: str
    ):
        """Test that regular users cannot delete users."""
        headers = auth_headers(user_token)
        response = await client.delete(f"/api/v1/users/{test_user.id}", headers=headers)
        
        assert response.status_code == 403


class TestUserProfileUpdate:
    """Test PUT /users/me/profile endpoint."""
    
    async def test_update_own_profile(
        self,
        client: AsyncClient,
        test_user: User,
        user_token: str
    ):
        """Test user updating their own profile."""
        profile_data = {
            "full_name": "Updated Name",
            "username": "updated_user"
        }
        
        headers = auth_headers(user_token)
        response = await client.put("/api/v1/users/me/profile", json=profile_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["full_name"] == profile_data["full_name"]
        assert data["username"] == profile_data["username"]
    
    async def test_update_profile_duplicate_username(
        self,
        client: AsyncClient,
        test_user: User,
        test_superuser: User,
        user_token: str
    ):
        """Test updating profile with existing username."""
        profile_data = {"username": test_superuser.username}
        
        headers = auth_headers(user_token)
        response = await client.put("/api/v1/users/me/profile", json=profile_data, headers=headers)
        
        assert response.status_code == 400
        assert "already taken" in response.json()["detail"]


class TestUserActivation:
    """Test user activation endpoints."""
    
    async def test_activate_user(
        self,
        client: AsyncClient,
        inactive_user: User,
        superuser_token: str
    ):
        """Test activating an inactive user."""
        headers = auth_headers(superuser_token)
        response = await client.post(f"/api/v1/users/{inactive_user.id}/activate", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_active"] is True
    
    async def test_deactivate_user(
        self,
        client: AsyncClient,
        test_user: User,
        superuser_token: str
    ):
        """Test deactivating an active user."""
        headers = auth_headers(superuser_token)
        response = await client.post(f"/api/v1/users/{test_user.id}/deactivate", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_active"] is False
    
    async def test_admin_cannot_deactivate_self(
        self,
        client: AsyncClient,
        test_superuser: User,
        superuser_token: str
    ):
        """Test that admin cannot deactivate themselves."""
        headers = auth_headers(superuser_token)
        response = await client.post(f"/api/v1/users/{test_superuser.id}/deactivate", headers=headers)
        
        assert response.status_code == 400
        assert "Cannot deactivate" in response.json()["detail"]


@pytest.mark.integration
class TestUserCRUDFlow:
    """Integration tests for complete user CRUD operations."""
    
    async def test_complete_user_lifecycle(
        self,
        client: AsyncClient,
        superuser_token: str
    ):
        """Test complete user create-read-update-delete flow."""
        headers = auth_headers(superuser_token)
        
        # 1. Create user
        create_data = {
            "email": "lifecycle@example.com",
            "username": "lifecycle_user",
            "full_name": "Lifecycle User",
            "password": "LifecyclePass123!",
            "is_active": True
        }
        
        create_response = await client.post("/api/v1/users/", json=create_data, headers=headers)
        assert create_response.status_code == 201
        user_data = create_response.json()
        user_id = user_data["id"]
        
        # 2. Read user
        get_response = await client.get(f"/api/v1/users/{user_id}", headers=headers)
        assert get_response.status_code == 200
        assert get_response.json()["email"] == create_data["email"]
        
        # 3. Update user
        update_data = {
            "full_name": "Updated Lifecycle User",
            "is_superuser": True
        }
        
        update_response = await client.put(f"/api/v1/users/{user_id}", json=update_data, headers=headers)
        assert update_response.status_code == 200
        
        updated_data = update_response.json()
        assert updated_data["full_name"] == update_data["full_name"]
        assert updated_data["is_superuser"] is True
        
        # 4. Deactivate user
        deactivate_response = await client.post(f"/api/v1/users/{user_id}/deactivate", headers=headers)
        assert deactivate_response.status_code == 200
        assert deactivate_response.json()["is_active"] is False
        
        # 5. Reactivate user
        activate_response = await client.post(f"/api/v1/users/{user_id}/activate", headers=headers)
        assert activate_response.status_code == 200
        assert activate_response.json()["is_active"] is True
        
        # 6. Delete user
        delete_response = await client.delete(f"/api/v1/users/{user_id}", headers=headers)
        assert delete_response.status_code == 204
        
        # 7. Verify user is deleted
        final_get_response = await client.get(f"/api/v1/users/{user_id}", headers=headers)
        assert final_get_response.status_code == 404