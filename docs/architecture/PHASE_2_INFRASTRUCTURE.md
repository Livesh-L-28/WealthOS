# WealthOS Phase 2 — Enterprise Infrastructure & Monorepo Foundation

## 1. Architectural Scope & Objectives

WealthOS Phase 2 establishes the runnable, enterprise-grade engineering and infrastructure baseline for the entire multi-tenant platform.

Building on the Phase 0 Architectural Blueprint and Phase 1 Human-Designed UI/UX Specifications, Phase 2 implements:

1. **Modular Monorepo Structure**:
   - Monorepo with npm workspaces managing web client (`apps/web`), mobile foundation (`apps/mobile`), and shared packages (`packages/design-tokens`, `packages/shared-types`, `packages/api-client`).
2. **FastAPI Application Runtime**:
   - Python 3.12+ async architecture using FastAPI with Pydantic v2 Settings.
   - Structured JSON logging with request correlation ID tracking across async calls.
   - Centralized HTTP and unexpected exception handlers returning sanitized error payloads.
   - Kubernetes/container health, readiness, and metrics endpoints (`/healthz`, `/readyz`, `/metrics`, `/api/v1/health`).
3. **Database & Persistence Tier**:
   - PostgreSQL 16+ using SQLAlchemy 2.x async engine with connection pooling and pre-ping verification.
   - Database mixins: UUID primary keys, audit timestamps, soft deletion, and strict tenant isolation (`tenant_id`, `user_id`).
   - Async Alembic migration pipeline with baseline schema.
4. **Asynchronous Distributed Task Processing**:
   - Redis 7.2 as both low-latency cache and Celery task broker.
   - Three isolated Celery task queues:
     - `default`: transactional jobs and notifications.
     - `ocr_heavy`: document and statement parsing with isolated worker concurrency.
     - `market_data`: market data feed ingestion and ticker heartbeats.
5. **Encrypted Object Storage Tier**:
   - S3-compatible MinIO object storage with auto-provisioned buckets:
     - `wealthos-documents`: raw document statements.
     - `wealthos-vault`: encrypted financial statements and tax filings.
   - Presigned URL generation for secure zero-trust downloads.
6. **Next.js 14 Web Foundation**:
   - Handcrafted App Router layout using design tokens.
   - Reconciled 65-screen information architecture navigation in Sidebar.
   - Zero fake metrics: genuine onboarding and initialization empty states.
7. **React Native Expo Mobile Foundation**:
   - Clean mobile foundation with dark theme tokens and responsive layouts.
8. **Containerization & CI**:
   - Complete multi-service `docker-compose.yml` with healthchecks.
   - Multi-stage Dockerfiles.
   - Automated GitHub Actions CI workflow.

---

## 2. Infrastructure Architecture & Service Topology

```
                                  ┌──────────────────────────────┐
                                  │      Client Applications     │
                                  │ Next.js Web (Port 3000)      │
                                  │ React Native Expo Mobile     │
                                  └──────────────┬───────────────┘
                                                 │
                                                 │ HTTP / JSON API
                                                 ▼
                                  ┌──────────────────────────────┐
                                  │     FastAPI Backend API      │
                                  │         (Port 8000)          │
                                  │   - Correlation Middleware   │
                                  │   - Centralized Errors       │
                                  │   - Health / Ready Probes    │
                                  └───────┬──────────────┬───────┘
                                          │              │
                   ┌──────────────────────┴──────┐       │ Storage API
                   │ Async Database              │       │
                   ▼                             ▼       ▼
       ┌──────────────────────┐        ┌──────────────────────┐
       │    PostgreSQL 16     │        │     MinIO Storage    │
       │     (Port 5432)      │        │  (Ports 9000 / 9001) │
       │  - uuid-ossp         │        │  - wealthos-documents│
       │  - pgcrypto          │        │  - wealthos-vault    │
       │  - btree_gist        │        └──────────────────────┘
       └──────────────────────┘                   ▲
                                                  │ OCR Processing
                   ┌──────────────────────────────┴──────┐
                   │ Redis 7.2 (Port 6379)               │
                   │ - DB 0: Application Cache           │
                   │ - DB 1: Celery Broker               │
                   │ - DB 2: Celery Result Backend       │
                   └──────────────┬──────────────────────┘
                                  │
                                  │ Task Dispatch
                                  ▼
           ┌──────────────────────────────────────────────┐
           │            Celery Worker Fleet               │
           │  - celery-worker-default (Queue: default)    │
           │  - celery-worker-ocr     (Queue: ocr_heavy)  │
           │  - celery-worker-market  (Queue: market_data)│
           └──────────────────────────────────────────────┘
```

---

## 3. Directory Layout

```
wealthos/
├── .github/
│   └── workflows/
│       └── ci.yml                 # Automated CI: backend tests, typecheck, docker validation
├── apps/
│   ├── web/                       # Next.js 14 App Router Web Client
│   │   ├── src/
│   │   │   ├── app/               # Layout, Dashboard, Pages
│   │   │   ├── components/        # Handcrafted UI Components (Card, Button, Sidebar, Header)
│   │   │   ├── styles/            # Tailwind and Design Token Globals
│   │   │   └── lib/               # Client utilities
│   │   ├── Dockerfile             # Multi-stage Web container
│   │   └── package.json
│   └── mobile/                    # React Native Expo Mobile Client
│       ├── App.tsx                # Mobile root component
│       ├── app.json
│       └── package.json
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── health.py      # Health, liveness, and readiness endpoints
│   │   ├── core/
│   │   │   ├── config.py          # Pydantic Settings configuration
│   │   │   ├── database.py        # SQLAlchemy 2.0 async engine & mixins
│   │   │   └── logging.py         # Structured JSON logging & correlation IDs
│   │   ├── domains/               # Domain logic (Phases 3+)
│   │   ├── infrastructure/
│   │   │   ├── celery_app.py      # Celery task configuration & queues
│   │   │   ├── redis.py           # Async Redis connection pool
│   │   │   └── storage.py         # MinIO/S3 object storage client
│   │   ├── workers/
│   │   │   └── health_tasks.py    # Health & diagnostic worker tasks
│   │   └── main.py                # FastAPI application factory & middleware
│   ├── migrations/                # Alembic async migration environment
│   ├── tests/                     # Pytest suite
│   ├── Dockerfile                 # Multi-stage Python 3.12 container
│   └── pyproject.toml             # Python dependencies
├── packages/
│   ├── design-tokens/             # WCAG AA compliant design tokens & Tailwind preset
│   ├── shared-types/              # TypeScript types for API contracts & financial domains
│   └── api-client/                # Typed isomorphic fetch client
├── infrastructure/
│   └── docker/
│       └── postgres/
│           └── init-extensions.sql # PostgreSQL extensions initializer
├── docker-compose.yml             # Full local development cluster
├── .env.example                   # Complete configuration reference
└── README.md                      # Project documentation
```

---

## 4. Port and Network Allocations

| Service | Container Port | Host Port | Protocol | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `web` | 3000 | 3000 | HTTP | Next.js 14 App Router UI |
| `backend-api` | 8000 | 8000 | HTTP | FastAPI REST API |
| `postgres` | 5432 | 5432 | TCP | PostgreSQL 16 Database |
| `redis` | 6379 | 6379 | TCP | Redis Cache & Message Broker |
| `minio` | 9000 | 9000 | HTTP / S3 | MinIO S3 API Endpoint |
| `minio` (Console) | 9001 | 9001 | HTTP | MinIO Web Management Console |
