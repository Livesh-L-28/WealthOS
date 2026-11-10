"""WealthOS Redis Infrastructure.

Manages async Redis connection pool for caching, rate limiting, and session state.
"""

import redis.asyncio as aioredis

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("wealthos.redis")

_redis_client: aioredis.Redis | None = None


async def init_redis() -> aioredis.Redis:
    """Initialize the Redis connection pool."""
    global _redis_client
    if _redis_client is None:
        redis_url = settings.get_redis_url()
        logger.info(
            f"Connecting to Redis at {settings.REDIS_HOST}:{settings.REDIS_PORT} (db={settings.REDIS_DB})"
        )
        _redis_client = aioredis.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True,
            socket_timeout=5.0,
            socket_connect_timeout=5.0,
            max_connections=50,
        )
    return _redis_client


async def close_redis() -> None:
    """Close the Redis connection pool."""
    global _redis_client
    if _redis_client is not None:
        logger.info("Closing Redis connection pool...")
        await _redis_client.aclose()
        _redis_client = None
        logger.info("Redis connection pool closed")


async def get_redis() -> aioredis.Redis:
    """FastAPI dependency or internal accessor for Redis client."""
    if _redis_client is None:
        return await init_redis()
    return _redis_client


async def check_redis_health() -> dict:
    """Check Redis server health via PING."""
    try:
        client = await get_redis()
        pong = await client.ping()
        if pong is True:
            return {"status": "healthy"}
        return {"status": "degraded", "response": str(pong)}
    except Exception as exc:
        logger.warning(f"Redis health check failed: {exc}")
        return {"status": "unhealthy", "error": str(exc)}
