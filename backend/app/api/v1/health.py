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


@router.get("/liveness", summary="Lightweight Liveness Probe")
async def liveness_probe():
    """Kubernetes/Container liveness probe to verify process is alive."""
    return {"status": "alive", "timestamp": datetime.now(UTC).isoformat()}


@router.get("/readiness", summary="Readiness Probe")
async def readiness_probe(response: Response):
    """Kubernetes/Container readiness probe verifying operational availability."""
    db = await check_database_health()
    redis = await check_redis_health()

    is_ready = db.get("status") == "healthy" and redis.get("status") == "healthy"

    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "not_ready",
            "database": db.get("status"),
            "redis": redis.get("status"),
        }

    return {
        "status": "ready",
        "database": "healthy",
        "redis": "healthy",
        "timestamp": datetime.now(UTC).isoformat(),
    }
