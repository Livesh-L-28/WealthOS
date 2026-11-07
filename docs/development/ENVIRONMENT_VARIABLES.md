# WealthOS Environment Variables & Secrets Reference

This document provides a comprehensive dictionary of all configuration parameters across WealthOS services.

---

## 1. Application & Runtime Configuration

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `ENVIRONMENT` | string | `development` | Target environment: `development`, `testing`, `staging`, `production` |
| `DEBUG` | boolean | `false` | Enables debug mode and detailed error traces in development |
| `LOG_LEVEL` | string | `INFO` | Logging threshold: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL` |
| `APP_NAME` | string | `WealthOS Backend API` | Human-readable service name |
| `APP_VERSION` | string | `0.2.0` | Semantic version string |
| `API_HOST` | string | `0.0.0.0` | IP interface to bind backend server |
| `API_PORT` | integer | `8000` | Port to bind backend server |
| `API_V1_PREFIX` | string | `/api/v1` | URL path prefix for API v1 routes |
| `CORS_ORIGINS` | JSON list | `["http://localhost:3000"]` | Allowed origins for cross-origin resource sharing |

---

## 2. Security & Cryptographic Secrets

| Variable | Type | Default | Security Requirement |
| :--- | :--- | :--- | :--- |
| `SECRET_KEY` | string | *Insecure local default* | **Critical**: Must be random 64-char hex in production (`openssl rand -hex 32`) |
| `ENCRYPTION_MASTER_KEY` | string | *Insecure local default* | **Critical**: AES-256 master key for financial data at rest |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | integer | `15` | JWT session token validity window |
| `REFRESH_TOKEN_EXPIRE_DAYS` | integer | `7` | Refresh token duration |

---

## 3. PostgreSQL Database Configuration

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `POSTGRES_HOST` | string | `localhost` | Database server hostname |
| `POSTGRES_PORT` | integer | `5432` | Database server port |
| `POSTGRES_DB` | string | `wealthos` | Database name |
| `POSTGRES_USER` | string | `wealthos_admin` | Database username |
| `POSTGRES_PASSWORD` | string | *Local default* | Database password |
| `DATABASE_URL` | string | *Derived from above* | Asyncpg connection URL (`postgresql+asyncpg://...`) |
| `DATABASE_SYNC_URL` | string | *Derived from above* | Psycopg connection URL for Alembic (`postgresql+psycopg://...`) |
| `DB_POOL_SIZE` | integer | `10` | Base connection pool size |
| `DB_MAX_OVERFLOW` | integer | `20` | Max overflow connections beyond pool size |
| `DB_POOL_TIMEOUT` | integer | `30` | Timeout seconds waiting for connection checkout |
| `DB_POOL_PRE_PING` | boolean | `true` | Verify connection health before issuing queries |

---

## 4. Redis Cache & Celery Task Broker

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `REDIS_HOST` | string | `localhost` | Redis server hostname |
| `REDIS_PORT` | integer | `6379` | Redis server port |
| `REDIS_PASSWORD` | string | empty | Redis password (if authentication enabled) |
| `REDIS_DB` | integer | `0` | Application cache database index |
| `CELERY_BROKER_URL` | string | `redis://localhost:6379/1` | Redis database index 1 for message queue broker |
| `CELERY_RESULT_BACKEND` | string | `redis://localhost:6379/2` | Redis database index 2 for task results |

---

## 5. Object Storage (MinIO / AWS S3)

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `MINIO_ENDPOINT` | string | `localhost:9000` | S3 host and port |
| `MINIO_ACCESS_KEY` | string | `minioadmin` | S3 Access Key ID |
| `MINIO_SECRET_KEY` | string | `minioadminpassword` | S3 Secret Access Key |
| `MINIO_SECURE` | boolean | `false` | Enable HTTPS / TLS (`true` in production) |
| `STORAGE_DOCUMENTS_BUCKET` | string | `wealthos-documents` | Bucket for statement files and attachments |
| `STORAGE_VAULT_BUCKET` | string | `wealthos-vault` | Bucket for client-side encrypted vault files |

---

## 6. Frontend Web Client (Next.js)

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | string | `http://localhost:8000` | Public API endpoint reachable from browser |
| `BACKEND_API_INTERNAL_URL` | string | `http://localhost:8000` | Internal server-side API proxy destination |
