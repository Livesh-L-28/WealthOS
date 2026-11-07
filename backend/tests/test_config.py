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


def test_redis_url_generation_unauthenticated():
    settings = Settings(
        REDIS_HOST="redis_host",
        REDIS_PORT=6379,
        REDIS_PASSWORD="",
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
    assert settings.get_celery_result_backend() == "redis://:secret_redis_pass@redis_host:6379/2"


def test_production_secrets_validation():
    # 1. Insecure SECRET_KEY
    with pytest.raises(ValueError, match="SECRET_KEY is using an insecure"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="insecure_dev_secret_key_change_in_production_min_32_bytes_long_12345",
            ENCRYPTION_MASTER_KEY="a" * 32,
            POSTGRES_PASSWORD="strong_random_password_xyz987",
            REDIS_PASSWORD="strong_redis_password_xyz987",
            MINIO_ACCESS_KEY="strong_minio_user",
            MINIO_SECRET_KEY="strong_minio_secret_key_123",
        )

    # 2. Insecure ENCRYPTION_MASTER_KEY
    with pytest.raises(ValueError, match="ENCRYPTION_MASTER_KEY is using an insecure"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="strong_prod_secret_key_super_random_abcdefghijklmnop",
            ENCRYPTION_MASTER_KEY="wealthos_local_32_byte_master_key_for_aes_gcm_123",
            POSTGRES_PASSWORD="strong_random_password_xyz987",
            REDIS_PASSWORD="strong_redis_password_xyz987",
            MINIO_ACCESS_KEY="strong_minio_user",
            MINIO_SECRET_KEY="strong_minio_secret_key_123",
        )

    # 3. Insecure POSTGRES_PASSWORD
    with pytest.raises(ValueError, match="POSTGRES_PASSWORD is using an insecure"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="strong_prod_secret_key_super_random_abcdefghijklmnop",
            ENCRYPTION_MASTER_KEY="strong_aes_key_" + "b" * 20,
            POSTGRES_PASSWORD="wealthos_local_dev_password_change_in_prod",
            REDIS_PASSWORD="strong_redis_password_xyz987",
            MINIO_ACCESS_KEY="strong_minio_user",
            MINIO_SECRET_KEY="strong_minio_secret_key_123",
        )

    # 4. Insecure REDIS_PASSWORD
    with pytest.raises(ValueError, match="REDIS_PASSWORD is using an insecure"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="strong_prod_secret_key_super_random_abcdefghijklmnop",
            ENCRYPTION_MASTER_KEY="strong_aes_key_" + "b" * 20,
            POSTGRES_PASSWORD="strong_random_password_xyz987",
            REDIS_PASSWORD="wealthos_local_dev_redis_change_in_prod",
            MINIO_ACCESS_KEY="strong_minio_user",
            MINIO_SECRET_KEY="strong_minio_secret_key_123",
        )

    # 5. Insecure MINIO_ACCESS_KEY
    with pytest.raises(ValueError, match="MINIO_ACCESS_KEY is using an insecure"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="strong_prod_secret_key_super_random_abcdefghijklmnop",
            ENCRYPTION_MASTER_KEY="strong_aes_key_" + "b" * 20,
            POSTGRES_PASSWORD="strong_random_password_xyz987",
            REDIS_PASSWORD="strong_redis_password_xyz987",
            MINIO_ACCESS_KEY="minioadmin",
            MINIO_SECRET_KEY="strong_minio_secret_key_123",
        )

    # 6. Insecure MINIO_SECRET_KEY
    with pytest.raises(ValueError, match="MINIO_SECRET_KEY is using an insecure"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="strong_prod_secret_key_super_random_abcdefghijklmnop",
            ENCRYPTION_MASTER_KEY="strong_aes_key_" + "b" * 20,
            POSTGRES_PASSWORD="strong_random_password_xyz987",
            REDIS_PASSWORD="strong_redis_password_xyz987",
            MINIO_ACCESS_KEY="prod_minio_admin_user",
            MINIO_SECRET_KEY="minioadminpassword",
        )

    # 7. Explicit DATABASE_URL containing insecure credentials
    with pytest.raises(ValueError, match="DATABASE_URL credentials contain an insecure"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="strong_prod_secret_key_super_random_abcdefghijklmnop",
            ENCRYPTION_MASTER_KEY="strong_aes_key_" + "b" * 20,
            POSTGRES_PASSWORD="strong_random_password_xyz987",
            REDIS_PASSWORD="strong_redis_password_xyz987",
            MINIO_ACCESS_KEY="prod_minio_admin_user",
            MINIO_SECRET_KEY="strong_minio_secret_key_123",
            DATABASE_URL="postgresql+asyncpg://admin:change_in_prod@db:5432/wealthos",
        )

    # 8. Production with all strong secrets succeeds cleanly
    prod_settings = Settings(
        ENVIRONMENT="production",
        SECRET_KEY="super_secret_high_entropy_prod_key_77182930491",
        ENCRYPTION_MASTER_KEY="super_strong_aes256_encryption_key_val_9918237",
        POSTGRES_PASSWORD="ultra_secure_db_pass_88291024",
        REDIS_PASSWORD="ultra_secure_redis_pass_88291024",
        MINIO_ACCESS_KEY="prod_vault_user_access_key",
        MINIO_SECRET_KEY="prod_vault_ultra_secret_key_1029",
    )
    assert prod_settings.ENVIRONMENT == "production"
