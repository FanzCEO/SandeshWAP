"""Pytest configuration and shared fixtures for testing."""

import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator, Generator
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import Base, get_database_session
from app.core.redis import init_redis, close_redis, redis_manager
from app.core.security import password_manager
from app.main import create_app
from app.models.user import User


# Test database URL - use SQLite in memory for fast testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

# Override settings for testing
settings.testing = True
settings.database_url_str = TEST_DATABASE_URL
settings.redis_url_str = "redis://localhost:6379/1"  # Use different Redis DB


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def engine():
    """Create test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        future=True,
    )
    
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Drop all tables and dispose engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(engine) -> AsyncGenerator[AsyncSession, None]:
    """Create database session for testing."""
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def app():
    """Create FastAPI test application."""
    # Initialize Redis for testing
    await init_redis()
    
    app = create_app()
    yield app
    
    # Cleanup Redis
    await close_redis()


@pytest_asyncio.fixture  
async def client(app, db_session) -> AsyncGenerator[AsyncClient, None]:
    """Create test HTTP client with database session override."""
    
    # Override database dependency
    app.dependency_overrides[get_database_session] = lambda: db_session
    
    async with AsyncClient(app=app, base_url="http://testserver") as ac:
        yield ac
    
    # Clean up overrides
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user."""
    user_data = {
        "email": "test@example.com",
        "username": "testuser",
        "full_name": "Test User",
        "hashed_password": password_manager.hash_password("testpassword123"),
        "is_active": True,
        "is_superuser": False,
        "email_verified": True,
    }
    
    user = await User.create(db_session, **user_data)
    return user


@pytest_asyncio.fixture
async def test_superuser(db_session: AsyncSession) -> User:
    """Create a test superuser."""
    user_data = {
        "email": "admin@example.com", 
        "username": "admin",
        "full_name": "Admin User",
        "hashed_password": password_manager.hash_password("adminpassword123"),
        "is_active": True,
        "is_superuser": True,
        "email_verified": True,
    }
    
    user = await User.create(db_session, **user_data)
    return user


@pytest_asyncio.fixture
async def inactive_user(db_session: AsyncSession) -> User:
    """Create an inactive test user."""
    user_data = {
        "email": "inactive@example.com",
        "username": "inactive",
        "full_name": "Inactive User", 
        "hashed_password": password_manager.hash_password("inactivepassword123"),
        "is_active": False,
        "is_superuser": False,
        "email_verified": True,
    }
    
    user = await User.create(db_session, **user_data)
    return user


@pytest_asyncio.fixture
async def oauth_user(db_session: AsyncSession) -> User:
    """Create a test OAuth user."""
    user_data = {
        "email": "oauth@example.com",
        "username": "oauthuser",
        "full_name": "OAuth User",
        "hashed_password": None,  # OAuth user has no password
        "is_active": True,
        "is_superuser": False,
        "email_verified": True,
        "oauth_provider": "google",
        "oauth_id": "google_123456",
    }
    
    user = await User.create(db_session, **user_data)
    return user


@pytest_asyncio.fixture
async def multiple_users(db_session: AsyncSession) -> list[User]:
    """Create multiple test users for pagination testing."""
    users = []
    
    for i in range(15):
        user_data = {
            "email": f"user{i}@example.com",
            "username": f"user{i}",
            "full_name": f"User {i}",
            "hashed_password": password_manager.hash_password(f"password{i}"),
            "is_active": True,
            "is_superuser": i == 0,  # First user is superuser
            "email_verified": True,
        }
        
        user = await User.create(db_session, **user_data)
        users.append(user)
    
    return users


# Authentication helpers

@pytest_asyncio.fixture
async def user_token(client: AsyncClient, test_user: User) -> str:
    """Get authentication token for test user."""
    login_data = {
        "email": test_user.email,
        "password": "testpassword123"
    }
    
    response = await client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == 200
    
    token_data = response.json()
    return token_data["access_token"]


@pytest_asyncio.fixture
async def superuser_token(client: AsyncClient, test_superuser: User) -> str:
    """Get authentication token for test superuser."""
    login_data = {
        "email": test_superuser.email,
        "password": "adminpassword123"
    }
    
    response = await client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == 200
    
    token_data = response.json()
    return token_data["access_token"]


def auth_headers(token: str) -> dict:
    """Create authorization headers for requests."""
    return {"Authorization": f"Bearer {token}"}


# Redis fixtures

@pytest_asyncio.fixture
async def redis_client():
    """Get Redis client for testing."""
    await init_redis()
    yield redis_manager
    await close_redis()


# Mock data fixtures

@pytest.fixture
def valid_user_data() -> dict:
    """Valid user registration data."""
    return {
        "email": "newuser@example.com",
        "username": "newuser", 
        "password": "NewPassword123!",
        "full_name": "New User"
    }


@pytest.fixture
def invalid_user_data() -> dict:
    """Invalid user registration data."""
    return {
        "email": "invalid-email",  # Invalid email
        "username": "nu",  # Too short
        "password": "123",  # Too short
        "full_name": ""  # Empty name
    }


@pytest.fixture  
def valid_login_data() -> dict:
    """Valid login credentials."""
    return {
        "email": "test@example.com",
        "password": "testpassword123"
    }


@pytest.fixture
def invalid_login_data() -> dict:
    """Invalid login credentials."""
    return {
        "email": "nonexistent@example.com",
        "password": "wrongpassword"
    }


# Test configuration

pytest_plugins = ["pytest_asyncio"]


def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests (deselect with '-m \"not unit\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests (deselect with '-m \"not integration\"')"
    )
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )


# Cleanup

@pytest_asyncio.fixture(autouse=True)
async def cleanup_redis():
    """Clean up Redis data after each test."""
    yield
    
    # Clear Redis test database after each test
    if redis_manager.redis_client:
        await redis_manager.redis_client.flushdb()


# Performance testing helpers

@pytest.fixture
def performance_threshold():
    """Performance thresholds for various operations."""
    return {
        "api_response": 1.0,  # API responses should be under 1 second
        "db_query": 0.5,      # Database queries should be under 500ms
        "auth": 0.3,          # Authentication should be under 300ms
    }