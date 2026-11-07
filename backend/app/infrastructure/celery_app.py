"""WealthOS Celery Asynchronous Task Architecture.

Configures distributed task processing with isolated queues for OCR processing,
market data feeds, and transactional notifications.
"""

from celery import Celery
from kombu import Exchange, Queue

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("wealthos.celery")

# Initialize Celery app
celery_app = Celery(
    "wealthos_tasks",
    broker=settings.get_celery_broker_url(),
    backend=settings.get_celery_result_backend(),
)

# Queue definitions
default_exchange = Exchange("wealthos_default", type="direct")
ocr_exchange = Exchange("wealthos_ocr", type="direct")
market_exchange = Exchange("wealthos_market", type="direct")

celery_app.conf.update(
    task_queues=(
        Queue("default", default_exchange, routing_key="default"),
        Queue("ocr_heavy", ocr_exchange, routing_key="ocr_heavy"),
        Queue("market_data", market_exchange, routing_key="market_data"),
    ),
    task_default_queue="default",
    task_default_exchange="wealthos_default",
    task_default_routing_key="default",
    # Task routing
    task_routes={
        "app.workers.health_tasks.health_ping": {"queue": "default"},
        "app.workers.health_tasks.ocr_preflight_check": {"queue": "ocr_heavy"},
        "app.workers.health_tasks.market_feed_heartbeat": {"queue": "market_data"},
    },
    # Serialization & Security
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    # Execution safety
    task_track_started=True,
    task_time_limit=300,  # 5 minutes maximum for heavy OCR tasks
    task_soft_time_limit=270,
    worker_prefetch_multiplier=1,  # Fair distribution among workers
    worker_max_tasks_per_child=100,  # Prevent memory leaks
)

# Autodiscover worker tasks
celery_app.autodiscover_tasks(["app.workers"])


def check_celery_health() -> dict:
    """Check connectivity to the Celery broker (Redis)."""
    try:
        # Check broker connection by inspecting broker connection pool
        conn = celery_app.connection()
        conn.connect()
        conn.release()
        return {"status": "healthy", "broker": "connected"}
    except Exception as exc:
        logger.warning(f"Celery health check failed: {exc}")
        return {"status": "unhealthy", "error": str(exc)}

