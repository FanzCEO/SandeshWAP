from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title=os.getenv("PROJECT_NAME", "FastAPI App"),
    description="A modern FastAPI application with automatic OpenAPI documentation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class Item(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    price: float
    tax: Optional[float] = None

class ItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: float
    tax: Optional[float] = None
    total: float

# In-memory storage (use a database in production)
items_db: List[ItemResponse] = []
next_id = 1

@app.get("/")
async def root():
    return {
        "message": "Welcome to FastAPI!",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/api/v1/items", response_model=List[ItemResponse])
async def get_items():
    """Get all items"""
    return items_db

@app.get("/api/v1/items/{item_id}", response_model=ItemResponse)
async def get_item(item_id: int):
    """Get a specific item by ID"""
    for item in items_db:
        if item.id == item_id:
            return item
    raise HTTPException(status_code=404, detail="Item not found")

@app.post("/api/v1/items", response_model=ItemResponse)
async def create_item(item: Item):
    """Create a new item"""
    global next_id
    
    total = item.price
    if item.tax:
        total += item.price * item.tax
    
    new_item = ItemResponse(
        id=next_id,
        name=item.name,
        description=item.description,
        price=item.price,
        tax=item.tax,
        total=total
    )
    
    items_db.append(new_item)
    next_id += 1
    
    return new_item

@app.put("/api/v1/items/{item_id}", response_model=ItemResponse)
async def update_item(item_id: int, item: Item):
    """Update an existing item"""
    for i, existing_item in enumerate(items_db):
        if existing_item.id == item_id:
            total = item.price
            if item.tax:
                total += item.price * item.tax
            
            updated_item = ItemResponse(
                id=item_id,
                name=item.name,
                description=item.description,
                price=item.price,
                tax=item.tax,
                total=total
            )
            
            items_db[i] = updated_item
            return updated_item
    
    raise HTTPException(status_code=404, detail="Item not found")

@app.delete("/api/v1/items/{item_id}")
async def delete_item(item_id: int):
    """Delete an item"""
    for i, item in enumerate(items_db):
        if item.id == item_id:
            deleted_item = items_db.pop(i)
            return {"message": f"Item {deleted_item.name} deleted successfully"}
    
    raise HTTPException(status_code=404, detail="Item not found")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )