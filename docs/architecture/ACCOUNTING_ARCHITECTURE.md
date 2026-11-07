# WealthOS — Financial Core & Accounting Architecture

## 1. System Context & Layered Monolith Design

```mermaid
flowchart TD
    API["API Layer (/api/v1/accounting/*)"]
    Auth["Phase 3 RBAC & Tenant Context Guard"]
    AppService["Application Services (Posting, Reversal, Ledger, Balances)"]
    Domain["Domain Engine (DoubleEntry, Decimal Money, Rules)"]
    Repo["Tenant Scoped Repositories"]
    DB[(PostgreSQL 16 Engine with RLS)]
    Redis[(Authenticated Redis)]

    API --> Auth
    Auth --> AppService
    AppService --> Domain
    AppService --> Repo
    Repo --> DB
    AppService --> Redis
```

---

## 2. Invariants & Guarantees
- Single source of truth for all posted transactions.
- Zero floating-point arithmetic.
- Immutable posted entries via database triggers.
- Idempotency preventing duplicate postings.
- RLS protecting multi-tenant boundaries.
