# WealthOS Phase 28 — Web Offline Storage Security & Threat Model Audit

**Phase ID:** `WEALTHOS-PHASE-28`  
**Execution Timestamp:** 2026-11-10T12:24:00+05:30  
**Status:** **AUDITED & DEFENSE-IN-DEPTH CONTROLS VERIFIED**

---

## 1. Executive Summary

Web browsers operate within a fundamentally different threat environment than mobile operating systems. Web browsers lack hardware-backed Secure Enclave / KeyStore access, are exposed to browser extension inspection, and cannot protect local keys from malicious JavaScript in the event of an XSS compromise.

WealthOS implements a defensible **Browser-Side Data Protection Strategy** governed by:
1. **Data Minimization:** Only minimal dashboard summaries and offline mutation queues are persisted in IndexedDB. Raw financial documents, full transaction histories, and unmasked credentials are never cached in browser storage.
2. **Strict Token Hygiene:** Authentication access tokens and refresh tokens are strictly forbidden from `localStorage` and `IndexedDB`. Sessions rely on in-memory state and secure `HttpOnly`, `SameSite=Strict`, `Secure` cookies.
3. **Comprehensive Purge on Logout:** `webOfflineStore.clearAllOfflineData()` empties all IndexedDB object stores immediately upon user logout or session termination.
4. **Resilient Degradation:** Handles Private Browsing / Incognito mode and quota exhaustion without crashing the user interface.

---

## 2. Browser Storage Threat Model Evaluation

| Threat Vector | Browser Reality & Risk | WealthOS Engineering Countermeasure | Verification Status |
| :--- | :--- | :--- | :--- |
| **XSS Token Theft** | Malicious script extracts JWT from `localStorage` | Access tokens stored exclusively in memory; refresh tokens in `HttpOnly` cookies. Any token in `localStorage` is purged on load (`apps/web/src/lib/api.ts`). | **VERIFIED_COMPLETE** |
| **Shared Computer Residuals** | Next user on shared kiosk views previous user's financial figures | `clearAllOfflineData()` wipes `financial_snapshots` and `pending_mutations` from IndexedDB upon clicking Logout. | **VERIFIED_COMPLETE** |
| **IndexedDB Quota Exhaustion**| Browser disk full or storage quota denied | `WebOfflineStore` wraps transactions in try-catch; degrades gracefully to in-memory non-persisted session. | **VERIFIED_COMPLETE** |
| **Private Browsing Mode** | Safari / Firefox Incognito blocks IndexedDB persistence | DB open error caught and resolved to null; app functions in transient online mode without crashing. | **VERIFIED_COMPLETE** |
| **Cross-Tab Concurrency** | Two browser tabs modify data concurrently | Mutations assigned UUIDs and processed sequentially by backend; backend remains single source of truth. | **VERIFIED_COMPLETE** |
| **Tenant Boundary Leakage** | User switches workspace | All IndexedDB queries filter by active `tenantId`. Data from Tenant A cannot be queried by Tenant B. | **VERIFIED_COMPLETE** |

---

## 3. Browser-Side Encryption Analysis

### Question Evaluated:
*Should WealthOS encrypt IndexedDB records using a browser-generated WebCrypto key?*

### Technical Finding & Decision:
- **No Hardware Isolation:** Unlike mobile devices where keys are protected by Android StrongBox or iOS Secure Enclave, a web browser must store any encryption key in IndexedDB, cookies, or derive it from the user's password.
- **XSS Exposure:** If an attacker executes arbitrary JavaScript in the user's browser context (XSS), the attacker has full access to the WebCrypto APIs and can decrypt any ciphertext on the fly.
- **Defensible Defense:** Rather than implementing "security through obscurity" with client-side keys stored in the same sandbox, WealthOS enforces:
  - Strict Content Security Policy (`CSP`) preventing unauthorized script execution.
  - Zero sensitive token storage in browser storage.
  - Complete data erasure on logout.
  - Masking of bank account numbers (`••••4921`) and tax IDs.

---

## 4. Test Verification Evidence

Automated test suite `apps/web/src/offlineStore.test.ts` verified:
- Clean instantiation without crashes in headless test environments.
- Graceful fallback when IndexedDB is blocked.
- Token hygiene: zero access or refresh tokens in `localStorage`.
- Safe storage purge on session termination.

