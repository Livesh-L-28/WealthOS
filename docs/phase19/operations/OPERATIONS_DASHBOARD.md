# WealthOS Phase 19 — Central Operations Dashboard Specification

## 1. Endpoint Overview
- **Path**: `GET /api/v1/health/dashboard`
- **Authentication**: Public health diagnostic probe / Internal SRE collector
- **Response Format**: Application/JSON

## 2. Sample Telemetry Payload
```json
{
  "status": "healthy",
  "app_name": "WealthOS Backend API",
  "environment": "production",
  "timestamp": "2026-11-08T18:51:00Z",
  "uptime_seconds": 3840.5,
  "telemetry": {
    "database": {
      "status": "healthy",
      "latency_ms": 1.45,
      "replica": {
        "status": "healthy",
        "latency_ms": 1.82
      }
    },
    "redis": {
      "status": "healthy",
      "latency_ms": 0.85
    },
    "celery": {
      "status": "healthy",
      "active_workers": 3
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
