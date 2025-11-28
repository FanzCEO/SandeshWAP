"""WebSocket API tests."""

import json
import pytest
from httpx import AsyncClient
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocket

from app.models.user import User


class TestWebSocketConnection:
    """Test WebSocket connection functionality."""
    
    def test_websocket_connect_with_valid_token(
        self,
        app,
        user_token: str
    ):
        """Test WebSocket connection with valid authentication token."""
        with TestClient(app) as client:
            with client.websocket_connect(f"/api/v1/ws/connect?token={user_token}") as websocket:
                # Should receive welcome message
                data = websocket.receive_json()
                assert data["type"] == "welcome"
                assert "Welcome" in data["message"]
    
    def test_websocket_connect_without_token(self, app):
        """Test WebSocket connection without authentication token."""
        with TestClient(app) as client:
            with pytest.raises(Exception):  # Connection should be rejected
                with client.websocket_connect("/api/v1/ws/connect"):
                    pass
    
    def test_websocket_connect_with_invalid_token(self, app):
        """Test WebSocket connection with invalid token."""
        with TestClient(app) as client:
            with pytest.raises(Exception):  # Connection should be rejected
                with client.websocket_connect("/api/v1/ws/connect?token=invalid_token"):
                    pass
    
    def test_websocket_receives_welcome_and_stats(
        self,
        app,
        user_token: str
    ):
        """Test that WebSocket receives welcome message and stats on connection."""
        with TestClient(app) as client:
            with client.websocket_connect(f"/api/v1/ws/connect?token={user_token}") as websocket:
                # Welcome message
                welcome_data = websocket.receive_json()
                assert welcome_data["type"] == "welcome"
                
                # Stats message
                stats_data = websocket.receive_json()
                assert stats_data["type"] == "stats"
                assert "active_users" in stats_data
                assert "total_connections" in stats_data


class TestWebSocketMessages:
    """Test WebSocket message handling."""
    
    def test_ping_pong_message(
        self,
        app,
        user_token: str
    ):
        """Test ping-pong message exchange."""
        with TestClient(app) as client:
            with client.websocket_connect(f"/api/v1/ws/connect?token={user_token}") as websocket:
                # Skip welcome messages
                websocket.receive_json()  # welcome
                websocket.receive_json()  # stats
                
                # Send ping
                websocket.send_json({"type": "ping"})
                
                # Receive pong
                response = websocket.receive_json()
                assert response["type"] == "pong"
                assert "timestamp" in response
    
    def test_echo_message(
        self,
        app,
        user_token: str
    ):
        """Test echo message functionality."""
        with TestClient(app) as client:
            with client.websocket_connect(f"/api/v1/ws/connect?token={user_token}") as websocket:
                # Skip welcome messages
                websocket.receive_json()  # welcome
                websocket.receive_json()  # stats
                
                # Send echo message
                test_message = "Hello, WebSocket!"
                websocket.send_json({
                    "type": "echo",
                    "message": test_message
                })
                
                # Receive echo response
                response = websocket.receive_json()
                assert response["type"] == "echo_response"
                assert response["original_message"] == test_message
    
    def test_get_stats_message(
        self,
        app,
        user_token: str
    ):
        """Test getting connection statistics."""
        with TestClient(app) as client:
            with client.websocket_connect(f"/api/v1/ws/connect?token={user_token}") as websocket:
                # Skip welcome messages
                websocket.receive_json()  # welcome
                websocket.receive_json()  # stats
                
                # Request stats
                websocket.send_json({"type": "get_stats"})
                
                # Receive stats response
                response = websocket.receive_json()
                assert response["type"] == "stats_response"
                assert "active_users" in response
                assert "total_connections" in response
                assert response["active_users"] >= 1
                assert response["total_connections"] >= 1
    
    def test_invalid_message_format(
        self,
        app,
        user_token: str
    ):
        """Test handling of invalid message format."""
        with TestClient(app) as client:
            with client.websocket_connect(f"/api/v1/ws/connect?token={user_token}") as websocket:
                # Skip welcome messages
                websocket.receive_json()  # welcome
                websocket.receive_json()  # stats
                
                # Send invalid message (missing type)
                websocket.send_json({"message": "invalid"})
                
                # Should receive error response
                response = websocket.receive_json()
                assert response["type"] == "error"
                assert "Invalid message format" in response["message"]
    
    def test_unknown_message_type(
        self,
        app,
        user_token: str
    ):
        """Test handling of unknown message type."""
        with TestClient(app) as client:
            with client.websocket_connect(f"/api/v1/ws/connect?token={user_token}") as websocket:
                # Skip welcome messages
                websocket.receive_json()  # welcome
                websocket.receive_json()  # stats
                
                # Send unknown message type
                websocket.send_json({"type": "unknown_type"})
                
                # Should receive error response
                response = websocket.receive_json()
                assert response["type"] == "error"
                assert "Unknown message type" in response["message"]


