from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db

router = APIRouter()

@router.get("/users/count")
async def user_count(db: AsyncSession = Depends(get_db)):
    res = await db.execute(text("SELECT 42 AS n"))  # swap with real table later
    return {"count": res.scalar_one()}