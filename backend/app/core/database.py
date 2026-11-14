"""WealthOS Database Architecture.

SQLAlchemy 2.x async engine, session management, base declarative models,
and enterprise multi-tenant mixins.
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from typing import Any

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

# Global async engines & sessionmakers (Primary Writer + Optional Read Replica)
engine: AsyncEngine | None = None
async_session_factory: async_sessionmaker[AsyncSession] | None = None

read_engine: AsyncEngine | None = None
read_session_factory: async_sessionmaker[AsyncSession] | None = None

_is_sqlite_fallback: bool = False


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
        connect_args: dict[str, Any] = {}
        if ":6543" in db_url:
            connect_args["statement_cache_size"] = 0
            connect_args["prepared_statement_cache_size"] = 0
        elif "pooler.supabase.com" in db_url:
            connect_args["statement_cache_size"] = 100
            connect_args["prepared_statement_cache_size"] = 100

        engine = create_async_engine(
            db_url,
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            pool_timeout=settings.DB_POOL_TIMEOUT,
            pool_pre_ping=settings.DB_POOL_PRE_PING,
            pool_recycle=1800,
            connect_args=connect_args,
            echo=settings.DEBUG and settings.LOG_LEVEL == "DEBUG",
        )
    return engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Retrieve or create the async session factory for primary writer database."""
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


def get_read_engine() -> AsyncEngine:
    """Retrieve or create the async database engine for read replica.
    
    If no read replica is configured, gracefully falls back to the primary engine.
    """
    global read_engine
    replica_url = settings.get_replica_database_url()
    if replica_url is None:
        return get_engine()

    if read_engine is None:
        logger.info(
            f"Initializing read-replica database engine: host={settings.POSTGRES_REPLICA_HOST}, port={settings.POSTGRES_REPLICA_PORT}"
        )
        read_engine = create_async_engine(
            replica_url,
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            pool_timeout=settings.DB_POOL_TIMEOUT,
            pool_pre_ping=settings.DB_POOL_PRE_PING,
            echo=settings.DEBUG and settings.LOG_LEVEL == "DEBUG",
        )
    return read_engine


