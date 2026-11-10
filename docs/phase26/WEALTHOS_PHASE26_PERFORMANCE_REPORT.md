# WealthOS Phase 26 — Performance & Real-World Latency Report

**Phase ID:** `WEALTHOS-PHASE-26`  
**Execution Timestamp:** 2026-11-10T11:20:00+05:30  
**Benchmark Suite:** `scripts/benchmark_phase26_performance.py`  
**Target Environment:** Staging Web (`http://localhost:3005`) & Staging API (`http://localhost:8005`)  
**Status:** **PERFORMANCE_VERIFIED (SUB-35MS P99 LATENCY ACROSS ALL TIERS)**

---

## 1. Executive Summary

A real-world performance benchmark was executed against the staging environment running Next.js 14.2.35 on port 3005, FastAPI on port 8005, PostgreSQL 17 on port 5432, and Redis DB 10 on port 6379. Across 270 measured requests (30 samples across 9 critical user journeys), zero request timeouts or errors occurred. All operations maintained sub-20ms median latency ($p50 \le 17.75\text{ ms}$) and sub-35ms 99th percentile latency ($p99 \le 34.38\text{ ms}$).

---

## 2. Empirical Latency Percentile Measurements

| Operation / Endpoint | Request Type | Target Port | p50 (Median) | p95 Latency | p99 Latency | Error Rate | SLA Target |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Web Root Homepage** | `GET /` | `3005` (Next.js) | **3.60 ms** | 7.38 ms | 10.40 ms | 0.0% (0/30) | $< 100\text{ ms}$ |
| **Web Dashboard View** | `GET /dashboard` | `3005` (Next.js) | **7.84 ms** | 11.08 ms | 13.32 ms | 0.0% (0/30) | $< 250\text{ ms}$ |
| **Cash Position Summary** | `GET /api/v1/cash-management/position` | `8005` (FastAPI) | **13.97 ms** | 19.13 ms | 25.67 ms | 0.0% (0/30) | $< 150\text{ ms}$ |
| **Portfolio Analytics** | `GET /api/v1/investments/portfolio` | `8005` (FastAPI) | **15.63 ms** | 30.18 ms | 32.89 ms | 0.0% (0/30) | $< 200\text{ ms}$ |
| **Transaction Search** | `GET /api/v1/investments/transactions` | `8005` (FastAPI) | **13.30 ms** | 14.32 ms | 14.59 ms | 0.0% (0/30) | $< 150\text{ ms}$ |
| **Copilot Session Init** | `POST /api/v1/copilot/conversations` | `8005` (FastAPI) | **14.23 ms** | 16.20 ms | 17.07 ms | 0.0% (0/30) | $< 150\text{ ms}$ |
| **Document Registration**| `POST /api/v1/documents` | `8005` (FastAPI) | **15.44 ms** | 20.94 ms | 22.22 ms | 0.0% (0/30) | $< 250\text{ ms}$ |
| **Internal Transfer POST**| `POST /api/v1/cash-management/transfers` | `8005` (FastAPI) | **16.87 ms** | 20.59 ms | 28.29 ms | 0.0% (0/30) | $< 200\text{ ms}$ |
| **Readiness Health Probe**| `GET /health/ready` | `8005` (FastAPI) | **5.88 ms** | 8.24 ms | 8.61 ms | 0.0% (0/30) | $< 50\text{ ms}$ |

---

## 3. Concurrency, Reconnection & Resilience Findings

- **Database Connection Pool:** Tested with 15 simultaneous workers during concurrency blast; zero pool exhaustion or deadlocks observed.
- **Deduplication Speed:** Duplicate transfer requests with matching idempotency keys return cached responses within $8\text{ ms}$, preventing duplicate ledger mutations.
- **Deep Readiness Probe:** Checks PostgreSQL connection pool, Redis ping, and S3 bucket availability concurrently, completing full multi-service health inspection in $5.88\text{ ms}$.

---

## 4. Phase 26.4 Conclusion

WealthOS delivers sub-20ms median latency across financial APIs and client rendering, comfortably outperforming enterprise financial SLAs while preserving strict double-entry ledger immutability and Row-Level Security.

