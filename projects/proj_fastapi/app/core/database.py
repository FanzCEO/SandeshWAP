"""Database configuration and session management using async SQLAlchemy 2.0."""

import logging
from typing import AsyncGenerator, Optional
from contextlib import asynccontextmanager

from sqlalchemy import event, pool
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
    AsyncEngine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import StaticPool

from app.core.config import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


class DatabaseManager:
    """Database connection and session management."""
    
    def __init__(self) -> None:
        self.engine: Optional[AsyncEngine] = None
        self.session_factory: Optional[async_sessionmaker[AsyncSession]] = None
        
    async def initialize(self) -> None:
        """Initialize database engine and session factory."""
        if self.engine is not None:
            return
            
        # Database URL
        database_url = settings.database_url_str
        logger.info(f"Connecting to database: {database_url.split('@')[0]}@***")
        
        # Engine configuration
        engine_kwargs = {
            "url": database_url,
            "echo": settings.database_echo,
            "echo_pool": settings.debug,
            "pool_pre_ping": True,
            "pool_recycle": 3600,  # Recycle connections every hour
        }
        
        # Pool configuration based on environment
        if settings.testing:
            # Use StaticPool for testing to handle SQLite in-memory databases
            engine_kwargs.update({
                "poolclass": StaticPool,
                "connect_args": {"check_same_thread": False},
            })
        else:
            # Production pool configuration
            engine_kwargs.update({
                "pool_size": settings.database_pool_size,
                "max_overflow": settings.database_max_overflow,
                "pool_timeout": 30,
            })
        
        # Create async engine
        self.engine = create_async_engine(**engine_kwargs)
        
        # Add connection event listeners
        self._add_engine_listeners()
        
        # Create session factory
        self.session_factory = async_sessionmaker(
            bind=self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
            autocommit=False,
        )
        
        logger.info("Database initialized successfully")
    
    def _add_engine_listeners(self) -> None:
        """Add SQLAlchemy engine event listeners."""
        if not self.engine:
            return
            
        @event.listens_for(self.engine.sync_engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            """Set SQLite pragmas for better performance and reliability."""
            if "sqlite" in str(self.engine.url):
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA foreign_keys=ON")
                cursor.execute("PRAGMA journal_mode=WAL")
                cursor.execute("PRAGMA synchronous=NORMAL")
                cursor.close()
                
        @event.listens_for(self.engine.sync_engine, "checkout")  
        def checkout_listener(dbapi_connection, connection_record, connection_proxy):
            """Log database connection checkout in debug mode."""
            if settings.debug:
                logger.debug("Database connection checked out")
        
        @event.listens_for(self.engine.sync_engine, "checkin")
        def checkin_listener(dbapi_connection, connection_record):
            """Log database connection checkin in debug mode."""
            if settings.debug:
                logger.debug("Database connection checked in")
    
    async def close(self) -> None:
        """Close database connections."""
        if self.engine:
            await self.engine.dispose()
            logger.info("Database connections closed")
    
    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get database session with automatic transaction management."""
        if not self.session_factory:
            raise RuntimeError("Database not initialized. Call initialize() first.")
            
        async with self.session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
    
    async def health_check(self) -> bool:
        """Check database connectivity."""
        try:
            if not self.engine:
                return False
                
            async with self.engine.begin() as conn:
                await conn.execute("SELECT 1")
            return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False


# Global database manager instance
database = DatabaseManager()


async def get_database_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency to get database session."""
    async with database.session() as session:
        yield session


async def init_database() -> None:
    """Initialize database connection."""
    await database.initialize()


async def close_database() -> None:
    """Close database connections."""
    await database.close()


async def create_tables() -> None:
    """Create all database tables."""
    if not database.engine:
        raise RuntimeError("Database not initialized")
        
    async with database.engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")


async def drop_tables() -> None:
    """Drop all database tables (for testing)."""
    if not database.engine:
        raise RuntimeError("Database not initialized")
        
    async with database.engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    logger.info("Database tables dropped")