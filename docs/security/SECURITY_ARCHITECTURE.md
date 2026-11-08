# WealthOS — Security Architecture Specification

## 1. Architectural Philosophy: Security by Design & Defense in Depth

WealthOS implements a defense-in-depth model across 5 concentric security rings:
1. **Perimeter & Transport**: TLS 1.3, strict HSTS, reverse proxy IP validation, rate limiters.
2. **Edge & Presentation**: Next.js Edge Middleware, CSP with zero unsafe-eval, CSRF Origin protection, WCAG 2.1 AA accessible fallbacks.
3. **Application & Identity**: Shared authoritative identity engine, Argon2id passwords, TOTP MFA, step-up verification, RBAC deny-by-default.
4. **Data Isolation**: PostgreSQL Row-Level Security (`FORCE ROW LEVEL SECURITY`), transaction-local context, pooled connection sanitization.
5. **Storage & Infrastructure**: Private S3 buckets, non-root containers (UID 1001), authenticated Redis, encrypted offsite backups.

---

## 2. Core Security Subsystems

### 2.1 Identity & Session Subsystem
- **Password Hasher**: Argon2id ($m=65536, t=3, p=4$) with per-user cryptographic salts.
- **Token Format**: EdDSA / RS256 asymmetric signed JWTs with short-lived access tokens (15m) and sliding-window refresh tokens (7d).
- **Session Revocation**: Database-backed `user_sessions` tracking active device sessions, remote revocation, and automatic invalidation on password change.

### 2.2 Tenant Isolation Subsystem
- **Principle**: Client-supplied `X-Tenant-ID` is treated as an unverified suggestion. The backend validates user membership before granting access.
- **Database Context**:
  `SELECT set_config('app.current_tenant_id', :tid, true)`
  Ensures isolation even if application-level SQL filtering is omitted.
- **Connection Pool Hygiene**:
  `reset_db_session_state` resets session variables to empty strings prior to returning connections to the pool.

### 2.3 Financial Transaction Safety
- Double-entry balance invariant ($\sum \text{Debits} == \sum \text{Credits}$).
- Transactional outbox engine with idempotency keys.
- Posted journal records are immutable; corrections require signed reversal entries.
