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
    logger.info(
        f"Starting {settings.APP_NAME} v{settings.APP_VERSION} [{settings.ENVIRONMENT}] "
        f"profile={settings.RUNTIME_PROFILE}..."
    )

    # 1. Database Initialization (Always Mandatory)
    try:
        await init_db()
    except Exception as exc:
        logger.error(f"Database connection pool initialization failed: {exc}")
        if settings.is_production:
            raise RuntimeError(
                f"Mandatory database initialization failed in production: {exc}"
            ) from exc

    # 2. Redis Initialization (Mandatory if profile requires it)
    try:
        await init_redis()
    except Exception as exc:
        if settings.is_redis_mandatory():
            logger.error(f"Mandatory Redis initialization failed: {exc}")
            if settings.is_production:
                raise RuntimeError(
                    f"Mandatory Redis initialization failed in production: {exc}"
                ) from exc
        else:
            logger.warning(
                f"Optional Redis initialization deferred for profile '{settings.RUNTIME_PROFILE}': {exc}"
            )

    # 3. Object Storage Initialization (Mandatory if profile requires it)
    try:
        init_storage()
    except Exception as exc:
        if settings.is_storage_mandatory():
            logger.error(f"Mandatory Object Storage initialization failed: {exc}")
            if settings.is_production:
                raise RuntimeError(
                    f"Mandatory Storage initialization failed in production: {exc}"
                ) from exc
        else:
            logger.warning(
                f"Optional Object Storage initialization deferred for profile '{settings.RUNTIME_PROFILE}': {exc}"
            )

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
        allow_origins=settings.CORS_ORIGINS + [
            "http://localhost:8082",
            "http://127.0.0.1:8082",
            "http://localhost:8081",
            "http://127.0.0.1:8081",
        ],
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$",
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

    # 2b. CSRF & Origin Validation Middleware for Cookie-Authenticated Requests (OWASP ASVS 5.0)
    @app.middleware("http")
    async def csrf_origin_validation_middleware(request: Request, call_next):
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            # Check if request relies on ambient browser credentials (cookies) without explicit Bearer token
            has_auth_cookie = bool(
                request.cookies.get("wealthos_access_token")
                or request.cookies.get("access_token")
                or request.cookies.get("refresh_token")
            )
            has_bearer = bool(request.headers.get("Authorization"))

            # Exclude unauthenticated auth entrypoints (e.g. login, register)
            path = request.url.path
            is_unauthenticated_entry = path in (
                f"{settings.API_V1_PREFIX}/auth/login",
                f"{settings.API_V1_PREFIX}/auth/register",
                f"{settings.API_V1_PREFIX}/auth/forgot-password",
                f"{settings.API_V1_PREFIX}/auth/reset-password",
                f"{settings.API_V1_PREFIX}/auth/mfa/challenge",
                f"{settings.API_V1_PREFIX}/auth/mfa/verify",
                f"{settings.API_V1_PREFIX}/auth/verify-email",
            )

            if has_auth_cookie and not has_bearer and not is_unauthenticated_entry:
                origin = request.headers.get("Origin") or request.headers.get("Referer")
                if origin:
                    from urllib.parse import urlparse

                    parsed = urlparse(origin)
                    origin_base = f"{parsed.scheme}://{parsed.netloc}"
                    allowed_origins = set(settings.CORS_ORIGINS)

                    if "*" not in allowed_origins and origin_base not in allowed_origins and origin not in allowed_origins:
                        cid = correlation_id_ctx.get()
                        logger.warning(
                            f"CSRF Origin violation: request={request.method} {path}, origin={origin}, allowed={allowed_origins}"
                        )
                        return JSONResponse(
                            status_code=status.HTTP_403_FORBIDDEN,
                            content={
                                "success": False,
                                "error": {
                                    "code": "CSRF_ORIGIN_DENIED",
                                    "message": "Cross-Site Request Forgery protection: Origin/Referer header does not match authorized origins.",
                                },
                                "correlation_id": cid,
                            },
                        )

        return await call_next(request)

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
    @app.get("/health/live", tags=["Probes"], summary="Liveness Probe (/health/live)")
    @app.get("/healthz", tags=["Probes"], summary="Liveness Probe (/healthz)")
    async def health_live():
        return await liveness_probe()

    @app.get("/health/ready", tags=["Probes"], summary="Readiness Probe (/health/ready)")
    @app.get("/readyz", tags=["Probes"], summary="Readiness Probe (/readyz)")
    async def health_ready(response: Response):
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
            "environment": settings.ENVIRONMENT,
            "documentation": "/docs" if settings.ENVIRONMENT != "production" else None,
            "api_v1": settings.API_V1_PREFIX,
            "probes": {
                "liveness": "/health/live",
                "readiness": "/health/ready",
                "detailed_health": f"{settings.API_V1_PREFIX}/health",
                "metrics": "/metrics",
            },
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