class TestPrivateMessages:
    """Test private messaging functionality."""
    
    def test_private_message_to_nonexistent_user(
        self,
        app,
        user_token: str
    ):
        """Test sending private message to non-existent user."""
        with TestClient(app) as client:
            with client.websocket_connect(f"/api/v1/ws/connect?token={user_token}") as websocket:
                # Skip welcome messages
                websocket.receive_json()  # welcome
                websocket.receive_json()  # stats
                
                # Send private message to non-existent user
                websocket.send_json({
                    "type": "private_message",
                    "target_user_id": 99999,
                    "message": "Hello, non-existent user!"
                })
                
                # Should still get confirmation (message sent to void)
                response = websocket.receive_json()
                assert response["type"] == "message_sent"
                assert response["target_user_id"] == 99999
    
    def test_private_message_missing_fields(
        self,
        app,
        user_token: str
    ):
        """Test private message with missing required fields."""
        with TestClient(app) as client:
            with client.websocket_connect(f"/api/v1/ws/connect?token={user_token}") as websocket:
                # Skip welcome messages
                websocket.receive_json()  # welcome
                websocket.receive_json()  # stats
                
                # Send private message without target_user_id
                websocket.send_json({
                    "type": "private_message",
                    "message": "Hello!"
                })
                
                # Should receive error
                response = websocket.receive_json()
                assert response["type"] == "error"
                assert "Missing target_user_id" in response["message"]


class TestBroadcastMessages:
    """Test broadcast message functionality."""
    
    def test_broadcast_message_as_regular_user(
        self,
        app,
        user_token: str
    ):
        """Test that regular users cannot send broadcast messages."""
        with TestClient(app) as client:
            with client.websocket_connect(f"/api/v1/ws/connect?token={user_token}") as websocket:
                # Skip welcome messages
                websocket.receive_json()  # welcome
                websocket.receive_json()  # stats
                
                # Try to send broadcast message
                websocket.send_json({
                    "type": "broadcast",
                    "message": "This is a broadcast!"
                })
                
                # Should receive permission denied error
                response = websocket.receive_json()
                assert response["type"] == "error"
                assert "Permission denied" in response["message"]
    
    def test_broadcast_message_as_superuser(
        self,
        app,
        superuser_token: str
    ):
        """Test that superusers can send broadcast messages."""
        with TestClient(app) as client:
            with client.websocket_connect(f"/api/v1/ws/connect?token={superuser_token}") as websocket:
                # Skip welcome messages
                websocket.receive_json()  # welcome
                websocket.receive_json()  # stats
                
                # Send broadcast message
                websocket.send_json({
                    "type": "broadcast",
                    "message": "Admin broadcast!"
                })
                
                # Should receive the broadcast message back (since we're connected)
                response = websocket.receive_json()
                assert response["type"] == "broadcast_message"
                assert response["message"] == "Admin broadcast!"
                assert response["from_user"] is not None


class TestChatRooms:
    """Test chat room functionality."""
    
    def test_join_and_leave_room(
        self,
        app,
        user_token: str
    ):
        """Test joining and leaving a chat room."""
        with TestClient(app) as client:
            with client.websocket_connect(f"/api/v1/ws/connect?token={user_token}") as websocket:
                # Skip welcome messages
                websocket.receive_json()  # welcome
                websocket.receive_json()  # stats
                
                # Join room
                websocket.send_json({
                    "type": "join_room",
                    "room": "test_room"
                })
                
                # Should receive confirmation
                response = websocket.receive_json()
                assert response["type"] == "room_joined"
                assert response["room"] == "test_room"
                
                # Leave room
                websocket.send_json({
                    "type": "leave_room",
                    "room": "test_room"
                })
                
                # Should receive confirmation
                response = websocket.receive_json()
                assert response["type"] == "room_left"
                assert response["room"] == "test_room"
    
    def test_room_message(
        self,
        app,
        user_token: str
    ):
        """Test sending message to chat room."""
        with TestClient(app) as client:
            with client.websocket_connect(f"/api/v1/ws/connect?token={user_token}") as websocket:
                # Skip welcome messages
                websocket.receive_json()  # welcome
                websocket.receive_json()  # stats
                
                # Join room first
                websocket.send_json({
                    "type": "join_room",
                    "room": "test_room"
                })
                websocket.receive_json()  # room_joined confirmation
                
                # Send room message
                websocket.send_json({
                    "type": "room_message",
                    "room": "test_room",
                    "message": "Hello, room!"
                })
                
                # Should receive the room message back (since we're in the room)
                response = websocket.receive_json()
                assert response["type"] == "room_message"
                assert response["room"] == "test_room"
                assert response["message"] == "Hello, room!"
                assert response["from_user_id"] is not None


