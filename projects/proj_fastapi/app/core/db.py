from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from .config import settings

# Convert DATABASE_URL to async format for PostgreSQL
def get_async_database_url() -> str:
    url = str(settings.database_url)
    # Convert postgresql:// to postgresql+asyncpg:// for async support
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://")
    # Handle sslmode parameter for asyncpg
    if "sslmode=" in url:
        url = url.replace("sslmode=require", "ssl=require")
        url = url.replace("sslmode=prefer", "ssl=prefer") 
        url = url.replace("sslmode=disable", "ssl=disable")
    return url

engine = create_async_engine(get_async_database_url(), pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def get_db():
    async with SessionLocal() as session:
        yield session