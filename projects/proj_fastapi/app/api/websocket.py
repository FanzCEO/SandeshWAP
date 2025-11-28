"""WebSocket API endpoints for real-time communication."""

import json
import logging
from typing import Dict, List, Optional, Set
from datetime import datetime

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, WebSocketException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.auth import jwt_manager
from app.core.config import settings
from app.core.observability import get_logger
from app.core.redis import redis_manager
from app.models.user import User

logger = get_logger("websocket")
router = APIRouter()

# Connection manager for WebSocket connections
class ConnectionManager:
    """Manage WebSocket connections."""
    
    def __init__(self):
        # Active connections by user ID
        self.active_connections: Dict[int, List[WebSocket]] = {}
        
        # Connection metadata
        self.connection_metadata: Dict[WebSocket, Dict] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int, metadata: Dict = None):
        """Accept WebSocket connection and register user."""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        
        self.active_connections[user_id].append(websocket)
        
        # Store connection metadata
        self.connection_metadata[websocket] = {
            "user_id": user_id,
            "connected_at": datetime.utcnow(),
            "last_activity": datetime.utcnow(),
            **(metadata or {})
        }
        
        logger.info(f"WebSocket connected for user {user_id}")
        
        # Notify user connection
        await self.broadcast_to_user(user_id, {
            "type": "connection_established",
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        }, exclude_websocket=websocket)
    
    async def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection."""
        metadata = self.connection_metadata.get(websocket)
        if not metadata:
            return
        
        user_id = metadata["user_id"]
        
        # Remove from active connections
        if user_id in self.active_connections:
            self.active_connections[user_id] = [
                ws for ws in self.active_connections[user_id] if ws != websocket
            ]
            
            # Clean up empty user entries
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        
        # Remove metadata
        del self.connection_metadata[websocket]
        
        logger.info(f"WebSocket disconnected for user {user_id}")
        
        # Notify user disconnection
        if user_id in self.active_connections:
            await self.broadcast_to_user(user_id, {
                "type": "connection_closed",
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat()
            })
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to specific WebSocket connection."""
        try:
            await websocket.send_json(message)
            
            # Update last activity
            if websocket in self.connection_metadata:
                self.connection_metadata[websocket]["last_activity"] = datetime.utcnow()
                
        except Exception as e:
            logger.error(f"Error sending message to WebSocket: {e}")
            await self.disconnect(websocket)
    
    async def broadcast_to_user(self, user_id: int, message: dict, exclude_websocket: Optional[WebSocket] = None):
        """Send message to all connections of a specific user."""
        if user_id not in self.active_connections:
            return
        
        connections_to_remove = []
        
        for websocket in self.active_connections[user_id]:
            if exclude_websocket and websocket == exclude_websocket:
                continue
            
            try:
                await websocket.send_json(message)
                
                # Update last activity
                if websocket in self.connection_metadata:
                    self.connection_metadata[websocket]["last_activity"] = datetime.utcnow()
                    
            except Exception as e:
                logger.error(f"Error broadcasting to user {user_id}: {e}")
                connections_to_remove.append(websocket)
        
        # Clean up failed connections
        for websocket in connections_to_remove:
            await self.disconnect(websocket)
    
    async def broadcast_to_all(self, message: dict, exclude_users: Set[int] = None):
        """Broadcast message to all active connections."""
        exclude_users = exclude_users or set()
        
        for user_id in list(self.active_connections.keys()):
            if user_id in exclude_users:
                continue
            
            await self.broadcast_to_user(user_id, message)
    
    def get_active_users(self) -> List[int]:
        """Get list of active user IDs."""
        return list(self.active_connections.keys())
    
    def get_user_connection_count(self, user_id: int) -> int:
        """Get number of active connections for user."""
        return len(self.active_connections.get(user_id, []))
    
    def get_total_connections(self) -> int:
        """Get total number of active connections."""
        return sum(len(connections) for connections in self.active_connections.values())


