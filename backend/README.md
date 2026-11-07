# WealthOS Backend Service (`backend/`)

Enterprise-grade FastAPI backend for WealthOS, providing high-concurrency async REST APIs, structured JSON logging, distributed Celery task queues, SQLAlchemy 2.0 async persistence, and MinIO S3 object storage abstraction.

---

## 1. Directory Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── health.py        # Health, liveness (/health/live), readiness (/health/ready)
│   │       └── __init__.py      # Version 1 router aggregator
│   ├── core/
│   │   ├── config.py            # Pydantic Settings v2 configuration
│   │   ├── database.py          # SQLAlchemy 2.0 async engine, session factory, mixins
│   │   ├── logging.py           # Structured JSON logger & contextvars correlation ID
│   │   └── __init__.py
│   ├── domains/                 # Modular financial domain entities (Phases 3+)
│   ├── infrastructure/
│   │   ├── celery_app.py        # Celery application factory, 3 isolated queues
│   │   ├── redis.py             # Async Redis connection pool
│   │   ├── storage.py           # S3/MinIO client, presigned URLs, MIME validation
│   │   └── __init__.py
│   ├── workers/
│   │   ├── health_tasks.py      # Diagnostic tasks (health_ping, ocr_preflight, heartbeat)
│   │   └── __init__.py
│   ├── main.py                  # Application factory, CORS, exception handlers, middleware
│   └── __init__.py
├── migrations/                  # Alembic database migration environment
│   ├── versions/
│   │   └── 0001_initial_schema.py # Initial baseline migration (uuid-ossp, pgcrypto)
│   ├── env.py                   # Async Alembic execution bridge
│   └── script.py.mako
├── tests/                       # Pytest test suite (25 automated unit tests)
│   ├── conftest.py              # Test fixtures & ASGI client
│   ├── test_celery.py           # Celery queues, factory & locking tests
│   ├── test_config.py           # Configuration tests
│   ├── test_health.py           # Health, liveness & readiness tests
│   └── test_storage.py          # S3/MinIO upload, validation & presigned URL tests
├── alembic.ini                  # Alembic migration configuration
├── Dockerfile                   # Multi-stage Python 3.12-slim container
└── pyproject.toml               # Poetry/PEP 621 dependencies & Ruff/Pytest config
```

---

## 2. Quickstart

### Prerequisites
- Python 3.12+
- Running PostgreSQL & Redis (e.g., via Docker Compose)

### Installation
```bash
# Install package in editable mode with development dependencies
python3 -m pip install -e ".[dev]"
```

### Running the API Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Running Celery Workers
```bash
# Default queue worker
celery -A app.infrastructure.celery_app.celery_app worker -Q default -l info

# OCR heavy queue worker
celery -A app.infrastructure.celery_app.celery_app worker -Q ocr_heavy -l info -c 2

# Market data feed worker
celery -A app.infrastructure.celery_app.celery_app worker -Q market_data -l info -c 2
```

---

## 3. Database Migrations

```bash
# Apply pending migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# Generate new migration from models
alembic revision --autogenerate -m "description"
```

---

## 4. Testing & Code Quality

```bash
# Run test suite
pytest -v

# Run linting with Ruff
ruff check .

# Run typechecking
mypy app
```

