# WealthOS Security Foundation & Architecture Policy

This document establishes the foundational security controls, cryptographic standards, and access control policies implemented across the WealthOS platform.

---

## 1. Zero-Trust Tenant Isolation

Every financial domain model in WealthOS inherits from `TenantScopedMixin`:

```python
class TenantScopedMixin:
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
```

- **Invariants**:
  1. Direct database queries must explicitly filter by `tenant_id`. Global cross-tenant reads or writes are strictly prohibited.
  2. The `X-Tenant-ID` header is extracted and injected into the async `contextvars` context on every request.

---

## 2. Cryptographic Security Standards

1. **Passwords**: Argon2id hashing with minimum 64MB memory cost, 3 iterations, and 4 degrees of parallelism.
2. **Secrets & Tokens**: AES-256-GCM authenticated encryption for sensitive integration secrets at rest.
3. **Session Tokens**: JWT with HMAC-SHA256 or asymmetric Ed25519 signing. Short-lived access tokens (15 minutes), rotating refresh tokens (7 days).

---

## 3. Object Storage Security (MinIO / S3)

1. **Private Buckets**: All buckets (`wealthos-documents`, `wealthos-vault`) are private by default with no public anonymous read or list policies.
2. **Signed URLs**: Document access requires time-limited presigned URLs (default 15-minute expiry).
3. **MIME & Size Validation**: Content-types are validated against a whitelist of permissible financial statement formats; uploads exceeding 50MB are rejected.
4. **Log Sanitization**: Sensitive document contents, financial balances, and passwords are never output to application logs.

---

## 4. Container & Infrastructure Hardening

1. **Non-Root Execution**: Dockerfiles run as dedicated system users (`wealthos` UID 1001, `nextjs` UID 1001).
2. **Isolated Networks**: Internal bridge network (`wealthos_network`) prevents external inspection of internal database and broker traffic.
3. **Healthcheck Boundaries**: Readiness probes verify backing services without exposing sensitive credentials or stack traces.

