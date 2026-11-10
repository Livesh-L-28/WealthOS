# WealthOS Phase 27 — Synchronization Conflict Resolution Framework

**Phase ID:** `WEALTHOS-PHASE-27`  
**Execution Timestamp:** 2026-11-10T12:03:00+05:30  
**Status:** **IMPLEMENTED & VERIFIED**

---

## 1. Executive Summary

In financial systems, blind "Last-Write-Wins" (LWW) resolution is dangerous and strictly prohibited. Overwriting a server ledger record simply because a client timestamp is newer causes unexplainable balance drift, broken audit trails, and corrupted accounting invariants.

WealthOS employs a **deterministic, business-rule-aware conflict resolution framework**. When an offline mutation conflicts with current server state, the operation is placed in an explicit `CONFLICT` state, presented in the UI, and resolved according to strict financial constraints.

---

## 2. Conflict Scenarios & Resolution Rules

| Conflict Scenario | Description | Detection Mechanism | Resolution Policy |
| :--- | :--- | :--- | :--- |
| **Operation on Closed Account** | User logs an expense offline against a bank account that was closed online by an admin. | Server inspects account status during batch ingestion; finds `status = 'CLOSED'`. | **REJECT / RE-ROUTE:** Operation cannot post to closed account. Prompt user to select an alternate active account. |
| **Concurrent Budget Allocation Edit** | Device A updates Grocery budget from ₹15,000 to ₹18,000; Device B updates to ₹20,000 concurrently. | Server checks budget revision version. | **MERGE / SERVER_WIN:** Highest allocation or explicit user prompt. Revisions logged in budget history table. |
| **Concurrent Goal Contribution** | User contributes ₹5,000 from phone while spouse contributes ₹10,000 from web, exceeding target. | Server validates current progress vs. target. | **CAP & RE-ROUTE:** Goal marked as achieved (100%); excess balance retained in cash account without overflow. |
| **Transaction Deletion / Reversal** | Server marks transaction reversed/voided while client submits an offline edit. | Server checks transaction `is_reversed` or `is_posted` flag. | **FAIL-CLOSED:** Immutable posted journals cannot be modified. Edit rejected; adjustment transaction required. |
| **Tenant Access Revoked** | User loses membership to workspace while in offline mode. | JWT token verification / DB membership check returns 403. | **ABORT & WIPE:** Offline operations for revoked tenant rejected; local cache marked for purge. |

---

## 3. Supported Resolution Strategies

Clients and users can resolve active conflicts via `POST /api/v1/sync/conflicts/{conflict_id}/resolve` using one of three strategies:

1. **`SERVER_WIN`:**
   - Server state takes precedence.
   - The pending offline mutation is formally discarded, and the client queue transitions to `CANCELLED`.
   - Audit log records that client change was superseded by server authoritative record.

2. **`CLIENT_WIN`:**
   - Client payload is re-evaluated against current server state.
   - Permitted only if the client payload satisfies all financial constraints (e.g. valid active account, non-negative monetary value, authorized period).
   - If constraints fail, client win is rejected and manual intervention is enforced.

3. **`MANUAL_MERGE`:**
   - User inspects differences side-by-side in a reconciliation modal.
   - User inputs a merged payload (e.g. allocating the expense to a different account).
   - The merged payload is posted as a new, confirmed transaction.

---

## 4. Verification Evidence

Automated test `test_sync_conflict_detection_and_resolution` in `backend/tests/test_phase27_sync_engine.py`:
- Submitted offline expense against closed account (`account_status: CLOSED`).
- Verified server returned operation in `conflict_operations` array with assigned `conflict_id`.
- Verified conflict appeared in `GET /api/v1/sync/conflicts`.
- Executed `POST /api/v1/sync/conflicts/{conflict_id}/resolve` with `SERVER_WIN`.
- Verified status transitioned to `RESOLVED` with authoritative timestamp.
