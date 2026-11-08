# WealthOS Phase 19 — Financial Integrity & Consistency Architecture

## Executive Overview
Phase 19 Workstream 1 establishes enterprise-grade financial integrity, consistency verification, and transactional guarantees across the WealthOS ledger, investment subsystems, and cash management domains.

### Financial Correctness Standard
WealthOS treats every financial figure as an auditable invariant. Under no circumstances are floating-point representations used for monetary values (`NUMERIC(20,4)` or Python `Decimal` is enforced across all models, DDL schemas, API boundaries, and calculations).

---

## 1. Transactional Outbox Pattern (`OutboxEvent`)

### 1.1 Architecture & Problem Statement
When state transitions occur in relational models (e.g., posting a journal entry, issuing a dividend, triggering a corporate action), notifying downstream consumers (analytics, AI digital twin, real-time WebSockets, search indices) via asynchronous message brokers (Redis, Celery, Kafka) within a distributed transaction risks dual-write inconsistency:
- Database commit succeeds, but broker publish fails $\rightarrow$ Event loss.
- Broker publish succeeds, but database transaction rolls back $\rightarrow$ Ghost event processed by consumers.

### 1.2 Outbox Event Table Design
WealthOS guarantees exactly-once event publication semantics using the PostgreSQL Transactional Outbox pattern:

```sql
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    headers JSONB DEFAULT '{}'::jsonb NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL,
    retry_count INTEGER DEFAULT 0 NOT NULL,
    max_retries INTEGER DEFAULT 5 NOT NULL,
    scheduled_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT clock_timestamp() NOT NULL
);
```

### 1.3 State Lifecycle
1. `PENDING`: Atomic record insertion inside the business write transaction.
2. `PROCESSING`: Leased by the Celery/background outbox worker with pessimistic locking (`FOR UPDATE SKIP LOCKED`).
3. `PROCESSED`: Successfully dispatched to message exchange. `processed_at` timestamp recorded.
4. `FAILED`: Terminal state if `retry_count >= max_retries` with recorded `error_message`. Exponential jitter backoff applied on interim failures.

---

## 2. Universal API Idempotency Engine (`IdempotencyEngine`)

### 2.1 Problem Statement
Network retries, client timeouts, and automated synchronization webhooks can cause duplicate transaction submissions, creating phantom journal entries and corrupting ledger balances.

### 2.2 Mechanism
All mutating financial endpoints require an `Idempotency-Key` HTTP header. 
The `IdempotencyEngine` hashes the request body, method, path, and tenant identifier using SHA-256 (`request_fingerprint`):
- **Cache Hit / Completed**: If the key exists and request fingerprint matches, the previously cached status code, headers, and response payload are returned immediately without touching downstream business logic.
- **In-Progress Concurrent Call**: If another thread is actively evaluating the exact idempotency key, an HTTP 409 Conflict is returned to prevent concurrent race conditions.
- **Payload Mismatch**: If the client sends the same idempotency key with different payload parameters, an HTTP 422 Unprocessable Entity error is returned indicating key collision.

---

## 3. Deterministic 15-Point Financial Integrity Audit

The `FinancialIntegrityService` runs continuous, automated invariant checks across tenant records:

| Check ID | Name | Severity | Invariant / Rule |
| :--- | :--- | :--- | :--- |
| `CHECK_01` | Journal Debit/Credit Equality | `CRITICAL` | $\sum\text{Dr} = \sum\text{Cr}$ across all posted journal entries with 0.0000 tolerance. |
| `CHECK_02` | Ledger Account Balance Aggregation | `CRITICAL` | Account balances match sum of journal lines. |
| `CHECK_03` | Depository Overdraft & Currency | `HIGH` | Depository (checking/savings) accounts have non-negative balances. |
| `CHECK_04` | Duplicate External References | `MEDIUM` | Bank reference numbers are unique per tenant. |
| `CHECK_05` | Transaction to Journal Linkage | `HIGH` | Confirmed financial transactions are tied to journal entries. |
| `CHECK_06` | Investment Lot Quantity Invariance | `CRITICAL` | $0 \le \text{remaining\_quantity} \le \text{quantity}$ (No negative inventory). |
| `CHECK_07` | Investment Cost Basis Invariance | `HIGH` | $\text{cost\_basis} = \text{remaining\_quantity} \times \text{purchase\_price}$. |
| `CHECK_08` | Passive Income Net Reconciliation | `HIGH` | $\text{gross\_amount} - \text{tax\_withheld} = \text{net\_amount}$. |
| `CHECK_09` | Realized P&L Segregation | `HIGH` | Capital gains segregated from gross disposal proceeds. |
| `CHECK_10` | Unrealized P&L Valuation Basis | `MEDIUM` | Accurate mark-to-market differential based on security master price. |
| `CHECK_11` | Net Worth Balance Sheet Invariance | `CRITICAL` | $\text{Net Worth} = \sum\text{Assets} - \sum\text{Liabilities}$. |
| `CHECK_12` | Digital Twin Snapshot Consistency | `MEDIUM` | Twin financial snapshot mirrors live ledger state. |
| `CHECK_13` | Household Ownership Split Integrity | `HIGH` | Shared ownership percentages do not exceed 100.00%. |
| `CHECK_14` | Market Price Freshness | `LOW` | Active portfolio instruments priced within 7 days. |
| `CHECK_15` | Transaction Categorization | `INFO` | Posted transactions assigned valid CoA accounts. |

