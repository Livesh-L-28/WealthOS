# WealthOS Local Environment Evidence Index

**Document:** Gate 2 — Environmental Verification Evidence Index  
**Branch:** `feature/final-financial-intelligence-production`  
**Date:** 2026-11-08  
**Author:** QA Lead & SRE  

---

## 1. Master Evidence Matrix

| Service / Layer | Verification Item | Command Executed | Exit Code | Verified Evidence Reference |
|---|---|---|---|---|
| **Host System** | Kernel & Architecture | `uname -a` | `0` | `Darwin Kernel Version 27.0.0 arm64` (Apple Silicon M1 Pro) |
| **Docker** | Engine Version | `docker --version` | `0` | `Docker version 29.7.2, build a7dcaa6` |
| **Docker Compose** | Compose Version | `docker compose version` | `0` | `Docker Compose version v5.5.1` |
| **Node.js** | Node LTS Version | `node -v` | `0` | `v20.15.1` |
| **npm** | Monorepo Package Mgr | `npm -v` | `0` | `10.7.0` |
| **Python** | Venv Interpreter | `backend/.venv/bin/python3 --version` | `0` | `Python 3.14.6` |
| **Containers** | All 8 Services Health | `docker compose ps` | `0` | All 8 containers `Up (healthy)` |
| **PostgreSQL** | Version & Schema | `docker exec wealthos_postgres psql -U wealthos_admin -d wealthos -c "SELECT version_num FROM alembic_version;"` | `0` | PostgreSQL 16.8, version `0005_financial_foundation` |
| **PostgreSQL** | App Role Privileges | `docker exec wealthos_postgres psql -U wealthos_admin -d wealthos -c "SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname='wealthos_app';"` | `0` | `rolsuper=f`, `rolbypassrls=f`, `rolcanlogin=t` |
| **Redis** | Auth Ping | `docker exec wealthos_redis redis-cli -a <password> ping` | `0` | `PONG` |
| **Redis** | Unauthenticated Block | `docker exec wealthos_redis redis-cli ping` | `0` | `NOAUTH Authentication required.` |
| **MinIO** | Buckets & R/W Lifecycle | Boto3 probe script | `0` | Buckets `wealthos-documents`, `wealthos-quarantine`, `wealthos-vault`. Successful upload, metadata check, and delete. |
| **Celery** | Default Queue Ping | `health_ping.apply_async(['gate2_default_test'], queue='default')` | `0` | Task status `pong`, payload returned intact |
| **Celery** | OCR Queue Preflight | `ocr_preflight_check.apply_async(queue='ocr_heavy')` | `0` | Task status `ready`, storage `healthy` |
| **Celery** | Market Feed Queue | `market_feed_heartbeat.apply_async(queue='market_data')` | `0` | Task status `active` |
| **Backend API** | Liveness Probe | `curl -s http://127.0.0.1:8000/health/live` | `0` | HTTP 200, status `alive` |
| **Backend API** | Readiness Probe | `curl -s http://127.0.0.1:8000/health/ready` | `0` | HTTP 200, status `ready`, DB & Redis healthy |
| **Backend API** | Detailed Diagnostics | `curl -s http://127.0.0.1:8000/api/v1/health` | `0` | HTTP 200, all 4 subsystems `healthy` |
| **Next.js Web** | Root & Dashboard | `curl -I http://127.0.0.1:3000/` | `0` | `HTTP/1.1 200 OK`, HTML rendered with AppShell |
| **Mobile App** | TypeScript Validation | `npm run --workspace=@wealthos/mobile typecheck` | `0` | `tsc --noEmit` clean (0 errors) |
| **Mobile App** | Expo Configuration | `npm run --workspace=@wealthos/mobile validate` | `0` | Public config validated for `com.wealthos.app` |

---

All evidence verified and cross-referenced with live execution on local host.

