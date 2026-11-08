# WealthOS — Security Baseline Audit Report

## 1. Executive Summary & Audit Scope

This document records the baseline security assessment across all tiers of the WealthOS Financial Management & Intelligence Operating System:
- **Web**: Next.js App Router, React Server/Client Components, Edge Middleware, Session handling.
- **Mobile**: React Native / Expo SDK 51, iOS Keychain, Android Keystore, Deep linking, Offline mutation queue.
- **Backend**: FastAPI modular monolith, JWT & Argon2id identity engine, PostgreSQL RLS, Redis Cache.
- **Storage & Infrastructure**: Private MinIO S3 object storage, Docker Compose network isolation, Non-root containers.

**Audit Standard**: OWASP ASVS 5.0 (Web), OWASP MASVS/MASTG (Mobile), OWASP API Security Top 10 (2023).

---

## 2. Identified Vulnerabilities & Baseline Findings

### SEC-FINDING-01: Storage of JWT Access Token in Unencrypted Browser `localStorage`
- **Component**: Next.js Web Client (`apps/web/src/lib/auth-context.tsx`, `api.ts`)
- **Severity**: **HIGH** (CVSS: 7.2)
- **Exploitability**: High if XSS occurs in third-party dependency.
- **Financial & Privacy Impact**: Exfiltrated token allows attacker full read/write access to user's net worth, bank balances, and investment records.
- **Reproduction Procedure**:
  1. Authenticate via web client.
  2. Open browser developer console: `localStorage.getItem('wealthos_access_token')`.
  3. Observe raw Bearer JWT token present in unencrypted persistent storage.
- **Recommended Remediation**:
  - Rely exclusively on backend HttpOnly, SameSite=Lax, Secure cookies.
  - Store token strictly in in-memory React context during active tab session; purge from `localStorage` immediately.
- **Verification Method**: `apps/web/src/webSecurity.test.ts` (Zero persistent tokens in localStorage test).
- **Status**: **RESOLVED** (Commit `8ee847f` / current hardening branch).

---

### SEC-FINDING-02: Silent Storage Fallback in Mobile Secure Storage Driver
- **Component**: React Native / Expo Mobile Client (`apps/mobile/src/storage.ts`)
- **Severity**: **HIGH** (CVSS: 7.5)
- **Exploitability**: Medium.
- **Financial & Privacy Impact**: If hardware SecureStore fails or returns null, application silently operated without encrypted storage, risking credential exposure.
- **Reproduction Procedure**:
  1. Instantiate `ExpoSecureStoreDriver` in an environment where native module is missing or corrupted.
  2. Attempt `setItemAsync('wealthos.secure.auth_token', 'token')`.
  3. Method completed silently without throwing, failing to persist securely.
- **Recommended Remediation**:
  - Implement `SecureStorageUnavailableError`.
  - Throw exception immediately if native hardware module is inaccessible (fail-closed).
- **Verification Method**: `apps/mobile/src/mobile.test.ts` (Fail-closed assertions).
- **Status**: **RESOLVED**.

---

### SEC-FINDING-03: Missing Next.js Edge Middleware & Disk-Caching of Financial Data
- **Component**: Next.js App Router (`apps/web/src/middleware.ts`)
- **Severity**: **MEDIUM** (CVSS: 5.3)
- **Exploitability**: Low (Requires shared or public terminal).
- **Financial & Privacy Impact**: Sensitive net worth and bank statements cached in browser HTTP cache on disk.
- **Reproduction Procedure**:
  1. Access `/dashboard` or `/accounts`.
  2. Inspect HTTP response headers: missing `Cache-Control: no-store`.
  3. Browser retains cached DOM state in history.
- **Recommended Remediation**:
  - Deploy edge middleware enforcing route authentication and injecting:
    `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, private`.
- **Verification Method**: `apps/web/src/webSecurity.test.ts`.
- **Status**: **RESOLVED**.

---