# Global connection manager
manager = ConnectionManager()


async def authenticate_websocket(websocket: WebSocket, token: Optional[str] = None) -> Optional[User]:
    """Authenticate WebSocket connection."""
    if not token:
        # Try to get token from query parameters
        token = websocket.query_params.get("token")
    
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication required")
        return None
    
    try:
        # Verify token
        payload = jwt_manager.verify_token(token)
        if not payload:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
            return None
        
        # Check token type
        if payload.get("type") != "access":
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token type")
            return None
        
        # Get user from database (we need a way to get DB session in WebSocket context)
        # For now, we'll create a basic user object from token data
        user_id = int(payload.get("sub"))
        
        # In a real implementation, you'd get the user from the database
        # For now, we'll create a minimal user object
        class MockUser:
            def __init__(self, id: int, email: str, username: str):
                self.id = id
                self.email = email
                self.username = username
                self.is_active = True
        
        return MockUser(
            id=user_id,
            email=payload.get("email", ""),
            username=payload.get("username", "")
        )
        
    except Exception as e:
        logger.error(f"WebSocket authentication error: {e}")
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason="Authentication failed")
        return None


@router.websocket("/connect")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = None
):
    """Main WebSocket endpoint for real-time communication."""
    
    if not settings.feature_websocket:
        await websocket.close(code=status.WS_1003_UNSUPPORTED_DATA, reason="WebSocket feature disabled")
        return
    
    # Authenticate user
    user = await authenticate_websocket(websocket, token)
    if not user:
        return
    
    # Connect user
    await manager.connect(websocket, user.id, {
        "email": user.email,
        "username": user.username
    })
    
    try:
        # Send welcome message
        await manager.send_personal_message({
            "type": "welcome",
            "user_id": user.id,
            "message": f"Welcome {user.username}!",
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)
        
        # Send connection stats
        await manager.send_personal_message({
            "type": "stats",
            "active_users": len(manager.get_active_users()),
            "your_connections": manager.get_user_connection_count(user.id),
            "total_connections": manager.get_total_connections(),
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)
        
        # Message handling loop
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            
            # Validate message format
            if not isinstance(data, dict) or "type" not in data:
                await manager.send_personal_message({
                    "type": "error",
                    "message": "Invalid message format",
                    "timestamp": datetime.utcnow().isoformat()
                }, websocket)
                continue
            
            message_type = data.get("type")
            
            # Handle different message types
            await handle_websocket_message(websocket, user, message_type, data)
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user.id}")
    except Exception as e:
        logger.error(f"WebSocket error for user {user.id}: {e}")
    finally:
        await manager.disconnect(websocket)


async def handle_websocket_message(websocket: WebSocket, user, message_type: str, data: dict):
    """Handle different types of WebSocket messages."""
    
    try:
        if message_type == "ping":
            # Health check
            await manager.send_personal_message({
                "type": "pong",
                "timestamp": datetime.utcnow().isoformat()
            }, websocket)
        
        elif message_type == "echo":
            # Echo message back
            await manager.send_personal_message({
                "type": "echo_response",
                "original_message": data.get("message", ""),
                "timestamp": datetime.utcnow().isoformat()
            }, websocket)
        
        elif message_type == "broadcast":
            # Broadcast message to all users (admin only)
            if not getattr(user, 'is_superuser', False):
                await manager.send_personal_message({
                    "type": "error",
                    "message": "Permission denied",
                    "timestamp": datetime.utcnow().isoformat()
                }, websocket)
                return
            
            message = data.get("message", "")
            await manager.broadcast_to_all({
                "type": "broadcast_message",
                "message": message,
                "from_user": user.username,
                "timestamp": datetime.utcnow().isoformat()
            })
        
        elif message_type == "private_message":
            # Send private message to another user
            target_user_id = data.get("target_user_id")
            message = data.get("message", "")
            
            if not target_user_id or not message:
                await manager.send_personal_message({
                    "type": "error",
                    "message": "Missing target_user_id or message",
                    "timestamp": datetime.utcnow().isoformat()
                }, websocket)
                return
            
            await manager.broadcast_to_user(target_user_id, {
                "type": "private_message",
                "message": message,
                "from_user_id": user.id,
                "from_username": user.username,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Confirm message sent
            await manager.send_personal_message({
                "type": "message_sent",
                "target_user_id": target_user_id,
                "timestamp": datetime.utcnow().isoformat()
            }, websocket)
        
        elif message_type == "join_room":
            # Join a chat room (Redis pub/sub)
            room = data.get("room", "")
            if room:
                await join_chat_room(user.id, room, websocket)
        
        elif message_type == "leave_room":
            # Leave a chat room
            room = data.get("room", "")
            if room:
                await leave_chat_room(user.id, room, websocket)
        
        elif message_type == "room_message":
            # Send message to chat room
            room = data.get("room", "")
            message = data.get("message", "")
            if room and message:
                await send_room_message(user, room, message)
        
        elif message_type == "get_stats":
            # Get connection statistics
            await manager.send_personal_message({
                "type": "stats_response",
                "active_users": len(manager.get_active_users()),
                "your_connections": manager.get_user_connection_count(user.id),
                "total_connections": manager.get_total_connections(),
                "timestamp": datetime.utcnow().isoformat()
            }, websocket)
        
        else:
            # Unknown message type
            await manager.send_personal_message({
                "type": "error",
                "message": f"Unknown message type: {message_type}",
                "timestamp": datetime.utcnow().isoformat()
            }, websocket)
    
    except Exception as e:
        logger.error(f"Error handling WebSocket message {message_type}: {e}")
        await manager.send_personal_message({
            "type": "error",
            "message": "Failed to process message",
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)


# Chat room functionality using Redis
async def join_chat_room(user_id: int, room: str, websocket: WebSocket):
    """Join a chat room using Redis pub/sub."""
    try:
        # Store room membership
        room_key = f"room:{room}:members"
        await redis_manager.sadd(room_key, str(user_id))
        
        # Send confirmation
        await manager.send_personal_message({
            "type": "room_joined",
            "room": room,
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)
        
        logger.info(f"User {user_id} joined room {room}")
        
    except Exception as e:
        logger.error(f"Error joining room {room}: {e}")
        await manager.send_personal_message({
            "type": "error",
            "message": f"Failed to join room {room}",
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)


async def leave_chat_room(user_id: int, room: str, websocket: WebSocket):
    """Leave a chat room."""
    try:
        # Remove room membership
        room_key = f"room:{room}:members"
        await redis_manager.redis_client.srem(room_key, str(user_id))
        
        # Send confirmation
        await manager.send_personal_message({
            "type": "room_left", 
            "room": room,
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)
        
        logger.info(f"User {user_id} left room {room}")
        
    except Exception as e:
        logger.error(f"Error leaving room {room}: {e}")


async def send_room_message(user, room: str, message: str):
    """Send message to chat room members."""
    try:
        # Get room members
        room_key = f"room:{room}:members"
        member_ids = await redis_manager.redis_client.smembers(room_key)
        
        # Send message to all room members
        room_message = {
            "type": "room_message",
            "room": room,
            "message": message,
            "from_user_id": user.id,
            "from_username": user.username,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        for member_id_str in member_ids:
            try:
                member_id = int(member_id_str)
                await manager.broadcast_to_user(member_id, room_message)
            except ValueError:
                continue
        
        logger.info(f"Room message sent to {room} by user {user.id}")
        
    except Exception as e:
        logger.error(f"Error sending room message: {e}")


# Health check endpoint for WebSocket
@router.get("/health")
async def websocket_health():
    """WebSocket service health check."""
    return {
        "status": "healthy",
        "feature_enabled": settings.feature_websocket,
        "active_users": len(manager.get_active_users()),
        "total_connections": manager.get_total_connections(),
        "timestamp": datetime.utcnow().isoformat()
    }