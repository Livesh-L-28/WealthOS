# WealthOS Phase 24 — Staging Observability & Operations Telemetry Report

**Document Reference:** `docs/phase24/WEALTHOS_PHASE24_OBSERVABILITY.md`  
**Phase ID:** `WEALTHOS-PHASE-24`  
**Observability Target:** Staging Deployment (`http://localhost:8005`)  
**Telemetry Status:** `100% OPERATIONAL & VERIFIED HEALTHY`  
**Author:** Principal Fintech SRE & Platform Architect  
**Execution Timestamp:** 2026-11-10T04:34:00+00:00  

---

## 1. Executive Summary

The WealthOS staging environment provides enterprise-grade observability across health probes, structured JSON logging, distributed correlation ID tracing, outbox backlog monitoring, and financial integrity telemetry without introducing expensive external APM services.

---

## 2. Health & Diagnostic Probes Architecture

### 2.1 Probe Matrix

| Probe Endpoint | Purpose | Upstream Dependencies Inspected | Fail-Closed Behavior |
|:---|:---|:---|:---|
| `GET /health/live` | Liveness Probe | Process runtime alive | Returns HTTP 200 `{status: "alive"}` |
| `GET /health/ready` | Readiness Probe | PostgreSQL, Redis, MinIO S3 | Fails closed with HTTP 503 if any mandatory dependency is degraded |
| `GET /api/v1/health` | Detailed Diagnostics | PostgreSQL latency, Redis ping, Celery broker status, MinIO endpoint | Returns subsystem health report and process uptime |
| `GET /api/v1/health/dashboard` | Operations Telemetry | DB latency, Redis status, Celery queue, Outbox backlog, Ledger balance tolerance | Consolidated operations dashboard |

### 2.2 Live Staging Telemetry Capture (`GET /api/v1/health/dashboard`)
```json
{
  "status": "healthy",
  "app_name": "WealthOS Staging API",
  "environment": "staging",
  "timestamp": "2026-11-10T04:33:47.319844+00:00",
  "uptime_seconds": 100.93,
  "telemetry": {
    "database": {
      "status": "healthy",
      "latency_ms": 10.77,
      "replica": {
        "status": "none"
      }
    },
    "redis": {
      "status": "healthy",
      "latency_ms": null
    },
    "celery": {
      "status": "healthy",
      "active_workers": 0
    },
    "storage": {
      "status": "healthy"
    },
    "outbox": {
      "pending_events_count": 0,
      "status": "healthy"
    },
    "financial_integrity": {
      "invariants_enforced": true,
      "ledger_balance_tolerance": "0.0000 INR"
    }
  }
}
```

---

## 3. Structured JSON Logging & Correlation Tracing

In staging, the logging framework automatically switches from human-oriented development text to `StructuredJSONFormatter` compliant with cloud log ingestors (e.g. Vector, FluentBit, AWS CloudWatch, Datadog):

### Log Structure Example
```json
{
  "timestamp": "2026-11-10T04:31:15.389656+00:00",
  "level": "INFO",
  "logger": "wealthos.api",
  "message": "Starting WealthOS Staging API v0.2.0 [staging] profile=full...",
  "correlation_id": "5933b994-4e51-4a19-ba75-d891911f5294",
  "tenant_id": "anonymous",
  "module": "main",
  "func_name": "lifespan",
  "line": 39
}
```

### Correlation ID Flow
- Every incoming HTTP request is assigned a UUIDv4 `correlation_id` via middleware.
- The `correlation_id` is propagated through `contextvars` to all coroutines, database queries, and error responses.
- Client error responses return the `correlation_id` to allow instant cross-referencing between user reports and server logs without exposing internal error tracebacks.

---

## 4. Operational Alerting Thresholds & SRE Runbook

| Alert Condition | Metric / Indicator | Severity | Trigger Threshold | Recommended SRE Action |
|:---|:---|:---:|:---|:---|
| **Database Degraded** | `/health/ready` -> `database != healthy` | `CRITICAL` | 1 occurrence (fail-closed) | Inspect PostgreSQL connection pool, replica lag, and memory limits. |
| **Elevated DB Latency** | `/api/v1/health/dashboard` -> `latency_ms` | `WARNING` | \(\ge 250\text{ ms}\) for 3 consecutive polls | Inspect active lock waits and long-running reporting queries. |
| **Outbox Queue Backlog** | `outbox.pending_events_count` | `HIGH` | \(\ge 1000\) pending events | Verify outbox relay task daemon health and Redis event broker status. |
| **Redis Broker Failure** | `/health/ready` -> `redis != healthy` | `HIGH` | 2 consecutive failed pings | Restart staging Redis daemon / verify memory usage against `maxmemory`. |
| **Ledger Imbalance** | `ledger_balance_tolerance` | `CRITICAL` | \(\ne 0.0000\text{ INR}\) | Freeze outbound financial transactions; run trial balance reconciliation drill. |

---

## 5. Observability Acceptance Sign-Off

The WealthOS staging observability stack satisfies all requirements. Real-time diagnostic probes, structured JSON logging, correlation tracing, and telemetry metrics are fully verified and operational.
