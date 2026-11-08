# WealthOS — Phase 13 Observability, Telemetry & Logging Architecture

**Programme:** Wave 5 — Final Platform Integration and Acceptance  
**Phase:** Phase 13 — Enterprise Integration & Final Acceptance  
**Date:** 2026-11-08  

---

## 1. Observability Strategy & Pillars

WealthOS implements the three pillars of modern cloud observability:
1. **Structured JSON Logs**: Formatted for centralized log aggregators (ELK, Datadog, CloudWatch).
2. **Correlation ID & Distributed Tracing**: Unique `X-Correlation-ID` generated at API ingress and propagated through async Celery worker tasks.
3. **Multi-Level Health Checks**: Liveness, readiness, database pool metrics, and Redis broker connectivity.

---

## 2. Distributed Tracing & Request Context

Every incoming HTTP request traverses the logging and correlation middleware (`app.core.logging`):
- Generates or extracts `X-Correlation-ID` header.
- Context variables bind `correlation_id_ctx` and `tenant_id_ctx`.
- Log entries automatically include:
  ```json
  {
    "timestamp": "2026-11-08T10:15:30.123Z",
    "level": "INFO",
    "logger": "wealthos.api",
    "correlation_id": "c8a14b09-2819-482a-9cb8-a3f81e9d1234",
    "tenant_id": "029ad17e-ac8a-4080-b32a-f5d1bcb331ac",
    "method": "POST",
    "path": "/api/v1/integrations/sync",
    "status_code": 200,
    "duration_ms": 42.15
  }
  ```

---

## 3. Health & Diagnostic Probes

| Probe Endpoint | Target Port | Check Logic | Expected Response |
| :--- | :--- | :--- | :--- |
| `GET /health` | Port 8000 | Lightweight uptime check. | `{"status": "ok"}` |
| `GET /api/v1/health/liveness` | Port 8000 | Process memory and event loop responsiveness. | `{"status": "alive"}` |
| `GET /api/v1/health/readiness`| Port 8000 | PostgreSQL connection ping (`SELECT 1`), Redis PING, Celery worker status. | `{"status": "ready", "database": "connected", "redis": "connected"}` |
| Next.js Health Check | Port 3000 | Server rendering probe. | HTTP 200 on `/` and `/dashboard` |

---

## 4. Operational Metrics & Alert Thresholds

- **API Error Rate Alert**: Trigger if HTTP 5xx responses exceed 1% over 5 minutes.
- **API Latency Alert**: Trigger if p95 response time exceeds $250\text{ms}$ over 10 minutes.
- **Celery Queue Lag Alert**: Trigger if unprocessed items in `ocr` or `default` queues exceed 100 items.
- **Unbalanced Ledger Alert (P0 Critical)**: Trigger immediately if any journal entry fails the zero-sum invariance check.

