"""WealthOS Redis Infrastructure & Resilient In-Memory Fallback Engine.

Manages async Redis connection pool for caching, rate limiting, and session state.
Provides an enterprise-grade in-memory TTL fallback when running in local development
or when an external Redis cluster is temporarily unreachable.
"""

import asyncio
import time
from typing import Any

import redis.asyncio as aioredis

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("wealthos.redis")

_redis_client: Any = None
_is_fallback_active: bool = False


class InMemoryPipeline:
    """Async pipeline emulator for InMemoryRedisFallback."""

    def __init__(self, fallback: 'InMemoryRedisFallback'):
        self._fallback = fallback
        self._commands: list[tuple[str, tuple, dict]] = []

    def zremrangebyscore(self, key: str, min_score: float, max_score: float) -> 'InMemoryPipeline':
        self._commands.append(('zremrangebyscore', (key, min_score, max_score), {}))
        return self

    def zadd(self, key: str, mapping: dict[str, float]) -> 'InMemoryPipeline':
        self._commands.append(('zadd', (key, mapping), {}))
        return self

    def zcard(self, key: str) -> 'InMemoryPipeline':
        self._commands.append(('zcard', (key,), {}))
        return self

    def expire(self, key: str, seconds: int) -> 'InMemoryPipeline':
        self._commands.append(('expire', (key, seconds), {}))
        return self

    async def execute(self) -> list[Any]:
        results = []
        for cmd_name, args, kwargs in self._commands:
            fn = getattr(self._fallback, cmd_name)
            res = await fn(*args, **kwargs)
            results.append(res)
        return results


class InMemoryRedisFallback:
    """Thread-safe async in-memory key-value cache with TTL expiration.

    Guarantees seamless offline/local development without external Redis dependencies.
    """

    def __init__(self):
        self._store: dict[str, tuple[str, float | None]] = {}
        self._zsets: dict[str, dict[str, float]] = {}
        self._lock = asyncio.Lock()

    def pipeline(self) -> 'InMemoryPipeline':
        return InMemoryPipeline(self)

    async def zremrangebyscore(self, key: str, min_score: float, max_score: float) -> int:
        async with self._lock:
            if key not in self._zsets:
                return 0
            z = self._zsets[key]
            to_remove = [m for m, score in z.items() if min_score <= score <= max_score]
            for m in to_remove:
                del z[m]
            return len(to_remove)

    async def zadd(self, key: str, mapping: dict[str, float]) -> int:
        async with self._lock:
            if key not in self._zsets:
                self._zsets[key] = {}
            added = 0
            for m, score in mapping.items():
                if m not in self._zsets[key]:
                    added += 1
                self._zsets[key][m] = float(score)
            return added

    async def zcard(self, key: str) -> int:
        async with self._lock:
            return len(self._zsets.get(key, {}))

    def _cleanup_expired(self, key: str) -> bool:
        """Return True if key exists and is valid, False if expired or missing."""
        if key not in self._store:
            return False
        val, expiry = self._store[key]
        if expiry is not None and time.time() > expiry:
            del self._store[key]
            return False
        return True

    async def ping(self) -> bool:
        return True

    async def get(self, name: str) -> str | None:
        async with self._lock:
            if not self._cleanup_expired(name):
                return None
            return self._store[name][0]

    async def set(
        self,
        name: str,
        value: Any,
        ex: int | None = None,
        px: int | None = None,
        nx: bool = False,
        xx: bool = False,
    ) -> bool:
        async with self._lock:
            exists = self._cleanup_expired(name)
            if nx and exists:
                return False
            if xx and not exists:
                return False

            expiry_ts: float | None = None
            if ex is not None:
                expiry_ts = time.time() + ex
            elif px is not None:
                expiry_ts = time.time() + (px / 1000.0)

            self._store[name] = (str(value), expiry_ts)
            return True

    async def setex(self, name: str, time_sec: int, value: Any) -> bool:
        return await self.set(name, value, ex=time_sec)

    async def delete(self, *names: str) -> int:
        async with self._lock:
            count = 0
            for k in names:
                if self._cleanup_expired(k):
                    del self._store[k]
                    count += 1
            return count

    async def exists(self, *names: str) -> int:
        async with self._lock:
            count = 0
            for k in names:
                if self._cleanup_expired(k):
                    count += 1
            return count

    async def expire(self, name: str, time_sec: int) -> bool:
        async with self._lock:
            if not self._cleanup_expired(name):
                return False
            val, _ = self._store[name]
            self._store[name] = (val, time.time() + time_sec)
            return True

    async def ttl(self, name: str) -> int:
        async with self._lock:
            if not self._cleanup_expired(name):
                return -2
            _, expiry = self._store[name]
            if expiry is None:
                return -1
            remaining = int(expiry - time.time())
            return max(0, remaining)

    async def incr(self, name: str, amount: int = 1) -> int:
        async with self._lock:
            exists = self._cleanup_expired(name)
            current_val = int(self._store[name][0]) if exists else 0
            new_val = current_val + amount
            expiry = self._store[name][1] if exists else None
            self._store[name] = (str(new_val), expiry)
            return new_val

    async def decr(self, name: str, amount: int = 1) -> int:
        return await self.incr(name, -amount)

    async def incrby(self, name: str, amount: int) -> int:
        return await self.incr(name, amount)

    async def decrby(self, name: str, amount: int) -> int:
        return await self.incr(name, -amount)

    async def sadd(self, name: str, *values: Any) -> int:
        async with self._lock:
            exists = self._cleanup_expired(name)
            current_set: set[str] = set()
            expiry = None
            if exists:
                try:
                    import json
                    current_set = set(json.loads(self._store[name][0]))
                    expiry = self._store[name][1]
                except Exception:
                    current_set = set()
            added = 0
            for v in values:
                str_v = str(v)
                if str_v not in current_set:
                    current_set.add(str_v)
                    added += 1
            import json
            self._store[name] = (json.dumps(list(current_set)), expiry)
            return added

    async def smembers(self, name: str) -> set[str]:
        async with self._lock:
            if not self._cleanup_expired(name):
                return set()
            try:
                import json
                return set(json.loads(self._store[name][0]))
            except Exception:
                return set()

    async def sismember(self, name: str, value: Any) -> bool:
        members = await self.smembers(name)
        return str(value) in members

    async def srem(self, name: str, *values: Any) -> int:
        async with self._lock:
            if not self._cleanup_expired(name):
                return 0
            try:
                import json
                current_set = set(json.loads(self._store[name][0]))
                expiry = self._store[name][1]
                removed = 0
                for v in values:
                    str_v = str(v)
                    if str_v in current_set:
                        current_set.remove(str_v)
                        removed += 1
                self._store[name] = (json.dumps(list(current_set)), expiry)
                return removed
            except Exception:
                return 0

    async def hset(self, name: str, key: str | None = None, value: Any = None, mapping: dict | None = None) -> int:
        async with self._lock:
            exists = self._cleanup_expired(name)
            current_dict: dict[str, str] = {}
            expiry = None
            if exists:
                try:
                    import json
                    current_dict = json.loads(self._store[name][0])
                    expiry = self._store[name][1]
                except Exception:
                    current_dict = {}
            added = 0
            to_add = {}
            if mapping:
                to_add.update(mapping)
            if key is not None and value is not None:
                to_add[str(key)] = str(value)
            for k, v in to_add.items():
                if str(k) not in current_dict:
                    added += 1
                current_dict[str(k)] = str(v)
            import json
            self._store[name] = (json.dumps(current_dict), expiry)
            return added

    async def hget(self, name: str, key: str) -> str | None:
        async with self._lock:
            if not self._cleanup_expired(name):
                return None
            try:
                import json
                current_dict = json.loads(self._store[name][0])
                return current_dict.get(str(key))
            except Exception:
                return None

    async def hgetall(self, name: str) -> dict[str, str]:
        async with self._lock:
            if not self._cleanup_expired(name):
                return {}
            try:
                import json
                return json.loads(self._store[name][0])
            except Exception:
                return {}

    async def hdel(self, name: str, *keys: str) -> int:
        async with self._lock:
            if not self._cleanup_expired(name):
                return 0
            try:
                import json
                current_dict = json.loads(self._store[name][0])
                expiry = self._store[name][1]
                removed = 0
                for k in keys:
                    if str(k) in current_dict:
                        del current_dict[str(k)]
                        removed += 1
                self._store[name] = (json.dumps(current_dict), expiry)
                return removed
            except Exception:
                return 0

    async def aclose(self) -> None:
        async with self._lock:
            self._store.clear()


