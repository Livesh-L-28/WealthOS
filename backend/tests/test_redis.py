"""Tests for Redis Authentication and Client Lifecycle."""

from unittest.mock import AsyncMock, patch

import pytest
from redis.exceptions import AuthenticationError

from app.infrastructure.redis import (
    check_redis_health,
    close_redis,
    get_redis,
    init_redis,
)


@pytest.mark.asyncio
async def test_redis_unauthenticated_connection_rejected():
    """Verify that unauthenticated connection to a password-protected Redis fails."""
    # Simulate a Redis server requiring auth when client connects without credentials
    mock_client = AsyncMock()
    mock_client.ping.side_effect = AuthenticationError("NOAUTH Authentication required.")

    with patch("redis.asyncio.from_url", return_value=mock_client):
        # Explicitly reset global client
        await close_redis()

        with pytest.raises(AuthenticationError, match="NOAUTH Authentication required."):
            client = await init_redis()
            await client.ping()


@pytest.mark.asyncio
async def test_redis_authenticated_connection_succeeds():
    """Verify that authenticated connection successfully pings Redis."""
    mock_client = AsyncMock()
    mock_client.ping.return_value = True

    with patch("redis.asyncio.from_url", return_value=mock_client):
        await close_redis()
        client = await init_redis()
        result = await client.ping()
        assert result is True


@pytest.mark.asyncio
async def test_check_redis_health_reports_degraded_on_auth_failure():
    """Verify check_redis_health returns unhealthy when authentication fails."""
    mock_client = AsyncMock()
    mock_client.ping.side_effect = AuthenticationError("WRONGPASS invalid username-password pair")

    with patch("app.infrastructure.redis.get_redis", return_value=mock_client):
        health = await check_redis_health()
        assert health["status"] == "unhealthy"
        assert "invalid username-password" in health["error"]


@pytest.mark.asyncio
async def test_redis_singleton_lifecycle():
    """Verify get_redis reuses single pool and close_redis tears it down cleanly."""
    mock_client = AsyncMock()
    mock_client.aclose = AsyncMock()

    with patch("redis.asyncio.from_url", return_value=mock_client):
        await close_redis()
        client1 = await get_redis()
        client2 = await get_redis()
        assert client1 is client2
        await close_redis()
        mock_client.aclose.assert_awaited_once()
