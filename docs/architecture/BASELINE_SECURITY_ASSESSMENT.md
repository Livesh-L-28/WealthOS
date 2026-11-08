# WealthOS — Baseline Security Assessment & Threat Analysis

**Programme:** WealthOS Enterprise Architecture & Production Readiness  
**Document:** Baseline Security Assessment  
**Commit SHA:** `b221558f522b2d553d7b30ff6640a481c04ed135`  
**Active Branch:** `feature/final-financial-intelligence-production`  
**Date:** 2026-11-08  
**Author:** Application Security Engineer & Principal Architect  

---

## 1. Executive Summary

This assessment benchmarks the security posture of WealthOS at commit `b221558f522b2d553d7b30ff6640a481c04ed135`. WealthOS processes high-sensitivity personal financial data (PFI), bank transactions, net worth figures, and broker credentials. Therefore, zero-trust controls, cryptographic data isolation, defense-in-depth, and strict session management are foundational requirements.

The empirical evaluation identifies strong cryptographic ledger integrity and multi-tenant RLS enforcement, but highlights two urgent vulnerabilities requiring immediate remediation:
1. **Client Session Storage:** JWT tokens and tenant IDs are currently stored in browser `localStorage`.
2. **Missing HTTP Security Headers:** Next.js production server lacks CSP, HSTS, and frame protection.

---

## 2. Authentication & Credential Architecture

| Security Mechanism | Current Implementation | Standard Requirement | Compliance Status |
|---|---|---|---|
| **Password Hashing** | Passlib / `bcrypt` with 12 rounds (`work_factor=12`). | OWASP Password Storage Cheat Sheet recommends bcrypt $\ge$ 10 rounds or Argon2id. | **Compliant** |
| **Token Format** | JWT signed with HMAC-SHA256 (`HS256`). | RFC 7519 compliant with issuer, subject, expiration, and unique `jti`. | **Compliant** |
| **Token Expiry** | Access tokens: 60 minutes. Refresh tokens: 7 days. | Short-lived access tokens with secure refresh rotation. | **Compliant** |
| **Token Revocation** | Redis key `blacklist:{jti}` with TTL matching remaining token lifespan. | Immediate revocation capability upon user logout. | **Compliant** |
| **Client Storage** | Browser `localStorage` (`wealthos_access_token`, `wealthos_current_tenant_id`). | Sensitive session tokens must be stored in `HttpOnly`, `SameSite=Lax`, `Secure` cookies. | **Non-Compliant (High Risk)** |

> [!WARNING]
> **Vulnerability Finding (SEC-01 - High Severity):**  
> Storing JWT access tokens in `localStorage` exposes authenticated sessions to Cross-Site Scripting (XSS) token exfiltration. Remediating this to `HttpOnly` cookies is scheduled for Phase 6.

---

## 3. Multi-Tenancy & Row-Level Security (RLS)

WealthOS implements a shared-database, shared-schema multi-tenant model. Tenant data segregation is enforced at the database kernel level through PostgreSQL Row-Level Security (RLS) rather than relying exclusively on application ORM filtering.

- **Tables Enforced:** 65 out of 81 tables have `ALTER TABLE <table_name> FORCE ROW LEVEL SECURITY` active.
- **Runtime Application Role:** `wealthos_app` (restricted role without table owner bypass privileges).
- **Session Injection:** Every SQLAlchemy session sets a transaction-local tenant identifier:
  ```sql
  SET LOCAL app.current_tenant_id = '<uuid>';
  ```
- **RLS Policy Predicate:**
  ```sql
  CREATE POLICY tenant_isolation_policy ON <table>
    FOR ALL
    TO wealthos_app
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
  ```
- **Verification Evidence:**
  The automated test `tests/test_rls_isolation.py` explicitly provisions two isolated tenants (`Tenant Alpha` and `Tenant Beta`), creates entries under Alpha, switches the connection context to Beta, and executes queries. In all cases, Beta reads 0 records and cannot update or delete Alpha records.

---

## 4. Cryptographic Key Management & Envelope Encryption

Provider credentials, bank tokens, and Account Aggregator refresh tokens are encrypted at rest using AES-256-GCM envelope encryption:

1. **Master Key:** Sourced from `WEALTHOS_INTEGRATIONS_MASTER_KEY` (base64 encoded 256-bit key).
2. **Key Derivation:** HKDF (HMAC-based Key Derivation Function) with SHA-256 derives a unique table/tenant-specific key.
3. **Envelope Packaging:**
   - 12-byte cryptographically secure random Initialization Vector (`IV` / nonce).
   - 16-byte authentication tag (`GCM Tag`) preventing ciphertext tampering.
   - Stored format: `{"iv": "<b64>", "tag": "<b64>", "ciphertext": "<b64>"}`.
