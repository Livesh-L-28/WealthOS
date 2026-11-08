# WealthOS — Load Testing Plan & Performance Validation Protocol

**Programme:** WealthOS Enterprise Architecture & Production Readiness  
**Document:** Load Testing Plan  
**Date:** 2026-11-08  
**Status:** Approved Performance Protocol  
**Testing Framework:** Locust / k6  
**Author:** Performance & Scalability Engineer  

---

## 1. Load Testing Objectives & SLA Targets

WealthOS load testing validates that the platform sustains enterprise concurrency without degradation of financial correctness:

### Non-Negotiable Performance SLAs
- **Dashboard API P95 Latency:** $< 200\text{ms}$ under 1,000 concurrent active users.
- **Financial Transaction POST P99 Latency:** $< 150\text{ms}$ with 100% ACID double-entry balance enforcement.
- **HTTP Error Rate:** $< 0.01\%$ across all standard workloads.
- **Zero Financial Discrepancies:** Balance invariance $\sum\text{Dr} - \sum\text{Cr} = 0.0000$ verified before and after every load run.

---

## 2. Workload Test Profiles

### Profile 1: Peak Read Concurrency (Dashboard & Portfolio Queries)
- **Virtual Users (VU):** 500 concurrent users ramping over 3 minutes.
- **Mix:** 50% Dashboard summary (`GET /api/v1/twin`), 30% Investments (`GET /api/v1/investments`), 20% Tax estimates (`GET /api/v1/tax`).
- **Target:** Verify read replicas and Redis cache layer absorb traffic without primary CPU spiking $> 40\%$.

### Profile 2: High-Velocity Transaction Ingestion (General Ledger Stress)
- **Virtual Users:** 100 concurrent users creating balanced journal entries.
- **Endpoint:** `POST /api/v1/transactions`.
- **Target:** Verify PostgreSQL write path and connection pooler sustain $> 250$ write transactions/sec with zero locking deadlocks.

### Profile 3: Universal Document Upload & Async Processing
- **Virtual Users:** 30 concurrent uploads of statement PDFs (5–10 MB each).
- **Endpoint:** `POST /api/v1/documents/upload`.
- **Target:** Verify MinIO quarantine upload and Celery task enqueue latency remain under 500ms; verify worker pool consumes queue depth cleanly.

### Profile 4: Soak & Longevity Test
- **Virtual Users:** 250 steady concurrent users for 4 hours.
- **Target:** Detect memory leaks in Uvicorn/FastAPI, unclosed SQLAlchemy database sessions, or Redis key accumulation.

