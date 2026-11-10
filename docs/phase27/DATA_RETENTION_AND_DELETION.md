# WealthOS Phase 27 — Data Retention, Archival & Account Deletion Policy

**Phase ID:** `WEALTHOS-PHASE-27`  
**Execution Timestamp:** 2026-11-10T12:07:00+05:30  
**Status:** **IMPLEMENTED & AUDITED**

---

## 1. Executive Summary

Fintech data retention requires navigating a fundamental tension:
- **Privacy Laws (DPDPA 2023 / GDPR):** Grant users the right to erasure and deletion of personal data when purpose has elapsed.
- **Financial & Tax Statutes (Income Tax Act 1961, Section 44AA; PMLA 2002):** Mandate the preservation of financial books of accounts and double-entry journals for a minimum statutory period (generally 6 to 8 financial years).

WealthOS resolves this tension through **pseudonymized statutory archival**. When an account deletion is requested:
1. All personally identifiable information (PII)—names, emails, telephone numbers, passwords, session tokens, and uploaded identity documents—is immediately and irreversibly purged from databases and storage buckets.
2. Authoritative double-entry general ledger journal entries ($\sum Dr = \sum Cr$) are preserved in an anonymized state linked only to an immutable UUID hash to maintain statutory trial balance integrity without retaining personal data.

---

## 2. Retention Periods by Data Category

| Data Category | Specific Entity Types | Retention Period | Statutory / Business Justification | Post-Retention Action |
| :--- | :--- | :--- | :--- | :--- |
| **User Identity & Auth** | Names, emails, password hashes, MFA secrets, active sessions | Active account lifetime + 30 days grace period | Authentication & user service provision | Permanent deletion upon account closure |
| **Financial Ledger Records** | Posted journal entries, journal lines, chart of accounts | **8 Financial Years** (Statutory) | Mandatory under Section 44AA Income Tax Act, 1961 and PMLA Rule 3 | Anonymized archival; encrypted cold storage |
| **Banking Sync Artifacts** | Ephemeral AA consent tokens, raw JSON sync payloads | 30 days rolling | Operational debugging and discrepancy investigation | Automatic pruning via scheduled Celery task |
| **Document Vault Files** | Encrypted PDF bank statements, contract notes | Active account lifetime (or user deletion) | User document retrieval | Cryptographic shredding & S3 object deletion |
| **Security Audit Logs** | IP addresses, login timestamps, MFA audit trails | **180 Days** | Mandatory under CERT-In Directions (April 2022) | Automated log lifecycle rotation to cold archive |

---

## 3. Account Deletion Workflow Verification

The account deletion workflow was audited in `backend/app/domains/identity/service.py:1136` and `backend/app/api/v1/auth.py:486`:

### Deletion Procedure:
1. **User Initiation:** User navigates to `/delete-account` on Web or Settings on Mobile.
2. **Explicit Consent & Challenge:** User must input their current password and type the exact confirmation phrase:  
   `"DELETE MY ACCOUNT PERMANENTLY"`
3. **Execution Steps:**
   - User status updated to `DELETED`.
   - All active JWT sessions blacklisted in Redis.
   - All refresh tokens revoked.
   - User profile personal fields scrubbed (`full_name = '[DELETED]'`, `email = 'deleted_[uuid]@wealthos.internal'`).
   - S3 objects in personal vault purged.
   - Client-side storage wiped via `webOfflineStore.clearAllOfflineData()` or `EncryptedLocalDatabase.purgeAllData()`.
   - HTTP response clears session cookies and returns HTTP 200.

---

## 4. Verification Evidence

The web application provides an accessible, fully interactive deletion interface at `/delete-account` ([apps/web/src/app/delete-account/page.tsx](file:///Users/livesh/WEALTHOS/apps/web/src/app/delete-account/page.tsx)). The backend endpoint `POST /api/v1/auth/delete-account` validates input and executes deletion within an ACID PostgreSQL transaction.

