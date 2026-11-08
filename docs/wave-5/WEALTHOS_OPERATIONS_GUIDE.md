# WealthOS — Platform Operations & System Administration Guide

**Product:** WealthOS Financial Management Platform  
**Target Audience:** Site Reliability Engineers, DevOps, System Administrators  
**Date:** 2026-11-08  

---

## 1. Environment & Service Architecture

WealthOS runs as a multi-container Docker application:

| Container Name | Service Role | Image / Runtime | Host Port | Health Check |
| :--- | :--- | :--- | :--- | :--- |
| `wealthos_backend_api` | FastAPI REST Application | Python 3.12 / 3.14 Uvicorn | `127.0.0.1:8000` | HTTP 200 `/health` |
| `wealthos_postgres` | Primary Database | PostgreSQL 16.4 | `127.0.0.1:5432` | `pg_isready -U wealthos_admin` |
| `wealthos_redis` | Cache & Message Broker | Redis 7.2 | `127.0.0.1:6379` | `redis-cli ping` |
| `wealthos_minio` | S3 Object Storage | MinIO RELEASE.2024 | `127.0.0.1:9000-9001` | MinIO health probe |
| `wealthos_worker_ocr` | Celery Worker (OCR) | Python Celery Pool | Queue: `ocr` | Celery ping |
| `wealthos_worker_market` | Celery Worker (Market) | Python Celery Pool | Queue: `market`| Celery ping |
| `wealthos_worker_default`| Celery Worker (Default) | Python Celery Pool | Queue: `default`| Celery ping |
| Next.js Frontend | Production Web Server | Node 20 / Next.js 14 | `127.0.0.1:3000` | HTTP 200 `/` |

---

## 2. Common Administrative Operations

### 2.1 Starting Services
```bash
# Start all infrastructure and backend services
docker compose -f docker-compose.yml up -d

# Verify health status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### 2.2 Synchronizing Backend Code into Docker Container
Whenever code under `backend/app/` is modified in development:
```bash
docker cp backend/app wealthos_backend_api:/app/
docker restart wealthos_backend_api
```

### 2.3 Running Database Migrations
```bash
cd backend
.venv/bin/alembic upgrade head
```

### 2.4 Running Automated Verification Suites
```bash
# Backend pytest suite (291 tests)
cd backend && .venv/bin/pytest tests/ -q

# Frontend unit tests (35 tests)
npm test

# Static type check
npm run typecheck

# Web Next.js production build (27 static routes)
npm --prefix apps/web run build

# Playwright browser end-to-end suite (48 tests)
cd apps/web && npx playwright test
```

### 2.5 Executing Automated Disaster Recovery Drill
```bash
python3 scripts/disaster_recovery_exercise.py --force-drill
```

---

## 3. Security & Key Management

- **Secrets Rotation**:
  - `SECRET_KEY`: Rotated every 90 days.
  - `WEALTHOS_BACKUP_ENCRYPTION_KEY`: Separate 256-bit AES master key used for encrypted snapshot archives.
- **Access Control**:
  - The runtime container connects using the non-superuser role `wealthos_app`.
  - Superuser access (`wealthos_admin`) is restricted to database maintenance and disaster recovery scripts.

