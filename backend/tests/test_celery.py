"""Tests for Celery Application, Queues, Tasks, and Distributed Locking."""

from unittest.mock import AsyncMock, patch

import pytest
from celery.exceptions import Retry

from app.infrastructure.celery_app import (
    RELEASE_LOCK_LUA_SCRIPT,
    CeleryLockError,
    acquire_task_lock,
    celery_app,
    check_celery_health,
    create_celery_app,
    release_task_lock,
)
from app.workers.health_tasks import (
    health_ping,
    market_feed_heartbeat,
    ocr_preflight_check,
    transient_retry_task,
)


def test_celery_configuration():
    assert celery_app.main == "wealthos_tasks"
    assert "default" in [q.name for q in celery_app.conf.task_queues]
    assert "ocr_heavy" in [q.name for q in celery_app.conf.task_queues]
    assert "market_data" in [q.name for q in celery_app.conf.task_queues]


def test_create_celery_app_factory():
    custom_app = create_celery_app()
    assert custom_app.main == "wealthos_tasks"
    assert custom_app.conf.task_default_queue == "default"


def test_health_ping_task():
    result = health_ping.run(payload="test-ping")
    assert result["status"] == "pong"
    assert result["payload"] == "test-ping"
    assert result["queue"] == "default"
    assert "timestamp" in result


def test_transient_retry_task_failure_and_success():
    """Verify task raises Retry when attempts are below threshold, and succeeds when met."""
    # Attempt 1 of 2 triggers Celery retry exception
    with pytest.raises(Retry, match="Simulated transient error on attempt 1"):
        transient_retry_task.apply(kwargs={"fail_until_attempt": 2}, throw=True)

    # Attempt 1 of 1 succeeds immediately
    result = transient_retry_task.apply(kwargs={"fail_until_attempt": 1}).result
    assert result["status"] == "recovered"
    assert result["attempts_made"] == 1
    assert result["queue"] == "default"


def test_market_feed_heartbeat_task():
    result = market_feed_heartbeat.run()
    assert result["status"] == "active"
    assert result["queue"] == "market_data"
    assert "timestamp" in result


def test_ocr_preflight_check_task():
    with patch("app.workers.health_tasks.check_storage_health") as mock_storage:
        mock_storage.return_value = {"status": "healthy"}
        result = ocr_preflight_check.run()
        assert result["status"] == "ready"
        assert result["queue"] == "ocr_heavy"
        assert result["storage"]["status"] == "healthy"


@pytest.mark.asyncio
async def test_task_idempotency_locking_success():
    """Test distributed lock acquisition and atomic Lua release with matching owner."""
    mock_redis = AsyncMock()
    mock_redis.set.return_value = True
    mock_redis.eval.return_value = 1  # Lua returns 1 on successful match and delete

    owner_token = "worker-node-1:thread-9:uuid-abc"
    acquired = await acquire_task_lock(mock_redis, "task-123", owner_token, timeout_seconds=60)
    assert acquired is True
    mock_redis.set.assert_called_once_with("task_lock:task-123", owner_token, nx=True, ex=60)

    # Atomic release with matching owner token
    released = await release_task_lock(mock_redis, "task-123", owner_token)
    assert released is True
    mock_redis.eval.assert_called_once_with(
        RELEASE_LOCK_LUA_SCRIPT, 1, "task_lock:task-123", owner_token
    )


@pytest.mark.asyncio
async def test_task_idempotency_locking_conflict_and_mismatch():
    """Test lock contention (already held) and release mismatch (owner token does not match)."""
    mock_redis = AsyncMock()
    # Already held by another worker
    mock_redis.set.return_value = False
    acquired = await acquire_task_lock(mock_redis, "task-123", "worker-2:token", timeout_seconds=60)
    assert acquired is False

    # Owner token mismatch on release (e.g. lock expired and was reacquired by another process)
    mock_redis.eval.return_value = 0
    released = await release_task_lock(mock_redis, "task-123", "stale-worker-token")
    assert released is False


@pytest.mark.asyncio
async def test_task_idempotency_locking_fail_closed():
    """Test fail-closed behavior: Redis errors raise CeleryLockError to protect financial ledger."""
    mock_redis = AsyncMock()
    mock_redis.set.side_effect = ConnectionError("Redis cluster unreachable")
    mock_redis.eval.side_effect = ConnectionError("Redis cluster unreachable")

    with pytest.raises(CeleryLockError, match="Redis lock verification failed"):
        await acquire_task_lock(mock_redis, "task-999", "owner-token")

    with pytest.raises(CeleryLockError, match="Cannot guarantee safe lock release"):
        await release_task_lock(mock_redis, "task-999", "owner-token")


def test_check_celery_health():
    with patch.object(celery_app, "connection") as mock_conn:
        mock_instance = mock_conn.return_value
        status = check_celery_health()
        assert status["status"] == "healthy"
        mock_instance.connect.assert_called_once()
        mock_instance.release.assert_called_once()

    # Unhealthy state when connection fails
    with patch.object(celery_app, "connection") as mock_conn:
        mock_instance = mock_conn.return_value
        mock_instance.connect.side_effect = Exception("Connection refused to Redis broker")
        status = check_celery_health()
        assert status["status"] == "unhealthy"
        assert "Connection refused" in status["error"]
