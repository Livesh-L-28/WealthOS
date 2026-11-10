# WealthOS Production Deployment Guide

**Artifact Identifier:** `WEALTHOS-DEPLOYMENT-RELEASE-001`  
**Orchestration:** Docker Compose v2+ / OCI Containers  
**Topology:** PostgreSQL 16 + Redis 7 + FastAPI Backend + Next.js Web + Celery Worker + Celery Beat  
**Configuration Templates:** `configuration-templates/`  
**Compose Specification:** `docker-compose.prod.yml`  

---

## 1. Production Topology Overview

The container architecture defines a zero-shared-state, high-reliability deployment model:

```
[ Internet / Edge Proxy ]
           |
     +-----+-----+
     |           |
     v           v
 [ Web (3000) ] [ Backend API (8000) ]
                       |
        +--------------+--------------+
        |                             |
        v                             v
[ PostgreSQL 16 (5432) ]     [ Redis 7 (6379) ]
                                      ^
                                      |
                      +---------------+---------------+
                      |                               |
              [ Celery Worker ]               [ Celery Beat ]
```

### Container Services

1. **`db` (PostgreSQL 16):** Encrypted persistent storage, custom `init-extensions.sql` for `pgcrypto` and `uuid-ossp`, resource limits, strict health checks.
2. **`redis` (Redis 7 Alpine):** Persistent appendonly data, rate-limiting store, session cache, Celery message broker.
3. **`backend` (FastAPI):** Python 3.11 runtime, asynchronous request handling, database connection pooling.
4. **`celery_worker`:** Background processing for bank sync, document OCR, report generation, and notifications.
5. **`celery_beat`:** Cron task scheduler for daily portfolio revaluation, interest accrual, and backup verification.
6. **`web` (Next.js):** Production web portal with SSR and static asset caching.

---

## 2. Pre-Deployment Configuration

1. **Navigate to Deployment Directory:**
   ```bash
   cd WEALTHOS_FINAL_DELIVERY/DEPLOYMENT
   ```

2. **Generate Production Secrets:**
   ```bash
   # Generate high-entropy secrets
   export JWT_SECRET=$(openssl rand -hex 32)
   export POSTGRES_PASSWORD=$(openssl rand -hex 24)
   export ENCRYPTION_KEY=$(openssl rand -hex 32)
   ```

3. **Instantiate Environment File:**
   ```bash
   cp configuration-templates/.env.production.example .env
   # Edit .env and insert the generated secrets and your production domain names
   nano .env
   ```

---

## 3. Stack Deployment

### Step 1: Validate Configuration
```bash
docker compose -f docker-compose.prod.yml config
```

### Step 2: Build and Launch Services
```bash
# Pull base images, build local containers, and start in detached mode
docker compose -f docker-compose.prod.yml up -d --build
```

### Step 3: Monitor Startup & Health
```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Tail backend logs until database migrations complete
docker compose -f docker-compose.prod.yml logs -f backend
```

---

## 4. Disaster Recovery & Backup Routine

- **Automated DB Snapshot:**
  ```bash
  docker compose -f docker-compose.prod.yml exec -T db pg_dump -U postgres wealthos_db | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
  ```
- **Snapshot Restoration:**
  ```bash
  gunzip < backup_file.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d wealthos_db
  ```