async def init_redis() -> Any:
    """Initialize the Redis connection pool, falling back to in-memory store if unreachable."""
    global _redis_client, _is_fallback_active
    if _redis_client is None:
        redis_url = settings.get_redis_url()
        try:
            logger.info(
                f"Attempting Redis connection at {settings.REDIS_HOST}:{settings.REDIS_PORT} (db={settings.REDIS_DB})..."
            )
            client = aioredis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_timeout=1.5,
                socket_connect_timeout=1.5,
                max_connections=50,
            )
            # Verify connectivity with an immediate ping probe
            await client.ping()
            _redis_client = client
            _is_fallback_active = False
            logger.info("Connected to remote Redis server successfully")
        except Exception as exc:
            if settings.is_production:
                raise
            logger.warning(
                f"Remote Redis unavailable ({exc}). Activating high-performance In-Memory Redis Fallback Engine."
            )
            _redis_client = InMemoryRedisFallback()
            _is_fallback_active = True

    return _redis_client


async def close_redis() -> None:
    """Close the Redis connection pool or clear in-memory store."""
    global _redis_client, _is_fallback_active
    if _redis_client is not None:
        logger.info("Closing Redis connection pool / in-memory store...")
        await _redis_client.aclose()
        _redis_client = None
        _is_fallback_active = False
        logger.info("Redis resources released successfully")


async def get_redis() -> Any:
    """FastAPI dependency or internal accessor for Redis client."""
    if _redis_client is None:
        return await init_redis()
    return _redis_client


async def check_redis_health() -> dict:
    """Check Redis health with telemetry on active engine (remote or in-memory)."""
    try:
        client = await get_redis()
        pong = await client.ping()
        if pong is True:
            return {
                "status": "healthy",
                "engine": "in_memory_fallback" if _is_fallback_active else "redis_cluster",
                "fallback_active": _is_fallback_active,
            }
        return {"status": "degraded", "response": str(pong)}
    except Exception as exc:
        logger.warning(f"Redis health check failed: {exc}")
        return {"status": "unhealthy", "error": str(exc)}
