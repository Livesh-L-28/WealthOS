# WealthOS Reproducible Performance & Latency Benchmark Report

## 1. Executive Summary & Methodology

This report documents the performance, latency distribution, throughput, and error rates of the WealthOS API application stack under reproducible local testing.

- **Date:** 2026-11-08T05:32:32Z
- **Benchmark Tool:** `scripts/performance_benchmark.py`
- **Execution Command:**
  ```bash
  python3 scripts/performance_benchmark.py --iterations 100 --warmup 10 --output scripts/benchmark_results.json
  ```
- **Machine Specifications:** Apple Silicon Mac (M1 Pro, 16 GB Unified RAM)
- **Container Architecture:** Containerized PostgreSQL 16.8, Redis 7.2.7, MinIO, and FastAPI/Uvicorn
- **Warm-Up Phase:** 10 requests per endpoint to eliminate cold-start and JIT noise
- **Measurement Sample:** 100 sequential requests per endpoint (400 total requests)
- **Error Rate:** **0.0%** across all endpoints

---

## 2. Latency Percentiles & Throughput Results

| Endpoint Name | HTTP Method & Path | Throughput (RPS) | p50 (ms) | p90 (ms) | p95 (ms) | p99 (ms) | Mean (ms) | Min (ms) | Max (ms) | Std Dev | Error Rate |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Liveness Probe** | `GET /health/live` | **731.73** | 1.33 | 1.43 | 1.51 | 1.66 | 1.35 | 1.16 | 3.07 | 0.19 | 0.0% |
| **Readiness Probe** | `GET /health/ready` | **242.93** | 3.84 | 4.33 | 4.62 | 9.24 | 4.09 | 3.37 | 9.55 | 0.99 | 0.0% |
| **Detailed Health Probe** | `GET /api/v1/health` | **166.30** | 5.89 | 6.25 | 6.75 | 8.75 | 5.97 | 5.30 | 9.74 | 0.58 | 0.0% |
| **Authenticated User Profile** | `GET /api/v1/auth/me` | **199.54** | 4.81 | 5.16 | 5.22 | 6.16 | 4.97 | 4.29 | 17.92 | 1.33 | 0.0% |

---

## 3. Analysis of Latency Profiles & Subsystem Contributions

1. **Lightweight In-Memory Liveness (`/health/live`):**
   - p50: **1.33ms**, p95: **1.51ms**, p99: **1.66ms**.
   - Standard deviation is tiny (0.19ms), demonstrating consistent event-loop dispatch without blocking operations.

2. **Database & Redis Connectivity Probe (`/health/ready`):**
   - p50: **3.84ms**, p95: **4.62ms**.
   - Reflects true async roundtrip to PostgreSQL connection pool (`SELECT 1`) and Redis (`PING -> PONG`).

3. **Subsystem Diagnostic Inspection (`/api/v1/health`):**
   - p50: **5.89ms**, p95: **6.75ms**.
   - Validates all four critical infrastructure backends: PostgreSQL, Redis, MinIO S3 storage, and Celery broker reachability.

4. **Authenticated JWT Session Resolution (`/api/v1/auth/me`):**
   - p50: **4.81ms**, p95: **5.22ms**, p99: **6.16ms**.
   - Incurs cryptographic HMAC SHA-256 JWT signature verification, database session lookup, and multi-tenant workspace membership aggregation. Even with database queries, p95 stays below 5.3ms.

---

## 4. Production Tuning & Scaling Recommendations

1. **Uvicorn Concurrency:** In containerized production, run with multiple Uvicorn worker processes (`--workers 4` per pod) behind NGINX or AWS ALB.
2. **Database Connection Pool Tuning:** Maintain `pool_size=20, max_overflow=10` with NullPool in ephemeral CLI/script processes.
3. **Session Cache Priming:** Frequently queried user session state and tenant permissions can be cached in Redis with a 300s TTL and cache-invalidation hooks on membership change.