def get_read_session_factory() -> async_sessionmaker[AsyncSession]:
    """Retrieve or create the async session factory for read-replica queries."""
    global read_session_factory
    if read_session_factory is None:
        eng = get_read_engine()
        read_session_factory = async_sessionmaker(
            bind=eng,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    return read_session_factory


class PrimaryReplicaRouter:
    """Explicit Primary/Replica query routing engine for analytical read scaling."""

    @staticmethod
    def get_write_engine() -> AsyncEngine:
        """Return primary writer engine."""
        return get_engine()

    @staticmethod
    def get_read_engine() -> AsyncEngine:
        """Return read replica engine (or primary if replica not configured)."""
        return get_read_engine()

    @staticmethod
    def is_replica_active() -> bool:
        """Check if an independent read replica is configured."""
        return settings.get_replica_database_url() is not None


async def init_db() -> None:
    """Initialize database connection pools with resilient SQLite fallback."""
    global engine, async_session_factory, _is_sqlite_fallback
    eng = get_engine()
    try:
        async with eng.connect() as conn:
            await conn.execute(text("SELECT 1"))
        _is_sqlite_fallback = False
        get_session_factory()
        logger.info("Primary PostgreSQL database pool initialized and verified")
    except Exception as exc:
        if settings.is_production:
            raise
        logger.warning(
            f"Primary PostgreSQL database unavailable ({exc}). Activating embedded async SQLite database engine..."
        )
        from pathlib import Path
        from sqlalchemy import event

        var_dir = Path(__file__).resolve().parent.parent.parent / "var" / "data"
        var_dir.mkdir(parents=True, exist_ok=True)
        db_path = var_dir / "wealthos_dev.db"
        sqlite_url = f"sqlite+aiosqlite:///{db_path}"

        if engine is not None:
            await engine.dispose()

        engine = create_async_engine(
            sqlite_url,
            echo=settings.DEBUG and settings.LOG_LEVEL == "DEBUG",
        )

        @event.listens_for(engine.sync_engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        async_session_factory = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
        _is_sqlite_fallback = True

        # Initialize schema tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info(f"Resilient SQLite engine active at {db_path} with WAL mode and schema ready")

    if not _is_sqlite_fallback and settings.get_replica_database_url():
        get_read_engine()
        get_read_session_factory()


async def close_db() -> None:
    """Dispose of database engines and release connections."""
    global engine, async_session_factory, read_engine, read_session_factory
    if engine is not None:
        logger.info("Disposing primary database connection pool...")
        await engine.dispose()
        engine = None
        async_session_factory = None
        logger.info("Primary database engine disposed")
    if read_engine is not None:
        logger.info("Disposing read replica database connection pool...")
        await read_engine.dispose()
        read_engine = None
        read_session_factory = None
        logger.info("Read replica database engine disposed")


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for yielding transactional database sessions (Primary Writer)."""
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


async def get_read_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for yielding read-only database sessions.
    
    Circuit Breaker Pattern:
    Attempts connection to the read replica; if the replica is unconfigured, unreachable,
    or times out, seamlessly falls back to the primary writer session to guarantee zero downtime.
    """
    factory = get_read_session_factory()
    try:
        async with factory() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
            finally:
                from app.core.tenant_context import reset_db_session_state

                await reset_db_session_state(session)
                await session.close()
    except Exception as replica_exc:
        # If replica failed before session yield and replica is independent, fall back to primary
        if PrimaryReplicaRouter.is_replica_active():
            logger.warning(
                f"Read replica connection failed ({replica_exc}); circuit breaker falling back to primary writer."
            )
            primary_factory = get_session_factory()
            async with primary_factory() as session:
                try:
                    yield session
                except Exception:
                    await session.rollback()
                    raise
                finally:
                    from app.core.tenant_context import reset_db_session_state

                    await reset_db_session_state(session)
                    await session.close()
        else:
            raise


async def check_replication_lag(session: AsyncSession) -> dict[str, Any]:
    """Measure PostgreSQL replication status and lag in milliseconds.
    
    Circuit breaker rule: standby replication lag > MAX_REPLICATION_LAG_MS (default 1000ms)
    trips the breaker, redirecting analytical traffic to the primary writer.
    """
    query = text(
        """
        SELECT pg_is_in_recovery() AS in_recovery,
               CASE 
                 WHEN pg_is_in_recovery() THEN 
                   COALESCE(EXTRACT(EPOCH FROM (clock_timestamp() - pg_last_xact_replay_timestamp())), 0) * 1000
                 ELSE 0.0 
               END AS lag_ms;
        """
    )
    try:
        res = await session.execute(query)
        row = res.fetchone()
        in_recovery = bool(row[0]) if row else False
        lag_ms = float(row[1]) if row and row[1] is not None else 0.0
    except Exception as e:
        logger.warning(f"Failed to query replication lag: {e}")
        in_recovery = False
        lag_ms = 0.0

    max_lag = getattr(settings, "MAX_REPLICATION_LAG_MS", 1000.0)
    return {
        "in_recovery": in_recovery,
        "lag_ms": lag_ms,
        "is_healthy": lag_ms <= max_lag,
        "threshold_ms": max_lag,
    }


async def check_database_health() -> dict:
    """Check database connectivity with a lightweight ping query and latency telemetry."""
    import time

    start_time = time.perf_counter()
    try:
        eng = get_engine()
        async with eng.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            val = result.scalar()
            latency = round((time.perf_counter() - start_time) * 1000, 2)
            if val == 1:
                status_dict = {
                    "status": "healthy",
                    "engine": "sqlite+aiosqlite (local resilient engine)" if _is_sqlite_fallback else "postgresql+asyncpg",
                    "fallback_active": _is_sqlite_fallback,
                    "latency_ms": latency,
                }
                if not _is_sqlite_fallback and PrimaryReplicaRouter.is_replica_active():
                    try:
                        rep_start = time.perf_counter()
                        rep_eng = get_read_engine()
                        async with rep_eng.connect() as rep_conn:
                            rep_val = (await rep_conn.execute(text("SELECT 1"))).scalar()
                            rep_latency = round((time.perf_counter() - rep_start) * 1000, 2)
                            status_dict["replica"] = {
                                "status": "healthy" if rep_val == 1 else "degraded",
                                "latency_ms": rep_latency,
                            }
                    except Exception as rep_exc:
                        status_dict["replica"] = {"status": "unhealthy", "error": str(rep_exc)}
                return status_dict
            return {"status": "degraded", "error": f"Unexpected ping value: {val}"}
    except Exception as exc:
        logger.warning(f"Database health check failed: {exc}")
        return {"status": "unhealthy", "error": str(exc)}
