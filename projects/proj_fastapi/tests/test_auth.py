"""Authentication API tests."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import jwt_manager
from app.models.user import User
from tests.conftest import auth_headers


class TestUserRegistration:
    """Test user registration endpoints."""
    
    async def test_register_valid_user(
        self,
        client: AsyncClient,
        valid_user_data: dict
    ):
        """Test successful user registration."""
        response = await client.post("/api/v1/auth/register", json=valid_user_data)
        
        assert response.status_code == 201
        data = response.json()
        
        assert data["email"] == valid_user_data["email"]
        assert data["username"] == valid_user_data["username"] 
        assert data["full_name"] == valid_user_data["full_name"]
        assert data["is_active"] is True
        assert data["is_superuser"] is False
        assert "hashed_password" not in data  # Password should not be returned
        assert "id" in data
        assert "created_at" in data
    
    async def test_register_duplicate_email(
        self,
        client: AsyncClient,
        test_user: User,
        valid_user_data: dict
    ):
        """Test registration with existing email."""
        valid_user_data["email"] = test_user.email
        
        response = await client.post("/api/v1/auth/register", json=valid_user_data)
        
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]
    
    async def test_register_duplicate_username(
        self,
        client: AsyncClient,
        test_user: User,
        valid_user_data: dict
    ):
        """Test registration with existing username."""
        valid_user_data["username"] = test_user.username
        
        response = await client.post("/api/v1/auth/register", json=valid_user_data)
        
        assert response.status_code == 400
        assert "already taken" in response.json()["detail"]
    
    async def test_register_weak_password(
        self,
        client: AsyncClient,
        valid_user_data: dict
    ):
        """Test registration with weak password."""
        valid_user_data["password"] = "123"  # Too short
        
        response = await client.post("/api/v1/auth/register", json=valid_user_data)
        
        assert response.status_code == 400
        assert "does not meet requirements" in response.json()["detail"]["message"]
    
    async def test_register_invalid_email(
        self,
        client: AsyncClient,
        valid_user_data: dict
    ):
        """Test registration with invalid email format."""
        valid_user_data["email"] = "invalid-email"
        
        response = await client.post("/api/v1/auth/register", json=valid_user_data)
        
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.parametrize("missing_field", ["email", "password"])
    async def test_register_missing_required_fields(
        self,
        client: AsyncClient,
        valid_user_data: dict,
        missing_field: str
    ):
        """Test registration with missing required fields."""
        del valid_user_data[missing_field]
        
        response = await client.post("/api/v1/auth/register", json=valid_user_data)
        
        assert response.status_code == 422


class TestUserLogin:
    """Test user login endpoints."""
    
    async def test_login_valid_credentials(
        self,
        client: AsyncClient,
        test_user: User
    ):
        """Test successful login with valid credentials."""
        login_data = {
            "email": test_user.email,
            "password": "testpassword123"
        }
        
        response = await client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert "user" in data
        assert data["user"]["id"] == test_user.id
        assert data["user"]["email"] == test_user.email
    
    async def test_login_with_username(
        self,
        client: AsyncClient,
        test_user: User
    ):
        """Test login using username instead of email."""
        login_data = {
            "email": test_user.username,  # Using username in email field
            "password": "testpassword123"
        }
        
        response = await client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["id"] == test_user.id
    
    async def test_login_invalid_email(
        self,
        client: AsyncClient
    ):
        """Test login with non-existent email."""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "anypassword"
        }
        
        response = await client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]
    
    async def test_login_wrong_password(
        self,
        client: AsyncClient,
        test_user: User
    ):
        """Test login with wrong password."""
        login_data = {
            "email": test_user.email,
            "password": "wrongpassword"
        }
        
        response = await client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]
    
    async def test_login_inactive_user(
        self,
        client: AsyncClient,
        inactive_user: User
    ):
        """Test login with inactive user account."""
        login_data = {
            "email": inactive_user.email,
            "password": "inactivepassword123"
        }
        
        response = await client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 401
        assert "deactivated" in response.json()["detail"]
    
    async def test_login_oauth_user_without_password(
        self,
        client: AsyncClient,
        oauth_user: User
    ):
        """Test login attempt for OAuth user without password."""
        login_data = {
            "email": oauth_user.email,
            "password": "anypassword"
        }
        
        response = await client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]


class TestTokenRefresh:
    """Test token refresh functionality."""
    
    async def test_refresh_valid_token(
        self,
        client: AsyncClient,
        test_user: User
    ):
        """Test refreshing access token with valid refresh token."""
        # First login to get refresh token
        login_data = {
            "email": test_user.email,
            "password": "testpassword123"
        }
        
        login_response = await client.post("/api/v1/auth/login", json=login_data)
        login_data = login_response.json()
        refresh_token = login_data["refresh_token"]
        
        # Refresh token
        refresh_data = {"refresh_token": refresh_token}
        response = await client.post("/api/v1/auth/refresh", json=refresh_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        
        # New tokens should be different
        assert data["access_token"] != login_data["access_token"]
        assert data["refresh_token"] != login_data["refresh_token"]
    
    async def test_refresh_invalid_token(
        self,
        client: AsyncClient
    ):
        """Test refresh with invalid token."""
        refresh_data = {"refresh_token": "invalid_token"}
        response = await client.post("/api/v1/auth/refresh", json=refresh_data)
        
        assert response.status_code == 401
        assert "Invalid refresh token" in response.json()["detail"]
    
    async def test_refresh_with_access_token(
        self,
        client: AsyncClient,
        user_token: str
    ):
        """Test refresh attempt using access token instead of refresh token."""
        refresh_data = {"refresh_token": user_token}
        response = await client.post("/api/v1/auth/refresh", json=refresh_data)
        
        assert response.status_code == 401
        assert "Invalid token type" in response.json()["detail"]


class TestCurrentUser:
    """Test current user endpoints."""
    
    async def test_get_current_user(
        self,
        client: AsyncClient,
        test_user: User,
        user_token: str
    ):
        """Test getting current user information."""
        headers = auth_headers(user_token)
        response = await client.get("/api/v1/auth/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == test_user.id
        assert data["email"] == test_user.email
        assert data["username"] == test_user.username
        assert data["full_name"] == test_user.full_name
        assert data["is_active"] == test_user.is_active
    
    async def test_get_current_user_without_token(
        self,
        client: AsyncClient
    ):
        """Test getting current user without authentication."""
        response = await client.get("/api/v1/auth/me")
        
        assert response.status_code == 403  # No credentials provided
    
    async def test_get_current_user_invalid_token(
        self,
        client: AsyncClient
    ):
        """Test getting current user with invalid token."""
        headers = auth_headers("invalid_token")
        response = await client.get("/api/v1/auth/me", headers=headers)
        
        assert response.status_code == 401


class TestPasswordOperations:
    """Test password-related operations."""
    
    async def test_change_password(
        self,
        client: AsyncClient,
        test_user: User,
        user_token: str
    ):
        """Test changing user password."""
        change_data = {
            "current_password": "testpassword123",
            "new_password": "NewPassword123!"
        }
        
        headers = auth_headers(user_token)
        response = await client.post("/api/v1/auth/password/change", json=change_data, headers=headers)
        
        assert response.status_code == 200
        assert "successfully" in response.json()["message"]
    
    async def test_change_password_wrong_current(
        self,
        client: AsyncClient,
        user_token: str
    ):
        """Test changing password with wrong current password."""
        change_data = {
            "current_password": "wrongpassword",
            "new_password": "NewPassword123!"
        }
        
        headers = auth_headers(user_token)
        response = await client.post("/api/v1/auth/password/change", json=change_data, headers=headers)
        
        assert response.status_code == 400
        assert "incorrect" in response.json()["detail"]
    
    async def test_change_password_weak_new_password(
        self,
        client: AsyncClient,
        user_token: str
    ):
        """Test changing password with weak new password."""
        change_data = {
            "current_password": "testpassword123",
            "new_password": "123"  # Too weak
        }
        
        headers = auth_headers(user_token)
        response = await client.post("/api/v1/auth/password/change", json=change_data, headers=headers)
        
        assert response.status_code == 400
        assert "does not meet requirements" in response.json()["detail"]["message"]
    
    async def test_password_reset_request(
        self,
        client: AsyncClient,
        test_user: User
    ):
        """Test password reset request."""
        reset_data = {"email": test_user.email}
        response = await client.post("/api/v1/auth/password/reset-request", json=reset_data)
        
        assert response.status_code == 200
        assert "reset link" in response.json()["message"]
    
    async def test_password_reset_request_nonexistent_email(
        self,
        client: AsyncClient
    ):
        """Test password reset request with non-existent email."""
        reset_data = {"email": "nonexistent@example.com"}
        response = await client.post("/api/v1/auth/password/reset-request", json=reset_data)
        
        # Should still return success to prevent email enumeration
        assert response.status_code == 200
        assert "reset link" in response.json()["message"]


class TestLogout:
    """Test logout functionality."""
    
    async def test_logout_success(
        self,
        client: AsyncClient,
        user_token: str
    ):
        """Test successful logout."""
        headers = auth_headers(user_token)
        response = await client.post("/api/v1/auth/logout", headers=headers)
        
        assert response.status_code == 200
        assert "logged out" in response.json()["message"]
    
    async def test_logout_without_token(
        self,
        client: AsyncClient
    ):
        """Test logout without authentication token."""
        response = await client.post("/api/v1/auth/logout")
        
        assert response.status_code == 403


class TestJWTTokenManager:
    """Test JWT token manager functionality."""
    
    def test_create_access_token(self, test_user: User):
        """Test access token creation."""
        data = {"sub": str(test_user.id), "email": test_user.email}
        token = jwt_manager.create_access_token(data)
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Verify token
        payload = jwt_manager.verify_token(token)
        assert payload is not None
        assert payload["sub"] == str(test_user.id)
        assert payload["type"] == "access"
    
    def test_create_refresh_token(self, test_user: User):
        """Test refresh token creation."""
        data = {"sub": str(test_user.id)}
        token = jwt_manager.create_refresh_token(data)
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Verify token
        payload = jwt_manager.verify_token(token)
        assert payload is not None
        assert payload["sub"] == str(test_user.id)
        assert payload["type"] == "refresh"
    
    def test_verify_invalid_token(self):
        """Test verifying invalid token."""
        payload = jwt_manager.verify_token("invalid_token")
        assert payload is None
    
    def test_create_password_reset_token(self, test_user: User):
        """Test password reset token creation."""
        token = jwt_manager.create_password_reset_token(test_user.email)
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Verify token
        email = jwt_manager.verify_password_reset_token(token)
        assert email == test_user.email


@pytest.mark.integration
class TestAuthenticationFlow:
    """Integration tests for complete authentication flows."""
    
    async def test_complete_registration_and_login_flow(
        self,
        client: AsyncClient,
        valid_user_data: dict
    ):
        """Test complete user registration and login flow."""
        # 1. Register new user
        register_response = await client.post("/api/v1/auth/register", json=valid_user_data)
        assert register_response.status_code == 201
        user_data = register_response.json()
        
        # 2. Login with new user
        login_data = {
            "email": valid_user_data["email"],
            "password": valid_user_data["password"]
        }
        login_response = await client.post("/api/v1/auth/login", json=login_data)
        assert login_response.status_code == 200
        
        token_data = login_response.json()
        access_token = token_data["access_token"]
        
        # 3. Access protected endpoint
        headers = auth_headers(access_token)
        me_response = await client.get("/api/v1/auth/me", headers=headers)
        assert me_response.status_code == 200
        
        me_data = me_response.json()
        assert me_data["id"] == user_data["id"]
        assert me_data["email"] == valid_user_data["email"]
    
    async def test_token_refresh_flow(
        self,
        client: AsyncClient,
        test_user: User
    ):
        """Test complete token refresh flow."""
        # 1. Login to get tokens
        login_data = {
            "email": test_user.email,
            "password": "testpassword123"
        }
        login_response = await client.post("/api/v1/auth/login", json=login_data)
        login_token_data = login_response.json()
        
        # 2. Refresh tokens
        refresh_data = {"refresh_token": login_token_data["refresh_token"]}
        refresh_response = await client.post("/api/v1/auth/refresh", json=refresh_data)
        assert refresh_response.status_code == 200
        
        new_token_data = refresh_response.json()
        
        # 3. Use new access token
        headers = auth_headers(new_token_data["access_token"])
        me_response = await client.get("/api/v1/auth/me", headers=headers)
        assert me_response.status_code == 200
        
        # 4. Old access token should still work (until it expires)
        old_headers = auth_headers(login_token_data["access_token"])
        old_me_response = await client.get("/api/v1/auth/me", headers=old_headers)
        assert old_me_response.status_code == 200


@pytest.mark.slow
class TestRateLimiting:
    """Test rate limiting functionality."""
    
    async def test_login_rate_limiting(
        self,
        client: AsyncClient
    ):
        """Test rate limiting on login endpoint."""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        }
        
        # Make multiple requests rapidly
        responses = []
        for _ in range(15):  # Exceed rate limit
            response = await client.post("/api/v1/auth/login", json=login_data)
            responses.append(response)
        
        # Check that some requests are rate limited
        status_codes = [r.status_code for r in responses]
        assert 429 in status_codes  # Too Many Requests


@pytest.mark.parametrize("endpoint", [
    "/api/v1/auth/me",
    "/api/v1/users/1"
])
async def test_protected_endpoints_require_auth(
    client: AsyncClient,
    endpoint: str
):
    """Test that protected endpoints require authentication."""
    response = await client.get(endpoint)
    assert response.status_code in [401, 403]