"""Tests for WealthOS Configuration Settings."""

from app.core.config import Settings


def test_settings_defaults():
    settings = Settings()
    assert settings.APP_NAME == "WealthOS Backend API"
    assert settings.APP_VERSION == "0.2.0"
    assert settings.API_PORT == 8000
    assert "http://localhost:3000" in settings.CORS_ORIGINS


def test_database_url_generation():
    settings = Settings(
        POSTGRES_USER="test_user",
        POSTGRES_PASSWORD="test_password",
        POSTGRES_HOST="db_host",
        POSTGRES_PORT=5432,
        POSTGRES_DB="test_db",
    )
    assert (
        settings.get_database_url()
        == "postgresql+asyncpg://test_user:test_password@db_host:5432/test_db"
    )
    assert (
        settings.get_database_sync_url()
        == "postgresql+psycopg://test_user:test_password@db_host:5432/test_db"
    )


def test_redis_url_generation():
    settings = Settings(
        REDIS_HOST="redis_host",
        REDIS_PORT=6379,
        REDIS_DB=0,
    )
    assert settings.get_redis_url() == "redis://redis_host:6379/0"
    assert settings.get_celery_broker_url() == "redis://redis_host:6379/1"
    assert settings.get_celery_result_backend() == "redis://redis_host:6379/2"
