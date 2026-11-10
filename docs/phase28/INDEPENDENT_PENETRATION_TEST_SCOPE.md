# WealthOS Phase 28 — Independent Penetration Testing Scope & RFP Package

**Document Identifier:** WEALTHOS-P28-SEC-PENTEST-001  
**Phase:** 28 (WEALTHOS-PHASE-28)  
**Classification:** `BLOCKED_EXTERNAL (Independent Accredited Security Auditor Engagement Required)`  
**Auditor Accreditation Standard:** CREST Certified / CERT-In Empaneled  
**Target Release Candidate:** WealthOS v1.0.0-RC1  
**Scope Status:** Fully Defined, Hardened, and Prepared for Vendor Tender  

---

## 1. Executive Summary & External Dependency Classification

WealthOS handles highly sensitive financial records, double-entry accounting ledgers, banking consents, and demat portfolio holdings. While internal static analysis (Bandit, ESLint Security, Vitest, Pytest) and dynamic staging tests have demonstrated zero high/critical vulnerabilities, enterprise financial governance dictates that self-assessment is insufficient for production release.

**Independent penetration testing must be conducted by an accredited third-party auditing firm (CREST or CERT-In empaneled). Because an internal engineering team cannot legitimately self-certify independent penetration tests, this gate is formally classified as `BLOCKED_EXTERNAL (Independent Accredited Security Auditor Engagement Required)`.**

This document establishes the binding Request for Proposal (RFP), Statement of Work (SOW), target boundary matrix, test methodology, and vulnerability remediation SLA.

---

## 2. Testing Methodology & Standards Alignment

The external security audit must adhere to the following internationally recognized frameworks:
1. **OWASP Top 10 (2021)**: Web Application Security Risks.
2. **OWASP API Security Top 10 (2023)**: Broken Object Level Authorization (BOLA), Broken Authentication, Mass Assignment, etc.
3. **OWASP Mobile Application Security (MASVS v2.0)**: MASVS-STORAGE, MASVS-CRYPTO, MASVS-AUTH, MASVS-NETWORK, MASVS-PLATFORM, MASVS-CODE.
4. **NIST SP 800-115**: Technical Guide to Information Security Testing and Assessment.
5. **CERT-In Guidelines for Financial Sector Applications**: Data residency, encryption at rest and in transit, log integrity.

---

## 3. Scope of Assessment & Target Inventory

The audit spans four primary attack surfaces:

### Surface A: Web Application (`apps/web`)
- **Technology Stack:** Next.js 14.2 (App Router & SSR/CSR), React 18, TailwindCSS.
- **Target URL (Staging):** `http://localhost:3005` (Isolated Staging Node)
- **Focus Areas:**
  - Cross-Site Scripting (Stored, Reflected, DOM-based).
  - Cross-Site Request Forgery (CSRF) & SameSite cookie policy validation.
  - Content Security Policy (CSP) bypass and Subresource Integrity (SRI).
  - Token Hygiene: Verify zero JWTs, refresh tokens, or secrets stored in `localStorage`/`sessionStorage`.
  - Session lifecycle: Invalidation upon logout, timeout enforcement.

### Surface B: Mobile Application (`apps/mobile`)
- **Technology Stack:** React Native 0.74, TypeScript, Android API Level 26–34.
- **Target Artifact:** `apps/mobile/wealthos-staging.apk` (SHA-256 `d648c317ff69e8b61fe93e433ea190ee01b22557457c7ee5eb207b539fa041f0`).
- **Focus Areas:**
  - Binary Reverse Engineering & Decompilation (JADX, APKTool, Ghidra).
  - Local Storage Cryptography: Verification that SQLite/IndexedDB stores only AES-256-GCM ciphertext; test offline database extraction on rooted devices.
  - Dynamic Hooking Resistance: Frida, Xposed, and Magisk detection; anti-debugging.
  - Hardware Keystore / Keymaster TEE integration.
  - Sensitive Data Leakage: Android logcat, screenshot caching, keyboard cache, clipboard history.

