# WealthOS Phase 19 — Noisy-Neighbour Protection Architecture

## 1. Multi-Tenant Resource Fairness
In multi-tenant financial architectures, high-volume ingestion or automated batch processing by a single tenant must never degrade database connection pools, Celery background workers, or external API quotas for other tenants.

---

## 2. Protection Layers
1. **Per-Tenant Daily Quotas (`tenant_resource_quotas`)**: Hard caps on expensive operations (OCR documents, AI queries, heavy export reports).
2. **PostgreSQL Connection Pool Sizing**: Primary connection pool limited with aggressive timeouts (`pool_size=20, max_overflow=10, pool_timeout=30s`) to prevent runaway connection exhaustion.
3. **Dedicated Celery Task Queues**:
   - `high_priority`: User-initiated interactive requests (transfers, logins, passkey challenges).
   - `default`: Normal journal posting and standard queries.
   - `batch`: Long-running bulk document OCR and statement reconciliation.
4. **Rate Limiting**: Distributed token bucket rate-limiting via Redis (`app/core/rate_limiter.py`).

