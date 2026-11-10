# WealthOS Phase 27 — Synchronization Engine Architecture & Design

**Phase ID:** `WEALTHOS-PHASE-27`  
**Execution Timestamp:** 2026-11-10T12:03:00+05:30  
**Status:** **IMPLEMENTED & VERIFIED**

---

## 1. Executive Summary

The WealthOS Synchronization Engine provides bidirectional, reliable, and fault-tolerant data synchronization between offline-first client applications (React Native Mobile and Next.js Web) and the authoritative FastAPI backend.

The engine guarantees:
1. **At-Least-Once Delivery with Strict Idempotency:** Offline operations carry unique client operation IDs and idempotency keys; duplicate submissions return existing results without duplicate side effects.
2. **Deterministic State Transitions:** Operations transition through explicit, auditable states:  
   `PENDING → SYNCING → ACCEPTED | REJECTED | CONFLICT`
3. **Bounded Retries with Exponential Backoff:** Transient network timeouts retry up to 3 times before failing closed as `FAILED_FATAL` or escalating to `CONFLICT`.
4. **Authoritative Server Timestamping:** Clocks on client devices are treated as untrusted; ordering and timestamps are established by the backend.

---

## 2. Synchronization Architecture & Lifecycle

```
[ Client App (Mobile/Web) ]
           |
           | 1. Enqueue Offline Mutation
           v
[ Durable Local Queue (Encrypted DB / IndexedDB) ]
           |
           | 2. Network Connectivity Detected (online)
           v
[ POST /api/v1/sync/sessions ] ---------> [ Backend Sync Service ]
           |                                     |
           | Session Token & Active Cursor        |
           v                                     |
[ POST /api/v1/sync/operations ] -------> [ Idempotency & Conflict Guard ]
           |                                     |
           |                                     +---> Check Duplicate Idempotency Key
           |                                     +---> Check Target Entity / Account Status
           |                                     +---> Validate Non-Negative Monetary Amounts
           |                                     |
           v                                     v
[ Batch Response: Accepted / Conflicts ] <---+ [ ACID General Ledger Transaction ]
           |
           v
[ Local Queue Updates: Mark COMMITTED / Show Conflicts ]
```

---

## 3. Dedicated Synchronization API Specification

All endpoints are hosted under `/api/v1/sync` and require valid Bearer JWT authentication and `X-Tenant-ID` scoping:

| Endpoint | Method | Purpose | Payload / Response |
| :--- | :--- | :--- | :--- |
| `/sessions` | `POST` | Establishes authenticated sync session | In: `device_id`, `platform`, `client_version`<br>Out: `session_id`, `active_cursor`, `server_timestamp` |
| `/operations` | `POST` | Submits ordered batch of pending offline operations | In: `session_id`, `operations: [...]`<br>Out: `accepted_operations`, `rejected_operations`, `conflict_operations` |
| `/operations/{id}`| `GET` | Look up status of individual operation | Out: `operation_id`, `state`, `authoritative_entity_id`, `resolved_at` |
| `/conflicts` | `GET` | List active unresolved conflicts for tenant | Out: Array of `SyncConflictItem` |
| `/conflicts/{id}/resolve` | `POST` | Resolve conflict deterministically | In: `resolution_strategy` (`SERVER_WIN`, `CLIENT_WIN`, `MANUAL_MERGE`) |
| `/delta` | `GET` | Fetch chronological server changes | In: `since_cursor`<br>Out: `cursor`, `changes: [...]`, `has_more` |
| `/devices` | `POST` | Register client device for push / revocation | In: `device_id`, `device_name`, `platform`, `app_version` |
| `/devices/{id}/revoke` | `POST` | Remote revocation of compromised or lost device | Out: Revocation confirmation timestamp |

---

## 4. Test Evidence & Verification

Automated test suite `backend/tests/test_phase27_sync_engine.py` validates all core capabilities:
- Session creation: **PASSED** (201 Created with server cursor)
- Batch operation submission & idempotency replay: **PASSED** (Zero duplicate entries)
- Conflict detection & resolution: **PASSED** (Targeting closed account triggers `CONFLICT`, resolved via `SERVER_WIN`)
- Incremental delta sync & device registration/revocation: **PASSED** (200 OK)

