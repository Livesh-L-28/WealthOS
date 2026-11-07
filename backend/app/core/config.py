"""WealthOS Configuration Management.

Loads settings from environment variables using Pydantic Settings v2.
Rejects known default development credentials in production mode.
Zero sensitive credentials or tokens are ever printed in exception messages or logs.
"""

from typing import Any
from urllib.parse import urlparse

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

    # API Configuration
    API_HOST: str = Field(default="0.0.0.0", description="API server host")
    API_PORT: int = Field(default=8000, description="API server port")
    API_V1_PREFIX: str = Field(default="/api/v1", description="Prefix for API v1 routes")
    CORS_ORIGINS: list[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:19006"],
        description="Allowed CORS origins",
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> list[str]:
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
        default="insecure_dev_secret_key_change_in_production_min_32_bytes_long_12345",
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
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT signing algorithm")
    JWT_ISSUER: str = Field(default="wealthos:auth", description="JWT token issuer")
    JWT_AUDIENCE: str = Field(default="wealthos:api", description="JWT token audience")
    MFA_TOTP_ISSUER: str = Field(default="WealthOS", description="MFA TOTP issuer label")
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = Field(
        default=24, description="Email verification token validity in hours"
    )
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30, description="Password reset token validity in minutes"
    )
    INVITATION_TOKEN_EXPIRE_DAYS: int = Field(
        default=7, description="Tenant invitation token validity in days"
    )
    LOGIN_MAX_FAILED_ATTEMPTS: int = Field(
        default=5, description="Maximum failed login attempts before lockout"
    )
    LOGIN_LOCKOUT_MINUTES: int = Field(
        default=15, description="Account lockout duration in minutes"
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

    # Redis Cache & State (Authenticated by default)
    REDIS_HOST: str = Field(default="localhost", description="Redis host")
    REDIS_PORT: int = Field(default=6379, description="Redis port")
    REDIS_PASSWORD: str = Field(
        default="wealthos_local_dev_redis_change_in_prod",
        description="Redis password for authenticated access",
    )
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
    MINIO_REGION: str = Field(default="us-east-1", description="MinIO region")
    MINIO_SECURE: bool = Field(default=False, description="Use TLS/HTTPS for MinIO")
    STORAGE_DOCUMENTS_BUCKET: str = Field(
        default="wealthos-documents", description="Bucket for verified financial documents"
    )
    STORAGE_VAULT_BUCKET: str = Field(
        default="wealthos-vault", description="Bucket for encrypted sensitive vault data"
    )
    STORAGE_QUARANTINE_BUCKET: str = Field(
        default="wealthos-quarantine",
        description="Isolated bucket for unvalidated incoming documents",
    )

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        """Strictly validate that no default or development credentials are used in production.

        Never prints credentials in exceptions or logs.
        """
        if self.ENVIRONMENT.lower() == "production":
            insecure_markers = (
                "insecure",
                "change_in_prod",
                "dev_password",
                "dev_redis",
                "wealthos_local",
                "12345",
                "minioadmin",
                "minioadminpassword",
                "default",
            )

            # 1. SECRET_KEY
            if not self.SECRET_KEY or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "Production mode security violation: SECRET_KEY must be at least 32 characters."
                )
            if any(marker in self.SECRET_KEY.lower() for marker in insecure_markers):
                raise ValueError(
                    "Production mode security violation: SECRET_KEY is using an insecure or default development value."
                )

            # 2. ENCRYPTION_MASTER_KEY
            if not self.ENCRYPTION_MASTER_KEY or len(self.ENCRYPTION_MASTER_KEY) < 32:
                raise ValueError(
                    "Production mode security violation: ENCRYPTION_MASTER_KEY must be at least 32 characters."
                )
            if any(marker in self.ENCRYPTION_MASTER_KEY.lower() for marker in insecure_markers):
                raise ValueError(
                    "Production mode security violation: ENCRYPTION_MASTER_KEY is using an insecure or default development value."
                )

            # 3. POSTGRES_PASSWORD
            if not self.POSTGRES_PASSWORD or len(self.POSTGRES_PASSWORD) < 12:
                raise ValueError(
                    "Production mode security violation: POSTGRES_PASSWORD must be at least 12 characters."
                )
            if any(marker in self.POSTGRES_PASSWORD.lower() for marker in insecure_markers):
                raise ValueError(
                    "Production mode security violation: POSTGRES_PASSWORD is using an insecure or default development value."
                )

            # 4. REDIS_PASSWORD
            if not self.REDIS_PASSWORD or len(self.REDIS_PASSWORD) < 12:
                raise ValueError(
                    "Production mode security violation: REDIS_PASSWORD must be at least 12 characters."
                )
            if any(marker in self.REDIS_PASSWORD.lower() for marker in insecure_markers):
                raise ValueError(
                    "Production mode security violation: REDIS_PASSWORD is using an insecure or default development value."
                )

            # 5. MINIO_ACCESS_KEY & MINIO_SECRET_KEY
            if not self.MINIO_ACCESS_KEY or self.MINIO_ACCESS_KEY == "minioadmin":
                raise ValueError(
                    "Production mode security violation: MINIO_ACCESS_KEY is using an insecure or default development value."
                )
            if any(marker in self.MINIO_ACCESS_KEY.lower() for marker in insecure_markers):
                raise ValueError(
                    "Production mode security violation: MINIO_ACCESS_KEY is using an insecure or default development value."
                )

            if not self.MINIO_SECRET_KEY or len(self.MINIO_SECRET_KEY) < 12:
                raise ValueError(
                    "Production mode security violation: MINIO_SECRET_KEY must be at least 12 characters."
                )
            if any(marker in self.MINIO_SECRET_KEY.lower() for marker in insecure_markers):
                raise ValueError(
                    "Production mode security violation: MINIO_SECRET_KEY is using an insecure or default development value."
                )

            # 6. Explicit DATABASE_URL check
            for url_field, url_val in [
                ("DATABASE_URL", self.DATABASE_URL),
                ("DATABASE_SYNC_URL", self.DATABASE_SYNC_URL),
            ]:
                if url_val:
                    parsed = urlparse(url_val)
                    if parsed.password and any(
                        marker in parsed.password.lower() for marker in insecure_markers
                    ):
                        raise ValueError(
                            f"Production mode security violation: {url_field} credentials contain an insecure default value."
                        )

            # 7. Explicit Celery broker and result backend checks
            for celery_field, celery_val in [
                ("CELERY_BROKER_URL", self.CELERY_BROKER_URL),
                ("CELERY_RESULT_BACKEND", self.CELERY_RESULT_BACKEND),
            ]:
                if celery_val:
                    parsed = urlparse(celery_val)
                    if parsed.password and any(
                        marker in parsed.password.lower() for marker in insecure_markers
                    ):
                        raise ValueError(
                            f"Production mode security violation: {celery_field} credentials contain an insecure default value."
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

    @property
    def is_production(self) -> bool:
        """Check if environment is production."""
        return self.ENVIRONMENT.lower() == "production"

    @property
    def is_development(self) -> bool:
        """Check if environment is development."""
        return self.ENVIRONMENT.lower() == "development"

    @property
    def is_testing(self) -> bool:
        """Check if environment is testing."""
        return self.ENVIRONMENT.lower() == "testing"


# Singleton instance
settings = Settings()
