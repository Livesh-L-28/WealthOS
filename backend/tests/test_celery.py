"""Tests for Celery Application and Tasks."""

from unittest.mock import patch

from app.infrastructure.celery_app import celery_app
from app.workers.health_tasks import health_ping, market_feed_heartbeat, ocr_preflight_check


def test_celery_configuration():
    assert celery_app.main == "wealthos_tasks"
    assert "default" in [q.name for q in celery_app.conf.task_queues]
    assert "ocr_heavy" in [q.name for q in celery_app.conf.task_queues]
    assert "market_data" in [q.name for q in celery_app.conf.task_queues]


def test_health_ping_task():
    # Test task via .run()
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
