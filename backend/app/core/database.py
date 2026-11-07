"""WealthOS Database Architecture.

SQLAlchemy 2.x async engine, session management, base declarative models,
and enterprise multi-tenant mixins.
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, declared_attr, mapped_column

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("wealthos.database")

# Global async engine & sessionmaker (initialized during lifespan)
engine: AsyncEngine | None = None
async_session_factory: async_sessionmaker[AsyncSession] | None = None


class Base(DeclarativeBase):
    """Base declarative class for all WealthOS entities."""

    # Automatically generate table name from class name if not provided
    @declared_attr.directive
    def __tablename__(cls) -> str:
        # Convert CamelCase to snake_case table name
        name = cls.__name__
        return "".join(["_" + c.lower() if c.isupper() else c.lower() for c in name]).lstrip("_")


class UUIDPrimaryKeyMixin:
    """UUID v4 primary key mixin."""

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
        doc="Unique identifier (UUIDv4)",
    )


class TimestampMixin:
    """Audit timestamps mixin for entity lifecycle tracking."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        doc="Timestamp of creation (UTC)",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
        doc="Timestamp of last update (UTC)",
    )


class SoftDeleteMixin:
    """Soft deletion mixin for auditable financial record preservation."""

    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True,
        doc="Soft deletion flag",
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Timestamp of deletion (UTC)",
    )


class TenantScopedMixin:
    """Multi-tenant isolation mixin enforcing tenant_id on all domain entities."""

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
        doc="Owning tenant organization identifier",
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
        doc="Owning user identifier within tenant",
    )


def get_engine() -> AsyncEngine:
    """Retrieve or create the global async database engine."""
    global engine
    if engine is None:
        db_url = settings.get_database_url()
        logger.info(
            f"Initializing database engine: host={settings.POSTGRES_HOST}, port={settings.POSTGRES_PORT}, db={settings.POSTGRES_DB}"
        )
        engine = create_async_engine(
            db_url,
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            pool_timeout=settings.DB_POOL_TIMEOUT,
            pool_pre_ping=settings.DB_POOL_PRE_PING,
            echo=settings.DEBUG and settings.LOG_LEVEL == "DEBUG",
        )
    return engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Retrieve or create the async session factory."""
    global async_session_factory
    if async_session_factory is None:
        eng = get_engine()
        async_session_factory = async_sessionmaker(
            bind=eng,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    return async_session_factory


async def init_db() -> None:
    """Initialize database connection pool."""
    get_engine()
    get_session_factory()
    logger.info("Database connection pool initialized")


async def close_db() -> None:
    """Dispose of database engine and release connections."""
    global engine, async_session_factory
    if engine is not None:
        logger.info("Disposing database connection pool...")
        await engine.dispose()
        engine = None
        async_session_factory = None
        logger.info("Database engine disposed")


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for yielding transactional database sessions."""
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            from app.core.tenant_context import reset_db_session_state

            await reset_db_session_state(session)
            await session.close()


async def check_database_health() -> dict:
    """Check database connectivity with a lightweight ping query."""
    try:
        eng = get_engine()
        async with eng.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            val = result.scalar()
            if val == 1:
                return {"status": "healthy", "latency_ms": None}
            return {"status": "degraded", "error": f"Unexpected ping value: {val}"}
    except Exception as exc:
        logger.warning(f"Database health check failed: {exc}")
        return {"status": "unhealthy", "error": str(exc)}
