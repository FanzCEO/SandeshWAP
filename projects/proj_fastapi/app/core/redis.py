"""Redis configuration and connection management."""

import json
import logging
from typing import Any, Optional, Union
from contextlib import asynccontextmanager

import redis.asyncio as redis
from redis.asyncio import ConnectionPool, Redis

from app.core.config import settings

logger = logging.getLogger(__name__)


class RedisManager:
    """Redis connection and operations management."""
    
    def __init__(self) -> None:
        self.redis_client: Optional[Redis] = None
        self.connection_pool: Optional[ConnectionPool] = None
    
    async def initialize(self) -> None:
        """Initialize Redis connection pool and client."""
        if self.redis_client is not None:
            return
            
        redis_url = settings.redis_url_str
        logger.info(f"Connecting to Redis: {redis_url.split('@')[0] if '@' in redis_url else redis_url}")
        
        try:
            # Create connection pool
            self.connection_pool = ConnectionPool.from_url(
                redis_url,
                max_connections=settings.redis_pool_size,
                retry_on_timeout=True,
                retry_on_error=[redis.ConnectionError, redis.TimeoutError],
                health_check_interval=30,
                decode_responses=True,
            )
            
            # Create Redis client
            self.redis_client = Redis(
                connection_pool=self.connection_pool,
                socket_connect_timeout=5,
                socket_timeout=5,
            )
            
            # Test connection
            await self.redis_client.ping()
            logger.info("Redis initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Redis: {e}")
            raise
    
    async def close(self) -> None:
        """Close Redis connections."""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Redis connections closed")
        
        if self.connection_pool:
            await self.connection_pool.disconnect()
    
    async def health_check(self) -> bool:
        """Check Redis connectivity."""
        try:
            if not self.redis_client:
                return False
            await self.redis_client.ping()
            return True
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return False
    
    # Cache Operations
    async def get(self, key: str) -> Optional[str]:
        """Get value from Redis."""
        if not self.redis_client:
            return None
        try:
            return await self.redis_client.get(key)
        except Exception as e:
            logger.error(f"Redis GET error: {e}")
            return None
    
    async def set(
        self,
        key: str,
        value: str,
        expire: Optional[int] = None
    ) -> bool:
        """Set value in Redis with optional expiration."""
        if not self.redis_client:
            return False
        try:
            return await self.redis_client.set(
                key,
                value,
                ex=expire or settings.cache_ttl
            )
        except Exception as e:
            logger.error(f"Redis SET error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from Redis."""
        if not self.redis_client:
            return False
        try:
            result = await self.redis_client.delete(key)
            return result > 0
        except Exception as e:
            logger.error(f"Redis DELETE error: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in Redis."""
        if not self.redis_client:
            return False
        try:
            return await self.redis_client.exists(key)
        except Exception as e:
            logger.error(f"Redis EXISTS error: {e}")
            return False
    
    async def expire(self, key: str, seconds: int) -> bool:
        """Set expiration time for key."""
        if not self.redis_client:
            return False
        try:
            return await self.redis_client.expire(key, seconds)
        except Exception as e:
            logger.error(f"Redis EXPIRE error: {e}")
            return False
    
    # JSON Operations
    async def get_json(self, key: str) -> Optional[Any]:
        """Get JSON value from Redis."""
        value = await self.get(key)
        if value is None:
            return None
        try:
            return json.loads(value)
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            return None
    
    async def set_json(
        self,
        key: str,
        value: Any,
        expire: Optional[int] = None
    ) -> bool:
        """Set JSON value in Redis."""
        try:
            json_value = json.dumps(value, default=str)
            return await self.set(key, json_value, expire)
        except (TypeError, json.JSONEncodeError) as e:
            logger.error(f"JSON encode error: {e}")
            return False
    
    # Hash Operations
    async def hset(self, name: str, mapping: dict) -> bool:
        """Set hash fields."""
        if not self.redis_client:
            return False
        try:
            await self.redis_client.hset(name, mapping=mapping)
            return True
        except Exception as e:
            logger.error(f"Redis HSET error: {e}")
            return False
    
    async def hget(self, name: str, key: str) -> Optional[str]:
        """Get hash field value."""
        if not self.redis_client:
            return None
        try:
            return await self.redis_client.hget(name, key)
        except Exception as e:
            logger.error(f"Redis HGET error: {e}")
            return None
    
    async def hgetall(self, name: str) -> dict:
        """Get all hash fields and values."""
        if not self.redis_client:
            return {}
        try:
            return await self.redis_client.hgetall(name)
        except Exception as e:
            logger.error(f"Redis HGETALL error: {e}")
            return {}
    
    # List Operations
    async def lpush(self, key: str, *values: str) -> bool:
        """Push values to the left of list."""
        if not self.redis_client:
            return False
        try:
            await self.redis_client.lpush(key, *values)
            return True
        except Exception as e:
            logger.error(f"Redis LPUSH error: {e}")
            return False
    
    async def rpop(self, key: str) -> Optional[str]:
        """Pop value from the right of list."""
        if not self.redis_client:
            return None
        try:
            return await self.redis_client.rpop(key)
        except Exception as e:
            logger.error(f"Redis RPOP error: {e}")
            return None
    
    async def lrange(self, key: str, start: int = 0, end: int = -1) -> list:
        """Get list range."""
        if not self.redis_client:
            return []
        try:
            return await self.redis_client.lrange(key, start, end)
        except Exception as e:
            logger.error(f"Redis LRANGE error: {e}")
            return []
    
    # Set Operations  
    async def sadd(self, key: str, *members: str) -> bool:
        """Add members to set."""
        if not self.redis_client:
            return False
        try:
            await self.redis_client.sadd(key, *members)
            return True
        except Exception as e:
            logger.error(f"Redis SADD error: {e}")
            return False
    
    async def sismember(self, key: str, member: str) -> bool:
        """Check if member exists in set."""
        if not self.redis_client:
            return False
        try:
            return await self.redis_client.sismember(key, member)
        except Exception as e:
            logger.error(f"Redis SISMEMBER error: {e}")
            return False
    
    # Pub/Sub Operations
    @asynccontextmanager
    async def pubsub(self):
        """Get Redis pub/sub context manager."""
        if not self.redis_client:
            raise RuntimeError("Redis not initialized")
        
        pubsub = self.redis_client.pubsub()
        try:
            yield pubsub
        finally:
            await pubsub.close()
    
    async def publish(self, channel: str, message: str) -> int:
        """Publish message to channel."""
        if not self.redis_client:
            return 0
        try:
            return await self.redis_client.publish(channel, message)
        except Exception as e:
            logger.error(f"Redis PUBLISH error: {e}")
            return 0
    
    # Rate Limiting
    async def rate_limit(
        self,
        key: str,
        limit: int,
        window: int,
        identifier: str = ""
    ) -> tuple[bool, int, int]:
        """
        Sliding window rate limiting.
        Returns (allowed, remaining, reset_time)
        """
        if not self.redis_client:
            return True, limit, 0
        
        try:
            rate_key = f"{settings.cache_namespace}:rate_limit:{key}:{identifier}"
            
            # Use Lua script for atomic operations
            lua_script = """
            local key = KEYS[1]
            local window = tonumber(ARGV[1])
            local limit = tonumber(ARGV[2])
            local now = tonumber(ARGV[3])
            
            -- Remove old entries
            redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
            
            -- Count current entries
            local current = redis.call('ZCARD', key)
            
            if current < limit then
                -- Add current request
                redis.call('ZADD', key, now, now)
                redis.call('EXPIRE', key, window)
                return {1, limit - current - 1, now + window}
            else
                return {0, 0, now + window}
            end
            """
            
            import time
            now = int(time.time())
            result = await self.redis_client.eval(
                lua_script,
                1,
                rate_key,
                window,
                limit,
                now
            )
            
            return bool(result[0]), result[1], result[2]
            
        except Exception as e:
            logger.error(f"Rate limiting error: {e}")
            return True, limit, 0  # Fail open


# Global Redis manager instance
redis_manager = RedisManager()


async def get_redis() -> Redis:
    """FastAPI dependency to get Redis client."""
    if not redis_manager.redis_client:
        raise RuntimeError("Redis not initialized")
    return redis_manager.redis_client


async def init_redis() -> None:
    """Initialize Redis connection."""
    await redis_manager.initialize()


async def close_redis() -> None:
    """Close Redis connections."""
    await redis_manager.close()