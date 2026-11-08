# Wave 1 — Phase 1: Financial Control Centre Architecture & Design

**Project:** WealthOS  
**Wave:** Wave 1  
**Phase:** Phase 1 (Financial Control Centre)  
**Date:** 2026-11-08  
**Standard:** Master Wave 1 Specification — Section 5.

---

## 1. Mission & Architectural Principles

The Financial Control Centre is the institutional integrity core of WealthOS. It is responsible for continuous verification, anomaly detection, discrepancy resolution, and data quality monitoring across bank statements, investment accounts, and the General Ledger.

### Non-Negotiable Financial Invariants
1. **Source of Truth:** The double-entry General Ledger (`accounts`, `journal_entries`, `journal_lines`) is immutable and authoritative.
2. **No Silent Mutations:** Reconciliation *never* automatically modifies or deletes posted journal entries to force reconciliation.
3. **Controlled Adjustments:** Any resolution requiring monetary adjustment must post an explicit, balanced reversal or adjustment journal entry via `PostingService` ($\sum\text{Dr} - \sum\text{Cr} = 0.0000$).
4. **Idempotency:** Matching and duplicate detection are strictly idempotent. Repeated execution with identical inputs produces identical state.
5. **Multi-Tenant Isolation:** All queries, sessions, discrepancies, and audit logs are scoped by `tenant_id` with PostgreSQL Row-Level Security (RLS).

---

## 2. Domain Model Architecture

```mermaid
erDiagram
    TENANT ||--o{ RECONCILIATION_SESSION : owns
    TENANT ||--o{ RECONCILIATION_RECORD : owns
    RECONCILIATION_SESSION ||--o{ RECONCILIATION_RECORD : contains
    RECONCILIATION_RECORD ||--o{ RECONCILIATION_AUDIT_EVENT : tracks
    ACCOUNT ||--o{ RECONCILIATION_RECORD : targets
    JOURNAL_ENTRY ||--o? RECONCILIATION_RECORD : matches
    TENANT ||--o{ DATA_QUALITY_METRIC : monitors

    RECONCILIATION_SESSION {
        uuid id PK
        uuid tenant_id FK
        uuid document_id FK
        timestamp session_date
        int total_records
        int matched_records
        int discrepancy_count
        string status
    }

    RECONCILIATION_RECORD {
        uuid id PK
        uuid tenant_id FK
        uuid session_id FK
        uuid account_id FK
        uuid journal_entry_id FK
        string source_reference
        numeric expected_amount
        numeric posted_amount
        numeric difference
        string currency_code
        string status
        string severity
        string discrepancy_category
        string resolution_status
        text discrepancy_reason
        text resolution_notes
        timestamp matched_at
        uuid matched_by FK
    }

    RECONCILIATION_AUDIT_EVENT {
        uuid id PK
        uuid tenant_id FK
        uuid reconciliation_record_id FK
        uuid actor_id FK
        string action
        text notes
        jsonb metadata
        timestamp created_at
    }

    DATA_QUALITY_METRIC {
        uuid id PK
        uuid tenant_id FK
        uuid account_id FK
        string source_name
        string status
        timestamp last_sync_at
        int unreconciled_count
        int discrepancy_count
        int freshness_seconds
    }
```

---

## 3. Discrepancy Lifecycle & Severity Matrix

### 3.1 Severity Classification
| Severity | Trigger Criteria | Action Protocol |
| :--- | :--- | :--- |
| **`LOW`** | Date mismatch within 24–48 hours, minor rounding variance ($\le ₹1.00$). | Suggest auto-match with explanation. |
| **`MEDIUM`** | Unclassified transaction, fee discrepancy $\le ₹500$, missing counterparty reference. | Highlight in exception queue; prompt user category selection. |
| **`HIGH`** | Unmatched debit $> ₹5,000$, amount variance $> ₹500$, external transaction absent from ledger. | Requires user investigation and manual link or adjustment entry. |
| **`CRITICAL`** | Duplicate posting detected, ledger imbalance ($\Delta \neq 0$), or unauthorized external debit. | Immediate alert banner; escalates to audit queue; blocks period close. |

### 3.2 State Machine Transitions
```
                [ UNMATCHED ]
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
    (Match Found)             (Discrepancy)
        │                           │
        ▼                           ▼
   [ MATCHED ]              [ OPEN (Severity) ]
                                    │
               ┌────────────────────┼────────────────────┐
               ▼                    ▼                    ▼
       [ UNDER_REVIEW ]      [ RESOLVED ]          [ REJECTED ]
               │                    │                    │
               ▼                    │                    │
         [ ESCALATED ]       (Adjustment Entry)          │
               │                    │                    │
               └────────────────────┴────────────────────┘
                                    │
                            [ AUDIT LOGGED ]
```

---

## 4. API Specification (`/api/v1/reconciliation/*`)

1. **`GET /api/v1/reconciliation/dashboard`**
   - Returns consolidated health KPIs: total sessions, open discrepancies by severity, unmatched records, ledger integrity status, and source freshness.
2. **`POST /api/v1/reconciliation/sessions`**
   - Initiates an automated reconciliation session against an account, document, or date range.
3. **`GET /api/v1/reconciliation/discrepancies`**
   - Paginated, filterable discrepancy queue (by status, severity, account, date).
4. **`POST /api/v1/reconciliation/discrepancies/{id}/action`**
   - Executes user action: `REVIEW`, `MATCH`, `MARK_DUPLICATE`, `RESOLVE`, `REJECT`, `ESCALATE` with required notes.
5. **`GET /api/v1/reconciliation/ledger-integrity`**
   - Real-time audit verifying that internal account balance equals sum of journal lines and General Ledger is strictly in balance ($\Delta = 0.0000$).
6. **`GET /api/v1/reconciliation/data-quality`**
   - Returns freshness status (`VERIFIED`, `NEEDS_REVIEW`, `INCOMPLETE`, `STALE`, `UNAVAILABLE`) per account.
