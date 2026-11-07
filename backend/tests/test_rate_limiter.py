"""Tests for Hardened Rate Limiter: Proxy Trust, Fail-Closed Protection, and Threshold Enforcement."""

from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.core.security import RateLimiter
from app.infrastructure.redis import get_redis


class MockAppState:
    enable_rate_limiting_tests = True


class MockApp:
    state = MockAppState()


class MockRequest:
    def __init__(self, client_host: str = "127.0.0.1", headers: dict | None = None):
        self.client = type("Client", (), {"host": client_host})()
        self.headers = headers or {}
        self.app = MockApp()


@pytest.mark.asyncio
async def test_spoofed_x_forwarded_for_from_untrusted_proxy():
    """Verify that X-Forwarded-For is ignored when request does NOT originate from TRUSTED_PROXIES."""
    limiter = RateLimiter(max_requests=5, prefix="test_spoof")
    redis = await get_redis()
    await redis.delete("ratelimit:test_spoof:203.0.113.88", "ratelimit:test_spoof:198.51.100.99")

    # Untrusted client 203.0.113.88 attempts to spoof header
    untrusted_req = MockRequest(
        client_host="203.0.113.88",
        headers={"X-Forwarded-For": "198.51.100.99"},
    )

    await limiter(untrusted_req)

    # Real Redis must record under the actual peer IP, NOT the spoofed header
    real_count = await redis.zcard("ratelimit:test_spoof:203.0.113.88")
    spoofed_count = await redis.zcard("ratelimit:test_spoof:198.51.100.99")

    assert real_count == 1
    assert spoofed_count == 0


@pytest.mark.asyncio
async def test_trusted_proxy_x_forwarded_for_resolution():
    """Verify that X-Forwarded-For IS honored when request originates from a TRUSTED_PROXIES address."""
    limiter = RateLimiter(max_requests=5, prefix="test_trusted")
    redis = await get_redis()
    await redis.delete("ratelimit:test_trusted:203.0.113.50", "ratelimit:test_trusted:127.0.0.1")

    # 127.0.0.1 is in TRUSTED_PROXIES
    trusted_req = MockRequest(
        client_host="127.0.0.1",
        headers={"X-Forwarded-For": "203.0.113.50, 10.0.0.1"},
    )

    await limiter(trusted_req)

    # Real Redis must record under the client IP from the trusted proxy header
    client_count = await redis.zcard("ratelimit:test_trusted:203.0.113.50")
    proxy_count = await redis.zcard("ratelimit:test_trusted:127.0.0.1")

    assert client_count == 1
    assert proxy_count == 0


@pytest.mark.asyncio
async def test_rate_limiter_window_exhaustion_returns_429():
    """Verify that exceeding the rate limit threshold returns HTTP 429 with Retry-After header."""
    limiter = RateLimiter(
        max_requests=3, window_seconds=60, prefix="test_exhaust", fail_closed=True
    )
    redis = await get_redis()
    await redis.delete("ratelimit:test_exhaust:203.0.113.10")

    req = MockRequest(client_host="203.0.113.10")

    # Requests 1, 2, 3 succeed
    for _ in range(3):
        await limiter(req)

    # 4th request must be rejected with 429
    with pytest.raises(HTTPException) as exc_info:
        await limiter(req)

    assert exc_info.value.status_code == 429
    assert "too many requests" in exc_info.value.detail.lower()
    assert exc_info.value.headers.get("Retry-After") == "60"


@pytest.mark.asyncio
async def test_rate_limiter_fail_closed_on_redis_outage():
    """Verify that sensitive auth limiter fails closed (HTTP 503) when Redis is unreachable."""
    fail_closed_limiter = RateLimiter(max_requests=10, prefix="test_failclosed", fail_closed=True)
    req = MockRequest(client_host="127.0.0.1")

    with patch("app.core.security.get_redis") as mock_redis:
        mock_redis.side_effect = Exception("Redis cluster connection refused")
        with pytest.raises(HTTPException) as exc_info:
            await fail_closed_limiter(req)

        assert exc_info.value.status_code == 503
        assert "temporarily unavailable" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_rate_limiter_fail_open_on_non_sensitive_endpoint():
    """Verify that non-sensitive rate limiter fails open when configured with fail_closed=False."""
    fail_open_limiter = RateLimiter(max_requests=10, prefix="test_failopen", fail_closed=False)
    req = MockRequest(client_host="127.0.0.1")

    with patch("app.core.security.get_redis") as mock_redis:
        mock_redis.side_effect = Exception("Redis cluster connection refused")
        # Should not raise any exception
        await fail_open_limiter(req)
