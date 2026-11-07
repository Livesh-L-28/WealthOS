"""WealthOS FastAPI Application Factory & Main Entrypoint.

Initializes the FastAPI application with CORS, request correlation tracing,
centralized structured error handling, and lifecycle event management.
"""

import time
import uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1 import api_v1_router
from app.api.v1.health import liveness_probe, readiness_probe
from app.core.config import settings
from app.core.database import close_db, init_db
from app.core.logging import (
    correlation_id_ctx,
    get_logger,
    setup_logging,
    tenant_id_ctx,
)
from app.infrastructure.redis import close_redis, init_redis
from app.infrastructure.storage import init_storage

logger = get_logger("wealthos.api")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context manager for startup and shutdown routines."""
    # --- Startup ---
    setup_logging(level=settings.LOG_LEVEL, environment=settings.ENVIRONMENT)
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION} [{settings.ENVIRONMENT}]...")

    try:
        await init_db()
    except Exception as exc:
        logger.warning(f"Database connection pool initialization deferred: {exc}")

    try:
        await init_redis()
    except Exception as exc:
        logger.warning(f"Redis initialization deferred: {exc}")

    try:
        init_storage()
    except Exception as exc:
        logger.warning(f"Storage initialization deferred: {exc}")

    logger.info("Application startup sequence completed")
    yield

    # --- Shutdown ---
    logger.info("Initiating graceful shutdown sequence...")
    try:
        await close_redis()
    except Exception as exc:
        logger.warning(f"Error closing Redis: {exc}")

    try:
        await close_db()
    except Exception as exc:
        logger.warning(f"Error closing database pool: {exc}")

    logger.info("Graceful shutdown completed successfully")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="WealthOS — Enterprise-Grade Personal Wealth Intelligence Platform Backend API",
        docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
        redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
        openapi_url="/openapi.json" if settings.ENVIRONMENT != "production" else None,
        lifespan=lifespan,
    )

    # 1. CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Correlation-ID", "X-Response-Time-Ms"],
    )

    # 2. Correlation ID & Request Timing Middleware
    @app.middleware("http")
    async def correlation_and_timing_middleware(request: Request, call_next):
        # Extract or generate correlation ID
        correlation_id = (
            request.headers.get("X-Correlation-ID")
            or request.headers.get("X-Request-ID")
            or str(uuid.uuid4())
        )
        token_cid = correlation_id_ctx.set(correlation_id)

        # Extract tenant ID if present in header
        tenant_header = request.headers.get("X-Tenant-ID", "anonymous")
        token_tid = tenant_id_ctx.set(tenant_header)

        start_time = time.time()
        try:
            response: Response = await call_next(request)
            duration_ms = round((time.time() - start_time) * 1000, 2)
            response.headers["X-Correlation-ID"] = correlation_id
            response.headers["X-Response-Time-Ms"] = str(duration_ms)

            # Log non-health requests or slow requests
            if not request.url.path.endswith(("healthz", "readyz", "metrics")):
                logger.info(
                    f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)"
                )
            return response
        except Exception as exc:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            logger.error(f"Unhandled request error on {request.method} {request.url.path}: {exc}")
            raise
        finally:
            correlation_id_ctx.reset(token_cid)
            tenant_id_ctx.reset(token_tid)

    # 3. Centralized Exception Handlers
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        cid = correlation_id_ctx.get()
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "code": f"HTTP_{exc.status_code}",
                    "message": exc.detail,
                },
                "correlation_id": cid,
            },
            headers={"X-Correlation-ID": cid},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        cid = correlation_id_ctx.get()
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Input validation failed",
                    "details": exc.errors(),
                },
                "correlation_id": cid,
            },
            headers={"X-Correlation-ID": cid},
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        cid = correlation_id_ctx.get()
        logger.exception(f"Unhandled internal server error: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected internal server error occurred.",
                },
                "correlation_id": cid,
            },
            headers={"X-Correlation-ID": cid},
        )

    # 4. Top-level Probe Endpoints
    @app.get("/healthz", tags=["Probes"], summary="Liveness Probe")
    async def healthz():
        return await liveness_probe()

    @app.get("/readyz", tags=["Probes"], summary="Readiness Probe")
    async def readyz(response: Response):
        return await readiness_probe(response)

    @app.get("/metrics", tags=["Probes"], summary="System Metrics")
    async def metrics():
        return {
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
            "status": "operational",
        }

    @app.get("/", tags=["Root"], summary="Root Service Information")
    async def root():
        return {
            "service": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "documentation": "/docs" if settings.ENVIRONMENT != "production" else None,
            "api_v1": settings.API_V1_PREFIX,
        }

    # 5. Include API v1 Routes
    app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
    )
