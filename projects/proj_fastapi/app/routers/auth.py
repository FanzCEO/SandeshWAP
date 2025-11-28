from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta
import jwt, os

router = APIRouter()
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
ALG = "HS256"

@router.post("/auth/token")
def issue_token(sub: str):
    now = datetime.utcnow()
    token = jwt.encode({"sub": sub, "iat": now, "exp": now + timedelta(hours=12)}, JWT_SECRET, algorithm=ALG)
    return {"access_token": token, "token_type": "bearer"}