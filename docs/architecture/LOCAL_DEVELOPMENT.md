# WealthOS Local Development Guide

This guide details how to configure, boot, and develop on the WealthOS platform locally.

---

## 1. Prerequisites

Ensure the following tools are installed on your host system:

- **Node.js**: v20.x or higher (`node -v`)
- **Python**: 3.12.x or higher (`python3 --version`)
- **Docker & Docker Compose**: Docker Desktop 24+ (`docker --version`, `docker compose version`)
- **Git**: 2.40+ (`git --version`)

---

## 2. Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Review default development values in `.env`. The defaults are pre-configured to connect seamlessly to local services booted via Docker Compose.

---

## 3. Option A: Full Docker Compose Development (Recommended)

Boot all services in containerized isolation:

```bash
# Start all services (PostgreSQL, Redis, MinIO, FastAPI Backend, Celery Workers, Next.js Web)
docker compose up -d

# Check service status and healthchecks
docker compose ps

# Tail logs across all services
docker compose logs -f

# Tail logs for a specific service
docker compose logs -f backend-api
docker compose logs -f web
docker compose logs -f celery-worker-ocr
```

### Accessing Local Services:
- **Next.js Web Client**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend API**: [http://localhost:8000](http://localhost:8000)
- **FastAPI Interactive Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Backend Health Check**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
- **MinIO Storage Console**: [http://localhost:9001](http://localhost:9001) (`minioadmin` / `minioadminpassword`)
- **PostgreSQL**: `localhost:5432` (`wealthos_admin` / `wealthos_local_dev_password_change_in_prod`)
- **Redis**: `localhost:6379`

---

## 4. Option B: Hybrid Development (Fast Local Iteration)

In hybrid mode, you run infrastructure dependencies (Database, Redis, MinIO) in Docker, while running the Backend API, Celery workers, and Frontend Web client directly on your host machine for live reload.

### Step 1: Start Supporting Infrastructure Only
```bash
docker compose up -d postgres redis minio minio-init
```

### Step 2: Run Backend API & Celery Worker
```bash
# In terminal 1 (Backend API)
cd backend
python3 -m pip install -e ".[dev]"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# In terminal 2 (Celery Workers)
cd backend
celery -A app.infrastructure.celery_app.celery_app worker -Q default,ocr_heavy,market_data -l info
```

### Step 3: Run Next.js Web Client
```bash
# In terminal 3 (Frontend)
npm install
npm run dev --workspace=@wealthos/web
```

---

## 5. Running Database Migrations

Apply Alembic migrations to bring the database schema up to date:

```bash
# Using Alembic inside backend directory
cd backend
alembic upgrade head

# Roll back the most recent migration
alembic downgrade -1
```

---

## 6. Running Tests

### Backend Test Suite
```bash
cd backend
pytest -v
```

### Monorepo TypeScript & Lint Checks
```bash
npm run typecheck
npm run lint
```