4. **Negative Tamper Testing:** Unit tests verify that altering even a single bit of the ciphertext or tag raises an immediate decryption failure (`InvalidTag`), preventing plaintext recovery or bit-flipping attacks.

---

## 5. Webhook Security & Replay Prevention

External integrations (Account Aggregator notifications, broker webhooks) authenticate requests using cryptographic HMAC signatures:
- **Algorithm:** HMAC-SHA256 calculated over the raw request payload.
- **Timestamp Replay Window:** Webhooks enforce a strict 300-second window:
  $$\Delta t = |t_{\text{current}} - t_{\text{header}}| \le 300\text{ seconds}$$
  Requests older than 300 seconds or timestamps skewed into the future are rejected with HTTP 400.
- **Constant-Time Comparison:** Signature validation uses `hmac.compare_digest` to prevent timing attacks.

---

## 6. Financial Copilot & AI Defense

The AI Copilot operates with strict security guardrails to prevent data leakage and unauthorized financial actions:
1. **Read-Only Tool Registry:** Copilot is bounded to 15 explicit read-only tools. It has zero access to transfer, create, edit, or delete database records.
2. **No Raw SQL / Shell:** The LLM cannot execute arbitrary SQL queries or operating system commands.
3. **Prompt Injection Filter:** All incoming user prompts pass through pre-execution regex scanners that detect and neutralize common jailbreaks (`ignore previous instructions`, `system override`, `DAN`, `act as root`).
4. **Tenant Context Boundary:** All tool queries are executed strictly within the caller's authorized tenant context.

---

## 7. Dependency Vulnerability Scans

### Backend Python Dependencies (`pip-audit`)
- **Execution Date:** 2026-11-08
- **Tool:** `pip-audit`
- **Result:** **0 known vulnerabilities found** across all installed Python packages (FastAPI, SQLAlchemy, Celery, Pydantic, asyncpg, etc.).

### Frontend Node Dependencies (`npm audit`)
- **Execution Date:** 2026-11-08
- **Tool:** `npm audit` across workspace packages
- **Summary:** 47 vulnerabilities (3 low, 27 moderate, 14 high, 3 critical).
- **Analysis:** Vulnerabilities reside in transitive build dependencies (e.g., `@xmldom/xmldom` in older expo build tools, `tar` in older devDependencies, `postcss` in webpack loaders). No vulnerabilities directly expose backend API or database endpoints. Scheduled for remediation in Phase 15.

---

## 8. OWASP Top 10 (2021) Compliance Matrix

| OWASP Vulnerability Category | Status | Current Safeguards & Gaps |
|---|---|---|
| **A01: Broken Access Control** | **Pass (Backend)** / **Remediation Needed (Client)** | Backend enforces 65 RLS tables and role-based policies. Client needs migration to `HttpOnly` cookies. |
| **A02: Cryptographic Failures** | **Pass** | Passwords hashed with bcrypt (12 rounds). Integration secrets encrypted with AES-256-GCM. HTTPS enforced. |
| **A03: Injection** | **Pass** | SQLAlchemy parameterized queries prevent SQL injection. Copilot has no SQL execution. |
| **A04: Insecure Design** | **Pass** | Double-entry general ledger prevents money creation; RPO/RTO disaster recovery designs. |
| **A05: Security Misconfiguration** | **Remediation Needed** | Next.js lacks production HTTP security headers (CSP, HSTS). Scheduled for Phase 13. |
| **A06: Vulnerable Components** | **Pass (Python)** / **Remediation Needed (Node)** | Python dependencies clean; Node build tool dependencies require update. |
| **A07: Identification & Auth Failures** | **Pass** | Redis token revocation blacklist active; bcrypt work factor 12; strong password policies. |
| **A08: Software & Data Integrity Failures** | **Pass** | HMAC-SHA256 webhook signatures with 300s replay prevention; MinIO quarantine checks. |
| **A09: Security Logging & Monitoring** | **Partial** | Structured JSON logs generated; Prometheus scraping and alert triggers scheduled for Phase 12. |
| **A10: Server-Side Request Forgery (SSRF)** | **Pass** | External provider webhooks use allowlisted domain endpoints; document uploads quarantined locally. |

