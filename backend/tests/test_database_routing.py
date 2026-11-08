"""Tests for WealthOS Database Topology and Primary/Replica Query Routing."""

import pytest
from sqlalchemy import text

from app.core.config import Settings
from app.core.database import (
    PrimaryReplicaRouter,
    get_engine,
    get_read_db_session,
    get_read_engine,
    get_read_session_factory,
    get_session_factory,
)


def test_primary_engine_initialization():
    """Verify primary writer engine is instantiated and healthy."""
    write_eng = PrimaryReplicaRouter.get_write_engine()
    assert write_eng is not None
    assert write_eng == get_engine()


def test_read_engine_fallback_when_unconfigured(monkeypatch):
    """When no read replica is configured, read queries must fallback to primary engine."""
    monkeypatch.setattr("app.core.config.settings.POSTGRES_REPLICA_HOST", None)
    monkeypatch.setattr("app.core.config.settings.DATABASE_REPLICA_URL", None)

    assert not PrimaryReplicaRouter.is_replica_active()
    read_eng = PrimaryReplicaRouter.get_read_engine()
    write_eng = PrimaryReplicaRouter.get_write_engine()
    assert read_eng == write_eng

    factory = get_read_session_factory()
    assert factory is not None


def test_replica_configuration_resolution():
    """Verify Settings correctly resolves replica database URL when configured."""
    custom_settings = Settings(
        POSTGRES_HOST="10.0.0.1",
        POSTGRES_PORT=5432,
        POSTGRES_DB="wealthos",
        POSTGRES_USER="wealthos_app",
        POSTGRES_PASSWORD="wealthos_app_dev_password_change_in_prod",
        POSTGRES_REPLICA_HOST="10.0.0.2",
        POSTGRES_REPLICA_PORT=5433,
    )
    replica_url = custom_settings.get_replica_database_url()
    assert replica_url is not None
    assert "10.0.0.2:5433" in replica_url
    assert "wealthos_app" in replica_url


@pytest.mark.asyncio
async def test_read_db_session_yields_functional_session():
    """Verify get_read_db_session yields an active async session executing read queries."""
    async for session in get_read_db_session():
        result = await session.execute(text("SELECT 1 AS alive"))
        val = result.scalar()
        assert val == 1
        break

