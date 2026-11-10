# WealthOS Phase 27 — Offline-First Architecture & Feature Capability Matrix

**Phase ID:** `WEALTHOS-PHASE-27`  
**Execution Timestamp:** 2026-11-10T11:59:00+05:30  
**Status:** **ARCHITECTED & VALIDATED**

---

## 1. Executive Summary

WealthOS is engineered to provide continuous utility in intermittent or completely disconnected network environments. In wealth management, users frequently consult balances, review past transactions, or log expenses while in transit or without cellular reception.

However, in financial accounting, **offline client operations cannot authoritatively post to the double-entry general ledger**. The backend general ledger remains the single authoritative source of truth. Offline operations are persisted in a durable local queue, visually marked as "Pending Server Confirmation", and reconciled atomically upon reconnection.

---

## 2. Comprehensive Offline Feature Capability Matrix

| Feature Domain | Offline Behavior | UI Status Pill | Server Reconciliation Requirement |
| :--- | :--- | :--- | :--- |
| **Dashboard** | Displays last synchronized snapshot | `Cached Snapshot (as of [Timestamp])` | Background delta pull on reconnection |
| **Net Worth** | Displays last calculated valuation | `Offline Valuation` | Recalculated on backend upon new market prices |
| **Account Balances**| Displays last cleared balances | `Offline View` | Read-only; balance updates occur only via backend |
| **Transactions List**| Displays cached cleared transactions | `Cached Transactions` | Delta pagination on reconnection |
| **Expense Recording**| Enqueues pending operation locally | `Pending Synchronization` | Validates accounts, categories, creates journal lines |
| **Budget Viewing** | Displays cached allocations & spend | `Offline Budgets` | Refreshes actuals on reconnection |
| **Budget Modification**| Queues revision for validation | `Pending Review` | Server validates authorization & period status |
| **Financial Goals** | Displays cached targets & progress | `Offline Goals` | Read-only cached progress |
| **Goal Contribution**| Queues contribution transaction | `Queued Contribution` | Server verifies liquid cash & double-entry balance |
| **Portfolio Holdings**| Shows timestamped valuation | `Snapshot (Stale Prices)` | Market prices are strictly server-authoritative |
| **Investment Trade**| Enqueues trade intent (Pending) | `Pending Server Execution` | FIFO lot allocation & cost basis applied on server |
| **Live Market Quotes**| **UNAVAILABLE** | `Market Offline` | Requires active WebSocket/REST connection |
| **Bank Aggregation**| **UNAVAILABLE** | `Sync Paused` | Requires live OAuth / AA session |
| **AI Copilot** | **UNAVAILABLE** | `Copilot Offline` | Explains lack of network without hallucinating |
| **Document Vault** | Explicitly pre-cached authorized files| `Local Cache Only` | Uploads queued; downloads require live server |

---

## 3. UI Status Indication & Visual States

The application interface across both Mobile and Web adheres to strict visual state standards:

```
[ ONLINE ]               Green dot + "Connected"
[ OFFLINE ]              Amber dot + "Offline Mode — Cached data"
[ SYNC PENDING (N) ]     Blue rotating indicator + "N operations queued"
[ SYNCING... ]           Blue pulsating indicator + "Synchronizing..."
[ SYNC COMPLETE ]        Green checkmark + "All changes confirmed"
[ SYNC CONFLICT ]        Red warning triangle + "1 item requires review"
```

Every snapshot screen renders the precise timestamp of when data was last synchronized:  
`"Last synchronized with server: 10 Nov 2026, 11:45 AM IST"`

---

## 4. Financial Posting Boundary Invariant

### Non-Negotiable Rule:
> **An offline operation is never a posted financial transaction.**

1. **No Client-Side Ledger Mutation:** Client code never increments account balances or writes journal lines.
2. **Deterministic Ledger Invariants:** Authoritative journal entries, trial balance validation ($\sum Dr = \sum Cr$), and FIFO tax lot allocations are executed exclusively by the FastAPI backend within ACID PostgreSQL transactions.
3. **Pending Visual Distinction:** Unsynced expenses or transfers appear with a dashed outline or "Pending Sync" badge until the server returns an HTTP 200/201 response with the authoritative journal entry ID.

