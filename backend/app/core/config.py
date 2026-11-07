"""WealthOS Configuration Management.

Loads settings from environment variables using Pydantic Settings v2.
Rejects known default development credentials in production mode.
"""

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application & Environment
    ENVIRONMENT: str = Field(
        default="development", description="Runtime environment: development, staging, production"
    )
    DEBUG: bool = Field(default=False, description="Debug mode flag")
    LOG_LEVEL: str = Field(
        default="INFO", description="Log level: DEBUG, INFO, WARNING, ERROR, CRITICAL"
    )
    APP_NAME: str = Field(
        default="WealthOS Backend API", description="Human-readable application name"
    )
    APP_VERSION: str = Field(default="0.2.0", description="Semantic version of the application")

    # Backend Server
    API_HOST: str = Field(default="0.0.0.0", description="Bind host")
    API_PORT: int = Field(default=8000, description="Bind port")
    API_V1_PREFIX: str = Field(default="/api/v1", description="Prefix for API v1 routes")
    CORS_ORIGINS: list[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:19006"],
        description="Allowed CORS origins",
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: any) -> list[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json

                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, tuple)):
            return list(v)
        return []

    # Security & Secrets
    SECRET_KEY: str = Field(
        default="wealthos_local_insecure_development_secret_key_change_in_prod_12345",
        description="Secret key for signing tokens and sessions",
    )
    ENCRYPTION_MASTER_KEY: str = Field(
        default="wealthos_local_32_byte_master_key_for_aes_gcm_123",
        description="AES-256 master key for sensitive data encryption at rest",
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=15, description="JWT access token expiry in minutes"
    )
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
        default=7, description="JWT refresh token expiry in days"
    )

    # PostgreSQL Database
    POSTGRES_HOST: str = Field(default="localhost", description="PostgreSQL host")
    POSTGRES_PORT: int = Field(default=5432, description="PostgreSQL port")
    POSTGRES_DB: str = Field(default="wealthos", description="PostgreSQL database name")
    POSTGRES_USER: str = Field(default="wealthos_admin", description="PostgreSQL user")
    POSTGRES_PASSWORD: str = Field(
        default="wealthos_local_dev_password_change_in_prod", description="PostgreSQL password"
    )

    DATABASE_URL: str | None = Field(
        default=None,
        description="Async SQLAlchemy database connection string",
    )
    DATABASE_SYNC_URL: str | None = Field(
        default=None,
        description="Sync SQLAlchemy database connection string for Alembic",
    )

    # Database Pool
    DB_POOL_SIZE: int = Field(default=10, description="Database connection pool size")
    DB_MAX_OVERFLOW: int = Field(default=20, description="Max overflow connections")
    DB_POOL_TIMEOUT: int = Field(default=30, description="Pool timeout seconds")
    DB_POOL_PRE_PING: bool = Field(
        default=True, description="Verify connection validity on checkout"
    )

    # Redis Cache & State
    REDIS_HOST: str = Field(default="localhost", description="Redis host")
    REDIS_PORT: int = Field(default=6379, description="Redis port")
    REDIS_PASSWORD: str | None = Field(default=None, description="Redis password")
    REDIS_DB: int = Field(default=0, description="Redis database index")
    REDIS_URL: str | None = Field(default=None, description="Redis connection URL")

    # Celery
    CELERY_BROKER_URL: str | None = Field(default=None, description="Celery broker connection URL")
    CELERY_RESULT_BACKEND: str | None = Field(default=None, description="Celery result backend URL")

    # MinIO / S3 Object Storage
    MINIO_ENDPOINT: str = Field(
        default="localhost:9000", description="MinIO endpoint hostname:port"
    )
    MINIO_ACCESS_KEY: str = Field(default="minioadmin", description="MinIO access key")
    MINIO_SECRET_KEY: str = Field(default="minioadminpassword", description="MinIO secret key")
    MINIO_SECURE: bool = Field(default=False, description="Use SSL/TLS for MinIO")
    MINIO_REGION: str = Field(default="us-east-1", description="MinIO/S3 region")
    STORAGE_DOCUMENTS_BUCKET: str = Field(
        default="wealthos-documents", description="Primary document storage bucket"
    )
    STORAGE_VAULT_BUCKET: str = Field(
        default="wealthos-vault", description="Encrypted statements and tax vault bucket"
    )

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        """Strictly reject known local development credentials when running in production."""
        if self.ENVIRONMENT.lower() in ("production", "prod"):
            insecure_markers = ("insecure", "change_in_prod", "dev_password", "12345")
            if any(marker in self.SECRET_KEY.lower() for marker in insecure_markers):
                raise ValueError("Insecure default SECRET_KEY detected in production environment!")
            if any(marker in self.ENCRYPTION_MASTER_KEY.lower() for marker in insecure_markers):
                raise ValueError(
                    "Insecure default ENCRYPTION_MASTER_KEY detected in production environment!"
                )
            if any(marker in self.POSTGRES_PASSWORD.lower() for marker in insecure_markers):
                raise ValueError(
                    "Insecure default POSTGRES_PASSWORD detected in production environment!"
                )
        return self

    def get_database_url(self) -> str:
        """Return the async database URL, building it if not explicitly provided."""
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    def get_database_sync_url(self) -> str:
        """Return the sync database URL for Alembic migrations."""
        if self.DATABASE_SYNC_URL:
            return self.DATABASE_SYNC_URL
        return (
            f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    def get_redis_url(self) -> str:
        """Return Redis connection URL."""
        if self.REDIS_URL:
            return self.REDIS_URL
        auth_part = f":{self.REDIS_PASSWORD}@" if self.REDIS_PASSWORD else ""
        return f"redis://{auth_part}{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    def get_celery_broker_url(self) -> str:
        """Return Celery broker URL."""
        if self.CELERY_BROKER_URL:
            return self.CELERY_BROKER_URL
        auth_part = f":{self.REDIS_PASSWORD}@" if self.REDIS_PASSWORD else ""
        return f"redis://{auth_part}{self.REDIS_HOST}:{self.REDIS_PORT}/1"

    def get_celery_result_backend(self) -> str:
        """Return Celery result backend URL."""
        if self.CELERY_RESULT_BACKEND:
            return self.CELERY_RESULT_BACKEND
        auth_part = f":{self.REDIS_PASSWORD}@" if self.REDIS_PASSWORD else ""
        return f"redis://{auth_part}{self.REDIS_HOST}:{self.REDIS_PORT}/2"


# Singleton instance
settings = Settings()
