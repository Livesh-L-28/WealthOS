"""WealthOS Celery Asynchronous Task Architecture.

Configures distributed task processing with isolated queues for OCR processing,
market data feeds, and transactional notifications.
Includes worker retry policies, fail-closed idempotency locking, atomic compare-and-delete,
and structured failure handling.
"""

from celery import Celery
from celery.signals import task_failure, worker_shutting_down
from kombu import Exchange, Queue

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("wealthos.celery")


class CeleryLockError(Exception):
    """Raised when distributed idempotency lock cannot be verified (fail-closed)."""

    pass


# Atomic compare-and-delete Lua script:
# Deletes the key ONLY if the stored value matches the caller's owner_token
RELEASE_LOCK_LUA_SCRIPT = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
"""


def create_celery_app() -> Celery:
    """Application factory for configuring Celery worker instances."""
    app = Celery(
        "wealthos_tasks",
        broker=settings.get_celery_broker_url(),
        backend=settings.get_celery_result_backend(),
        include=["app.workers.health_tasks", "app.workers.financial_tasks"],
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
            "app.workers.health_tasks.transient_retry_task": {"queue": "default"},
            "app.workers.health_tasks.ocr_preflight_check": {"queue": "ocr_heavy"},
            "app.workers.health_tasks.market_feed_heartbeat": {"queue": "market_data"},
            "app.workers.financial_tasks.parse_document_statement_async": {"queue": "ocr_heavy"},
            "app.workers.financial_tasks.sync_market_feed_async": {"queue": "market_data"},
            "app.workers.financial_tasks.generate_financial_report_async": {"queue": "default"},
        },
        # Task retry & resilience policy
        task_annotations={
            "*": {
                "max_retries": 3,
                "default_retry_delay": 2,
                "retry_backoff": True,
                "retry_backoff_max": 30,
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


async def acquire_task_lock(
    redis_client, lock_key: str, owner_token: str, timeout_seconds: int = 300
) -> bool:
    """Acquire an atomic distributed lock with a unique ownership token.

    Fail-Closed Policy: If Redis connectivity fails, raises CeleryLockError
    to prevent unverified duplicate execution of financial ledger tasks.
    """
    try:
        # SET NX EX pattern: sets key only if not exists, with TTL
        acquired = await redis_client.set(
            f"task_lock:{lock_key}", owner_token, nx=True, ex=timeout_seconds
        )
        return bool(acquired)
    except Exception as exc:
        logger.error(
            f"Fail-closed idempotency lock failure for {lock_key}: {exc}",
            extra={"lock_key": lock_key, "error": str(exc)},
        )
        raise CeleryLockError(
            f"Cannot guarantee task idempotency: Redis lock verification failed for '{lock_key}': {exc}"
        ) from exc


async def release_task_lock(redis_client, lock_key: str, owner_token: str) -> bool:
    """Atomically release lock using Lua script only if owner_token matches.

    Prevents releasing a lock owned by another worker or an expired/re-acquired lock.
    Fail-closed policy: raises CeleryLockError if Redis communication fails.
    """
    try:
        # Run Lua compare-and-delete
        result = await redis_client.eval(
            RELEASE_LOCK_LUA_SCRIPT, 1, f"task_lock:{lock_key}", owner_token
        )
        return result == 1
    except Exception as exc:
        logger.error(f"Failed to release task lock for {lock_key} due to Redis error: {exc}")
        raise CeleryLockError(
            f"Cannot guarantee safe lock release for '{lock_key}': {exc}"
        ) from exc


def check_celery_health() -> dict:
    """Check connectivity to the Celery broker (Redis) with local eager fallback."""
    try:
        conn = celery_app.connection()
        conn.connect()
        conn.release()
        return {"status": "healthy", "broker": "connected"}
    except Exception as exc:
        if not settings.is_production:
            celery_app.conf.task_always_eager = True
            return {
                "status": "healthy",
                "mode": "eager_fallback",
                "note": "Broker offline; task execution running in resilient eager mode.",
            }
        logger.warning(f"Celery health check failed: {exc}")
        return {"status": "unhealthy", "error": str(exc)}
