"""WealthOS Background Health & Diagnostic Tasks.

Runnable verification tasks for worker daemon queues (default, ocr_heavy, market_data).
"""

from datetime import UTC, datetime
from typing import Any

from app.core.logging import get_logger
from app.infrastructure.celery_app import celery_app
from app.infrastructure.storage import check_storage_health

logger = get_logger("wealthos.workers.health")


@celery_app.task(name="app.workers.health_tasks.health_ping", bind=True)
def health_ping(self, payload: str = "ping") -> dict[str, Any]:
    """Diagnostic task executed on the default worker queue."""
    logger.info(f"Executing health_ping on default worker, payload={payload}")
    return {
        "status": "pong",
        "task_id": self.request.id,
        "payload": payload,
        "queue": "default",
        "timestamp": datetime.now(UTC).isoformat(),
    }


@celery_app.task(name="app.workers.health_tasks.ocr_preflight_check", bind=True)
def ocr_preflight_check(self) -> dict[str, Any]:
    """Preflight diagnostic executed on the OCR-heavy worker queue.

    Verifies object storage accessibility and OCR pipeline worker readiness.
    """
    logger.info(f"Executing ocr_preflight_check on ocr_heavy worker, task_id={self.request.id}")
    storage_status = check_storage_health()
    return {
        "status": "ready",
        "queue": "ocr_heavy",
        "storage": storage_status,
        "task_id": self.request.id,
        "timestamp": datetime.now(UTC).isoformat(),
    }


@celery_app.task(name="app.workers.health_tasks.market_feed_heartbeat", bind=True)
def market_feed_heartbeat(self) -> dict[str, Any]:
    """Diagnostic heartbeat executed on the market data worker queue."""
    logger.info(f"Executing market_feed_heartbeat on market_data worker, task_id={self.request.id}")
    return {
        "status": "active",
        "queue": "market_data",
        "task_id": self.request.id,
        "timestamp": datetime.now(UTC).isoformat(),
    }