class TestWebSocketHealth:
    """Test WebSocket health endpoint."""
    
    async def test_websocket_health_endpoint(
        self,
        client: AsyncClient
    ):
        """Test WebSocket health check endpoint."""
        response = await client.get("/api/v1/ws/health")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert data["status"] == "healthy"
        assert "feature_enabled" in data
        assert "active_users" in data
        assert "total_connections" in data
        assert "timestamp" in data


class TestMultipleConnections:
    """Test multiple WebSocket connections."""
    
    def test_multiple_connections_same_user(
        self,
        app,
        user_token: str
    ):
        """Test multiple connections from same user."""
        with TestClient(app) as client:
            # First connection
            with client.websocket_connect(f"/api/v1/ws/connect?token={user_token}") as ws1:
                # Skip welcome messages
                ws1.receive_json()  # welcome
                stats1 = ws1.receive_json()  # stats
                
                # Second connection from same user
                with client.websocket_connect(f"/api/v1/ws/connect?token={user_token}") as ws2:
                    # Skip welcome messages
                    ws2.receive_json()  # welcome
                    stats2 = ws2.receive_json()  # stats
                    
                    # Both connections should work
                    ws1.send_json({"type": "ping"})
                    pong1 = ws1.receive_json()
                    assert pong1["type"] == "pong"
                    
                    ws2.send_json({"type": "ping"})
                    pong2 = ws2.receive_json()
                    assert pong2["type"] == "pong"
                    
                    # User connection count should be 2
                    ws1.send_json({"type": "get_stats"})
                    final_stats = ws1.receive_json()
                    assert final_stats["your_connections"] == 2


@pytest.mark.integration
class TestWebSocketIntegration:
    """Integration tests for WebSocket functionality."""
    
    def test_websocket_with_auth_flow(
        self,
        app,
        test_user: User
    ):
        """Test WebSocket connection using token from auth flow."""
        # First, get a token through the auth API
        with TestClient(app) as client:
            # Login to get token
            login_response = client.post("/api/v1/auth/login", json={
                "email": test_user.email,
                "password": "testpassword123"
            })
            
            assert login_response.status_code == 200
            token_data = login_response.json()
            access_token = token_data["access_token"]
            
            # Use token for WebSocket connection
            with client.websocket_connect(f"/api/v1/ws/connect?token={access_token}") as websocket:
                # Should receive welcome message
                welcome = websocket.receive_json()
                assert welcome["type"] == "welcome"
                assert str(test_user.id) in str(welcome["user_id"])
    
    def test_websocket_token_validation(
        self,
        app
    ):
        """Test WebSocket token validation edge cases."""
        with TestClient(app) as client:
            # Test with expired token (simulate by using obviously invalid token)
            with pytest.raises(Exception):
                with client.websocket_connect("/api/v1/ws/connect?token=expired.token.here"):
                    pass
            
            # Test with malformed token
            with pytest.raises(Exception):
                with client.websocket_connect("/api/v1/ws/connect?token=malformed_token"):
                    pass
            
            # Test with empty token
            with pytest.raises(Exception):
                with client.websocket_connect("/api/v1/ws/connect?token="):
                    pass


@pytest.mark.slow
class TestWebSocketPerformance:
    """Performance tests for WebSocket functionality."""
    
    def test_websocket_message_throughput(
        self,
        app,
        user_token: str,
        performance_threshold: dict
    ):
        """Test WebSocket message handling performance."""
        import time
        
        with TestClient(app) as client:
            with client.websocket_connect(f"/api/v1/ws/connect?token={user_token}") as websocket:
                # Skip welcome messages
                websocket.receive_json()  # welcome
                websocket.receive_json()  # stats
                
                # Send multiple ping messages and measure response time
                start_time = time.time()
                num_messages = 10
                
                for _ in range(num_messages):
                    websocket.send_json({"type": "ping"})
                    response = websocket.receive_json()
                    assert response["type"] == "pong"
                
                end_time = time.time()
                avg_response_time = (end_time - start_time) / num_messages
                
                # Should handle messages within performance threshold
                assert avg_response_time < performance_threshold["api_response"]