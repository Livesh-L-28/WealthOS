# WealthOS Docker & Containerization Guide

This document describes the container architecture, multi-stage builds, volume topologies, and networking design.

---

## 1. Container Service Architecture

The local development cluster defined in `docker-compose.yml` includes 8 isolated services:

| Service Name | Base Image / Context | Purpose |
| :--- | :--- | :--- |
| `postgres` | `postgres:16-alpine` | Primary transactional relational database |
| `redis` | `redis:7.2-alpine` | In-memory cache and task queue broker |
| `minio` | `minio/minio:RELEASE.2024-05-10T01-41-38Z` | S3-compatible financial statement and document storage |
| `minio-init` | `minio/mc:RELEASE.2024-05-09T17-04-24Z` | One-shot bucket provisioner (`wealthos-documents`, `wealthos-vault`) |
| `backend-api` | Multi-stage `backend/Dockerfile` | FastAPI REST API service |
| `celery-worker-default` | Multi-stage `backend/Dockerfile` | Celery daemon for default transactional queue |
| `celery-worker-ocr` | Multi-stage `backend/Dockerfile` | Celery daemon for isolated, memory-intensive OCR extraction |
| `celery-worker-market` | Multi-stage `backend/Dockerfile` | Celery daemon for market data feed polling and updates |
| `web` | Multi-stage `apps/web/Dockerfile` | Next.js 14 Web Application |

---

## 2. Multi-Stage Dockerfile Strategy

### Backend Dockerfile (`backend/Dockerfile`)
1. **Builder Stage**:
   - Uses `python:3.12-slim` with build dependencies (`build-essential`, `libpq-dev`).
   - Compiles binary wheels into `/build/wheels`.
2. **Runner Stage**:
   - Uses clean `python:3.12-slim` containing only minimal runtime libraries (`libpq5`, `curl`).
   - Installs pre-built wheels without leaving build tools or caches.
   - Runs as non-root user `wealthos` (UID 1001) for strict security compliance.

### Web Dockerfile (`apps/web/Dockerfile`)
1. **Deps Stage**:
   - Uses `node:20-alpine` with `libc6-compat`.
   - Copies package definitions and runs `npm ci`.
2. **Builder Stage**:
   - Builds shared workspace packages (`@wealthos/design-tokens`, `@wealthos/shared-types`, `@wealthos/api-client`).
   - Builds Next.js production bundle.
3. **Runner Stage**:
   - Copies production assets and runs Next.js server under non-root `nextjs` user.

---

## 3. Storage Persistence & Named Volumes

All stateful data is preserved in named volumes:
- `wealthos_postgres_data`: Database tables, indexes, write-ahead logs.
- `wealthos_redis_data`: Append-only file (AOF) persistence for cache and jobs.
- `wealthos_minio_data`: Ingested PDF statements, attachments, and encrypted artifacts.

To wipe local development state completely:
```bash
docker compose down -v
```

---

## 4. Container Healthchecks & Dependency Graph

Containers boot in strict dependency order:
```
postgres (healthy) ──┐
redis (healthy)    ──┼──> backend-api (healthy) ──┬──> celery-worker-default
minio (healthy)    ──┤                            ├──> celery-worker-ocr
minio-init (done)  ──┘                            ├──> celery-worker-market
                                                  └──> web (UI)
```
- PostgreSQL: `pg_isready`
- Redis: `redis-cli ping`
- MinIO: `curl -f http://localhost:9000/minio/health/live`
- Backend API: `curl -f http://localhost:8000/healthz`
