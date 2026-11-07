"""Tests for Celery Application, Queues, and Tasks."""

from unittest.mock import AsyncMock, patch

import pytest

from app.infrastructure.celery_app import (
    acquire_task_lock,
    celery_app,
    check_celery_health,
    create_celery_app,
    release_task_lock,
)
from app.workers.health_tasks import health_ping, market_feed_heartbeat, ocr_preflight_check


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
async def test_task_idempotency_locking():
    mock_redis = AsyncMock()
    mock_redis.set.return_value = True

    # Lock acquired successfully
    acquired = await acquire_task_lock(mock_redis, "task-123", timeout_seconds=60)
    assert acquired is True
    mock_redis.set.assert_called_once_with("task_lock:task-123", "locked", nx=True, ex=60)

    # Release lock
    await release_task_lock(mock_redis, "task-123")
    mock_redis.delete.assert_called_once_with("task_lock:task-123")


def test_check_celery_health():
    with patch.object(celery_app, "connection") as mock_conn:
        mock_instance = mock_conn.return_value
        status = check_celery_health()
        assert status["status"] == "healthy"
        mock_instance.connect.assert_called_once()
        mock_instance.release.assert_called_once()
