"""WealthOS Celery Asynchronous Task Architecture.

Configures distributed task processing with isolated queues for OCR processing,
market data feeds, and transactional notifications.
Includes worker retry policies, task failure handling, and idempotency foundations.
"""

from celery import Celery
from celery.signals import task_failure, worker_shutting_down
from kombu import Exchange, Queue

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("wealthos.celery")


def create_celery_app() -> Celery:
    """Application factory for configuring Celery worker instances."""
    app = Celery(
        "wealthos_tasks",
        broker=settings.get_celery_broker_url(),
        backend=settings.get_celery_result_backend(),
    )

    # Queue definitions
    default_exchange = Exchange("wealthos_default", type="direct")
    ocr_exchange = Exchange("wealthos_ocr", type="direct")
    market_exchange = Exchange("wealthos_market", type="direct")

    app.conf.update(
        task_queues=(
            Queue("default", default_exchange, routing_key="default"),
            Queue("ocr_heavy", ocr_exchange, routing_key="ocr_heavy"),
            Queue("market_data", market_exchange, routing_key="market_data"),
        ),
        task_default_queue="default",
        task_default_exchange="wealthos_default",
        task_default_routing_key="default",
        # Task routing configuration
        task_routes={
            "app.workers.health_tasks.health_ping": {"queue": "default"},
            "app.workers.health_tasks.ocr_preflight_check": {"queue": "ocr_heavy"},
            "app.workers.health_tasks.market_feed_heartbeat": {"queue": "market_data"},
        },
        # Task retry & resilience policy
        task_annotations={
            "*": {
                "max_retries": 3,
                "default_retry_delay": 5,
                "retry_backoff": True,
                "retry_backoff_max": 60,
                "retry_jitter": True,
            }
        },
        # Serialization & Security
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        timezone="UTC",
        enable_utc=True,
        # Execution limits
        task_track_started=True,
        task_time_limit=300,  # 5 minutes maximum hard limit
        task_soft_time_limit=270,  # 4.5 minutes soft limit
        worker_prefetch_multiplier=1,  # Fair task distribution
        worker_max_tasks_per_child=100,  # Prevent memory leaks
        task_acks_late=True,  # Prevent task loss on worker crash
        task_reject_on_worker_lost=True,
    )

    # Autodiscover worker tasks in workers package
    app.autodiscover_tasks(["app.workers"])

    return app


celery_app = create_celery_app()


@task_failure.connect
def handle_task_failure(task_id, exception, args, kwargs, traceback, einfo, **extra):
    """Structured failure logging for failed Celery tasks."""
    logger.error(
        f"Celery task failure: task_id={task_id}, exception={exception}",
        extra={"task_id": task_id, "exception": str(exception)},
    )


@worker_shutting_down.connect
def handle_worker_shutdown(sig, how, exitcode, **extra):
    """Signal handler for graceful worker shutdown."""
    logger.info(
        f"Celery worker shutting down gracefully: signal={sig}, how={how}, exitcode={exitcode}"
    )


async def acquire_task_lock(redis_client, lock_key: str, timeout_seconds: int = 300) -> bool:
    """Idempotency foundation: acquire a distributed lock to prevent duplicate task execution.

    Returns True if the lock was acquired, False if the task is already being processed.
    """
    try:
        # SET NX EX pattern for distributed locking
        acquired = await redis_client.set(
            f"task_lock:{lock_key}", "locked", nx=True, ex=timeout_seconds
        )
        return bool(acquired)
    except Exception as exc:
        logger.warning(f"Failed to acquire task lock for {lock_key}: {exc}")
        return True  # Fail open to allow task to execute if lock check is down


async def release_task_lock(redis_client, lock_key: str) -> None:
    """Release a previously acquired task lock."""
    try:
        await redis_client.delete(f"task_lock:{lock_key}")
    except Exception as exc:
        logger.warning(f"Failed to release task lock for {lock_key}: {exc}")


def check_celery_health() -> dict:
    """Check connectivity to the Celery broker (Redis)."""
    try:
        conn = celery_app.connection()
        conn.connect()
        conn.release()
        return {"status": "healthy", "broker": "connected"}
    except Exception as exc:
        logger.warning(f"Celery health check failed: {exc}")
        return {"status": "unhealthy", "error": str(exc)}
