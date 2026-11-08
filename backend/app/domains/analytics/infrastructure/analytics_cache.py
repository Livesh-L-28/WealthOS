"""WealthOS Tenant-Isolated Analytics Cache Infrastructure."""

import hashlib
import json
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from app.core.logging import get_logger
from app.infrastructure.redis import get_redis

logger = get_logger("wealthos.analytics.cache")

DEFAULT_CACHE_TTL_SECONDS = 300  # 5 minutes


class DecimalEncoder(json.JSONEncoder):
    """JSON Encoder that converts Decimals, dates, UUIDs and enums to string representations."""

    def default(self, obj: Any) -> Any:
        if isinstance(obj, Decimal):
            return str(obj)
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        if isinstance(obj, uuid.UUID):
            return str(obj)
        if hasattr(obj, "value"):
            return obj.value
        return super().default(obj)


class AnalyticsCache:
    """Manages tenant-isolated, household-scoped caching of analytics responses."""

    @staticmethod
    def build_cache_key(
        tenant_id: uuid.UUID,
        scope: str,
        metric_key: str,
        params: dict[str, Any],
    ) -> str:
        """Constructs a deterministic, tenant-isolated cache key."""
        sorted_params = json.dumps(params, sort_keys=True, cls=DecimalEncoder)
        params_hash = hashlib.sha256(sorted_params.encode("utf-8")).hexdigest()[:16]
        return f"analytics:tenant:{tenant_id}:scope:{scope}:metric:{metric_key}:{params_hash}"

    @classmethod
    async def get(
        cls,
        tenant_id: uuid.UUID,
        scope: str,
        metric_key: str,
        params: dict[str, Any],
    ) -> dict[str, Any] | None:
        """Retrieves cached analytics payload if present."""
        try:
            redis = await get_redis()
            key = cls.build_cache_key(tenant_id, scope, metric_key, params)
            cached_raw = await redis.get(key)
            if cached_raw:
                logger.debug(f"Cache hit for key {key}")
                return json.loads(cached_raw)
            return None
        except Exception as e:
            logger.warning(f"Analytics cache get failed (failing open): {e}")
            return None

    @classmethod
    async def set(
        cls,
        tenant_id: uuid.UUID,
        scope: str,
        metric_key: str,
        params: dict[str, Any],
        payload: dict[str, Any],
        ttl_seconds: int = DEFAULT_CACHE_TTL_SECONDS,
    ) -> None:
        """Stores analytics payload in Redis with explicit expiration."""
        try:
            redis = await get_redis()
            key = cls.build_cache_key(tenant_id, scope, metric_key, params)
            serialized = json.dumps(payload, cls=DecimalEncoder)
            await redis.set(key, serialized, ex=ttl_seconds)
            logger.debug(f"Cached analytics for key {key} (TTL={ttl_seconds}s)")
        except Exception as e:
            logger.warning(f"Analytics cache set failed: {e}")

    @classmethod
    async def invalidate_tenant(cls, tenant_id: uuid.UUID) -> int:
        """Invalidates all cached analytics for a specific tenant on data mutation."""
        try:
            redis = await get_redis()
            pattern = f"analytics:tenant:{tenant_id}:*"
            keys = await redis.keys(pattern)
            if keys:
                deleted_count = await redis.delete(*keys)
                logger.info(f"Invalidated {deleted_count} analytics cache entries for tenant {tenant_id}")
                return deleted_count
            return 0
        except Exception as e:
            logger.warning(f"Analytics cache invalidation failed: {e}")
            return 0