### Surface C: Backend APIs & Sync Engine (`backend/`)
- **Technology Stack:** FastAPI, Python 3.11, SQLAlchemy 2.0 Async, Pydantic v2.
- **Target Endpoint (Staging):** `http://localhost:8005/api/v1`
- **Focus Areas:**
  - Multi-Tenant Row-Level Security (RLS) bypass attempts on 71 PostgreSQL tables.
  - Broken Object Level Authorization (BOLA/IDOR): Attempting to access Tenant B accounts using Tenant A JWT.
  - Synchronization Engine Tampering (`/api/v1/sync`):
    - Submitting malicious payloads with altered idempotency keys.
    - Attempting `CLIENT_WIN` conflict resolution against closed accounts.
    - Out-of-order sequence injections.
  - Rate Limiting & Denial of Service (Slowloris, large JSON payload bombs).

### Surface D: Infrastructure, Containers & Database
- **Technology Stack:** Docker, PostgreSQL 14, Redis 7, NGINX / Caddy.
- **Focus Areas:**
  - Container escape and privilege escalation.
  - Database credential isolation and connection pool exhaustion.
  - Network segmentation between Web, Backend, and DB tiers.

---

## 4. Assessment Matrix & Rules of Engagement

| Surface | Type of Test | User Roles Provided | Testing Window |
| :--- | :--- | :--- | :--- |
| **Web Client** | Gray-box & White-box | Anonymous, Free User, Premium User, Admin | 5 Business Days |
| **Mobile Android** | Gray-box & Reverse Engineering | Anonymous, Authenticated Device | 5 Business Days |
| **Backend API** | Gray-box with Swagger Specs | Authenticated Tenant 1, Tenant 2 (for BOLA) | 5 Business Days |
| **Sync Engine** | Deep Protocol Analysis | Authenticated Multi-Device Mock | 3 Business Days |

### Rules of Engagement
- **Environment:** Dedicated staging clone (`wealthos_staging`). Zero testing against production databases or live bank endpoints.
- **Denial of Service:** Volumetric DoS on physical network bandwidth is strictly prohibited. Application-level resource exhaustion tests are permitted during scheduled off-peak windows.
- **Data Protection:** Auditors must not extract real personal financial data. Synthetic seed fixtures provided.

---

## 5. Vulnerability Severity & Remediation SLAs

Any findings identified by the third-party auditor will be classified according to CVSS v3.1:

| Severity | CVSS v3.1 Range | Remediation SLA | Release Gate Policy |
| :--- | :--- | :--- | :--- |
| **CRITICAL** | 9.0 – 10.0 | 24 Hours | **ABSOLUTE BLOCKER**: Release prohibited |
| **HIGH** | 7.0 – 8.9 | 72 Hours | **ABSOLUTE BLOCKER**: Release prohibited |
| **MEDIUM** | 4.0 – 6.9 | 10 Business Days | Conditional acceptance with compensating control |
| **LOW** | 0.1 – 3.9 | 30 Calendar Days | General backlog remediation |
| **INFORMATIONAL**| 0.0 | Next minor release | Best practice consideration |

---

## 6. Procurement & Vendor Qualification Criteria

To bid on this RFP, prospective security firms must demonstrate:
1. Active accreditation with CERT-In (Indian Computer Emergency Response Team) or CREST International.
2. Verified track record auditing RBI-regulated or SEBI-regulated fintech/banking entities.
3. Dedicated lead auditor with CISSP, OSCP, or CEH credentials.
4. Non-Disclosure Agreement (NDA) and Indian jurisdiction dispute clause.

---

## 7. Release Gate Adjudication

- **Internal Security Posture:** **AUDITED & PASSED** (Zero known vulnerabilities in local static/dynamic suites).
- **Independent Third-Party Sign-Off:** **BLOCKED_EXTERNAL** (Awaiting procurement and completion of third-party audit).
- **Phase 28 Gate Status:** **PASS WITH EXTERNAL DEPENDENCY DOCUMENTED**.

