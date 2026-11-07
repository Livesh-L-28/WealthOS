# WEALTHOS — THREAT MODEL & DREAD RISK ASSESSMENT

**Document Reference:** WOS-SEC-TM-001  
**Methodology:** STRIDE / DREAD Risk Rating  
**Classification:** Proprietary Security Specification  
**Version:** 1.0.0-RELEASE-CANDIDATE  
**Status:** APPROVED / FROZEN BASELINE  

---

## 1. ASSET INVENTORY & THREAT ACTORS

### 1.1 Critical Assets at Risk
1. **General Ledger Entries & Balances:** Tampering with balances could misrepresent net worth, hide theft, or corrupt financial statements.
2. **User Authentication & MFA Credentials:** Compromise grants unauthorized access to private personal wealth data.
3. **Financial Statement Documents:** Unencrypted bank/broker statements contain PAN numbers, home addresses, account numbers, and cash flow history.
4. **Integration Tokens (Broker / Account Aggregator):** If leaked, allow unauthorized access to external financial systems.
5. **System Audit Logs:** If modifiable or destructible, malicious actors can conceal financial malfeasance.

### 1.2 Threat Actor Profiles
- **TA-1: External Opportunistic Attacker:** Scans for open ports, vulnerable dependencies, unsecured S3 buckets, and exposed endpoints.
- **TA-2: Malicious Multi-Tenant Insider:** Authenticated user attempting horizontal privilege escalation (IDOR) to access another tenant's documents or financial ledger.
- **TA-3: Malicious Household Member:** Authorized user in a shared workspace attempting vertical privilege escalation to modify ownership, invite outsiders, or delete records.
- **TA-4: Malicious Document Ingestion Vector:** Attacker uploading specially crafted polyglot files, PDF decompression bombs, or OCR exploits to achieve remote code execution (RCE) on worker instances.

---

## 2. DREAD RISK RATING METHODOLOGY

Every identified threat is evaluated across five metrics on a scale of 1 to 10:
- **D (Damage Potential):** How severe is the damage if the exploit succeeds?
- **R (Reproducibility):** How easily can the attack be duplicated?
- **E (Exploitability):** How much effort, skill, and tooling is required?
- **A (Affected Users):** What percentage of users or tenants are impacted?
- **D (Discoverability):** How easily can the vulnerability be identified?

$$\text{Risk Score} = \frac{D + R + E + A + D}{5}$$

- **High / Critical Risk:** Score $\ge 7.0$
- **Medium Risk:** Score $4.0 - 6.9$
- **Low Risk:** Score $< 4.0$

---

## 3. STRIDE THREAT ASSESSMENT & DREAD RATINGS

| ID | STRIDE Category | Threat Scenario | D | R | E | A | D | Score | Risk Level | Architectural Mitigation |
|---|---|---|---|---|---|---|---|---|---|---|
| **T-01** | **Information Disclosure** | Insecure Direct Object Reference (IDOR) on `/api/v1/documents/{id}` allows tenant B to read tenant A's bank statement. | 9 | 8 | 8 | 10 | 7 | **8.4** | **CRITICAL** | Compulsory tenant scoping in SQLAlchemy queries: `WHERE tenant_id = :current_tenant_id`. Unit tests asserting cross-tenant 404/403. |
| **T-02** | **Tampering** | Direct mutation of historical `journal_lines` through SQL injection or unprotected internal API endpoint. | 10 | 6 | 4 | 8 | 5 | **6.6** | **HIGH** | Strict parameterization via SQLAlchemy; DB check constraints; database trigger blocking `UPDATE`/`DELETE` on posted lines; append-only reversing model. |
| **T-03** | **Elevation of Privilege** | Member modifies their own role in `tenant_memberships` to `OWNER` by tampering with JSON request payload. | 8 | 9 | 8 | 4 | 7 | **7.2** | **HIGH** | Pydantic v2 schemas stripping unauthorized fields; service-level role verification (`@require_role(['OWNER'])`). |
| **T-04** | **Spoofing** | Attacker captures unhashed session token via cross-site scripting (XSS). | 8 | 7 | 6 | 8 | 6 | **7.0** | **HIGH** | Session cookies set with `HttpOnly`, `Secure`, `SameSite=Strict`; strict Content-Security-Policy header blocking unauthorized inline scripts. |
| **T-05** | **Denial of Service** | Malicious 1,000-page PDF uploaded to exhaust Celery worker memory and CPU during OCR parsing. | 6 | 9 | 9 | 6 | 8 | **7.6** | **HIGH** | 35 MB upload size limit; PyMuPDF page-count pre-validation (max 100 pages); worker container memory limits (1.5 GB cap with auto-kill); dedicated `ocr_heavy` queue. |
| **T-06** | **Information Disclosure** | S3 bucket containing financial statements misconfigured with public read permissions. | 10 | 10 | 10 | 10 | 9 | **9.8** | **CRITICAL** | MinIO/S3 bucket created with private ACLs; public access block enabled; access granted solely via short-lived pre-signed URLs (TTL = 300s). |
| **T-07** | **Repudiation** | User denies deleting a financial account or approving an inaccurate document batch. | 5 | 8 | 7 | 4 | 5 | **5.8** | **MEDIUM** | Comprehensive `audit_logs` table recording user ID, IP address, user agent, timestamp, before/after diffs; immutable record retention. |
| **T-08** | **Tampering** | Polyglot file (image with embedded PHP/shell script) uploaded to execute code on server. | 9 | 6 | 5 | 6 | 5 | **6.2** | **HIGH** | Byte-level MIME inspection via `python-magic`; storage filenames randomized with UUIDs; files stored outside web server docroot; pre-signed URL forced download headers. |
| **T-09** | **Information Disclosure** | Third-party broker API keys and secrets dumped during database compromise. | 9 | 8 | 5 | 8 | 4 | **6.8** | **HIGH** | AES-256-GCM envelope encryption for all third-party secrets; Master Key injected through KMS/environment variables, never stored in DB. |
| **T-10** | **Spoofing** | TOTP token brute-forced or replayed within the 30-second validity window. | 7 | 6 | 4 | 4 | 5 | **5.2** | **MEDIUM** | Rate limiting on authentication endpoints (5 attempts per minute); consumed TOTP tokens tracked in Redis for 90 seconds to block replay. |

---

## 4. SECURITY VERIFICATION & AUTOMATED TESTING PLAN

1. **Multi-Tenant Penetration Tests (`test_tenant_isolation.py`):**
   - Setup Tenant A and Tenant B with identical asset/account names.
   - Execute all API endpoints authenticated as Tenant A passing Tenant B resource IDs.
   - Assert 100% of responses return `HTTP 404 Not Found` or `HTTP 403 Forbidden`.
2. **Double-Entry Balance Verification Tests (`test_ledger_invariants.py`):**
   - Attempt posting unbalanced journal entries (e.g., Debit ₹100, Credit ₹99).
   - Assert API rejects request with `422 Unprocessable Entity` and database transaction rolls back cleanly.
3. **Static Security Analysis (SAST):**
   - Bandit and Semgrep automated scans in CI checking for SQL injection, hardcoded secrets, weak cryptographic primitives, and insecure deserialization.