### SEC-FINDING-04: State-Changing CSRF Exposure for Cookie-Authenticated Requests
- **Component**: FastAPI Backend (`backend/app/main.py`)
- **Severity**: **HIGH** (CVSS: 7.5)
- **Exploitability**: Medium (Requires enticing authenticated user to click link).
- **Financial & Privacy Impact**: Cross-site form could trigger unauthorized state mutations (logout, settings change) if using cookie credentials.
- **Reproduction Procedure**:
  1. Send POST request with `wealthos_access_token` cookie and `Origin: https://attacker.com`.
  2. Request was processed without validating origin against allowed frontend hosts.
- **Recommended Remediation**:
  - Implement `csrf_origin_validation_middleware` in FastAPI checking `Origin`/`Referer` against `settings.CORS_ORIGINS`.
- **Verification Method**: `backend/tests/test_security_hardening_acceptance.py::test_csrf_origin_protection_middleware`.
- **Status**: **RESOLVED**.

---

### SEC-FINDING-05: Deep Link Parameter Credential Leakage & Open Redirects
- **Component**: Mobile Client (`apps/mobile/src/deeplink.ts`)
- **Severity**: **HIGH** (CVSS: 7.4)
- **Exploitability**: High.
- **Financial & Privacy Impact**: Phishing deep link or malicious link forwarding access tokens in URL parameters; arbitrary redirection to external domains.
- **Reproduction Procedure**:
  1. Trigger deep link `wealthos://dashboard?redirect=https://evil.com` or `wealthos://auth?access_token=xyz`.
  2. Application accepted URL without path/query sanitization.
- **Recommended Remediation**:
  - Build `validateDeepLink` with scheme allowlist (`wealthos://`), path allowlist, sensitive query param rejection, and open redirect blocking.
- **Verification Method**: `apps/mobile/src/mobileSecurity.test.ts`.
- **Status**: **RESOLVED**.

---

### SEC-FINDING-06: Document Upload Executable Disguise & MIME Verification Gap
- **Component**: Financial Document Intelligence (`backend/app/domains/documents/`)
- **Severity**: **MEDIUM** (CVSS: 6.5)
- **Exploitability**: Medium.
- **Financial & Privacy Impact**: Disguised executable files (shell scripts, Windows PE) uploaded under `.pdf` or `.png` extensions.
- **Reproduction Procedure**:
  1. Register document with `application/pdf` MIME type and shell script payload.
  2. System accepted based on declared metadata without checking binary header magic bytes.
- **Recommended Remediation**:
  - Add binary magic bytes validation (`verify_file_magic_bytes` inspecting `%PDF-`, PNG, JPEG headers).
  - Enforce strict Pydantic schema validation restricting MIME types and 25MB file limits.
- **Verification Method**: `backend/tests/test_security_hardening_acceptance.py::test_document_magic_bytes_and_executable_disguise_protection`.
- **Status**: **RESOLVED**.

---

### SEC-FINDING-07: Offline Mutation Queue Tamper Vulnerability
- **Component**: Mobile Client (`apps/mobile/src/storage.ts`)
- **Severity**: **MEDIUM** (CVSS: 5.9)
- **Exploitability**: Low (Requires local device access).
- **Financial & Privacy Impact**: Queued financial transaction amounts or accounts manipulated in offline state before synchronization.
- **Reproduction Procedure**:
  1. Enqueue transaction while offline.
  2. Modify payload amount in storage.
  3. Queue synced modified payload without detecting alteration.
- **Recommended Remediation**:
  - Compute SHA-256 payload checksum upon enqueueing; verify before transitioning to `SYNCING`. Fail fatal on mismatch.
- **Verification Method**: `apps/mobile/src/mobileSecurity.test.ts`.
- **Status**: **RESOLVED**.

---

## 3. Summary of Baseline Audit

All 7 identified baseline vulnerabilities have been remediated with automated regression tests passing across backend, web, and mobile suites.

