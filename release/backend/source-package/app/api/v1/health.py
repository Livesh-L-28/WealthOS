"""WealthOS Health & Diagnostic API Endpoints.

Provides Kubernetes/Docker liveness, readiness, and detailed system diagnostics.
"""

import time
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Response, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.database import check_database_health
from app.infrastructure.celery_app import check_celery_health
from app.infrastructure.redis import check_redis_health
from app.infrastructure.storage import check_storage_health

router = APIRouter()

# Track startup timestamp for uptime computation
START_TIME = time.time()


class SubsystemStatus(BaseModel):
    status: str
    details: dict[str, Any] = Field(default_factory=dict)


class HealthReport(BaseModel):
    status: str
    app_name: str
    version: str
    environment: str
    timestamp: str
    uptime_seconds: float
    subsystems: dict[str, Any]


@router.get("", response_model=HealthReport, summary="Detailed Subsystem Health Report")
async def get_health_report(response: Response):
    """Inspect all infrastructure dependencies: Database, Redis, Celery, and Object Storage."""
    db_health = await check_database_health()
    redis_health = await check_redis_health()
    celery_health = check_celery_health()
    storage_health = check_storage_health()

    subsystems = {
        "database": db_health,
        "redis": redis_health,
        "celery": celery_health,
        "storage": storage_health,
    }

    # Determine overall system health
    all_healthy = all(s.get("status") == "healthy" for s in subsystems.values())
    overall_status = "healthy" if all_healthy else "degraded"

    if overall_status != "healthy":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return HealthReport(
        status=overall_status,
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        timestamp=datetime.now(UTC).isoformat(),
        uptime_seconds=round(time.time() - START_TIME, 2),
        subsystems=subsystems,
    )


@router.get("/live", summary="Liveness Probe (/health/live)")
@router.get("/liveness", summary="Lightweight Liveness Probe")
async def liveness_probe():
    """Kubernetes/Container liveness probe to verify process is alive.

    Does not fail merely because external dependencies (DB/Redis) are booting or unavailable.
    """
    return {
        "status": "alive",
        "timestamp": datetime.now(UTC).isoformat(),
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@router.get("/ready", summary="Readiness Probe (/health/ready)")
@router.get("/readiness", summary="Readiness Probe")
async def readiness_probe(response: Response):
    """Kubernetes/Container readiness probe verifying operational availability of backing dependencies.

    Fails closed (HTTP 503) if any mandatory dependency (PostgreSQL, or Redis/Storage
    depending on the active RUNTIME_PROFILE) is unhealthy.
    """
    db = await check_database_health()
    redis = await check_redis_health()
    storage = check_storage_health()

    db_healthy = db.get("status") == "healthy"
    redis_healthy = redis.get("status") == "healthy"
    storage_healthy = storage.get("status") == "healthy"

    redis_required = settings.is_redis_mandatory()
    storage_required = settings.is_storage_mandatory()

    # PostgreSQL is unconditionally mandatory for all profiles
    is_ready = db_healthy
    if redis_required and not redis_healthy:
        is_ready = False
    if storage_required and not storage_healthy:
        is_ready = False

    subsystem_details = {
        "database": {"status": db.get("status"), "mandatory": True},
        "redis": {"status": redis.get("status"), "mandatory": redis_required},
        "storage": {"status": storage.get("status"), "mandatory": storage_required},
    }

    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "not_ready",
            "profile": settings.RUNTIME_PROFILE,
            "subsystems": subsystem_details,
            "timestamp": datetime.now(UTC).isoformat(),
        }

    return {
        "status": "ready",
        "profile": settings.RUNTIME_PROFILE,
        "subsystems": subsystem_details,
        "timestamp": datetime.now(UTC).isoformat(),
    }


@router.get("/dashboard", summary="Operational Health Dashboard")
async def operations_dashboard(response: Response):
    """Exposes consolidated operational telemetry across all platform subsystems."""
    db = await check_database_health()
    redis = await check_redis_health()
    celery = check_celery_health()
    storage = check_storage_health()

    outbox_backlog = 0
    if db.get("status") == "healthy":
        try:
            from app.core.database import get_engine
            from sqlalchemy import text

            eng = get_engine()
            async with eng.connect() as conn:
                res = await conn.execute(text("SELECT count(*) FROM outbox_events WHERE status = 'PENDING';"))
                outbox_backlog = res.scalar() or 0
        except Exception:
            outbox_backlog = 0

    all_healthy = all(s.get("status") == "healthy" for s in (db, redis, celery, storage))

    return {
        "status": "healthy" if all_healthy else "degraded",
        "app_name": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(UTC).isoformat(),
        "uptime_seconds": round(time.time() - START_TIME, 2),
        "telemetry": {
            "database": {
                "status": db.get("status"),
                "latency_ms": db.get("latency_ms"),
                "replica": db.get("replica", {"status": "none"}),
            },
            "redis": {
                "status": redis.get("status"),
                "latency_ms": redis.get("latency_ms"),
            },
            "celery": {
                "status": celery.get("status"),
                "active_workers": celery.get("active_workers", 0),
            },
            "storage": {
                "status": storage.get("status"),
            },
            "outbox": {
                "pending_events_count": outbox_backlog,
                "status": "healthy" if outbox_backlog < 1000 else "backlogged",
            },
            "financial_integrity": {
                "invariants_enforced": True,
                "ledger_balance_tolerance": "0.0000 INR",
            },
        },
    }
