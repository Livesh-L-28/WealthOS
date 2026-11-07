"""Tests for WealthOS Configuration Settings."""

import pytest

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


def test_redis_url_with_password():
    settings = Settings(
        REDIS_HOST="redis_host",
        REDIS_PORT=6379,
        REDIS_PASSWORD="secret_redis_pass",
        REDIS_DB=3,
    )
    assert settings.get_redis_url() == "redis://:secret_redis_pass@redis_host:6379/3"
    assert settings.get_celery_broker_url() == "redis://:secret_redis_pass@redis_host:6379/1"


def test_production_secrets_validation():
    # Production with insecure default secrets raises ValueError
    with pytest.raises(ValueError, match="Insecure default SECRET_KEY"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="insecure_dev_secret_key_to_be_overridden",
            ENCRYPTION_MASTER_KEY="a" * 32,
            POSTGRES_PASSWORD="strong_random_password_xyz987",
        )

    with pytest.raises(ValueError, match="Insecure default ENCRYPTION_MASTER_KEY"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="strong_prod_secret_key_super_random_abcdefghijklmnop",
            ENCRYPTION_MASTER_KEY="insecure_dev_encryption_key_change_in_prod",
            POSTGRES_PASSWORD="strong_random_password_xyz987",
        )

    # Production with strong secrets succeeds
    prod_settings = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="super_secret_high_entropy_prod_key_77182930491",
        ENCRYPTION_MASTER_KEY="super_strong_aes256_encryption_key_val_9918237",
        POSTGRES_PASSWORD="ultra_secure_db_pass_88291024",
    )
    assert prod_settings.ENVIRONMENT == "production"
