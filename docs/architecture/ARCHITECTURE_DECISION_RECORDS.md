# WealthOS — Architecture Decision Records (ADRs)

**Programme:** WealthOS Enterprise Architecture & Production Readiness  
**Document:** Architecture Decision Records (ADRs)  
**Date:** 2026-11-08  
**Status:** Approved  
**Author:** Principal Software Architect & Database Architect  

---

## Index of Architecture Decision Records

1. [ADR-001: Modular Monolith vs Distributed Microservices](#adr-001-modular-monolith-vs-distributed-microservices)
2. [ADR-002: PostgreSQL Primary + Read Replicas vs Database Sharding](#adr-002-postgresql-primary--read-replicas-vs-database-sharding)
3. [ADR-003: PostgreSQL Row-Level Security (RLS) vs Separate Schemas / Databases](#adr-003-postgresql-row-level-security-rls-vs-separate-schemas--databases)
4. [ADR-004: Redis-Backed Celery Worker Architecture vs Apache Kafka](#adr-004-redis-backed-celery-worker-architecture-vs-apache-kafka)
5. [ADR-005: HttpOnly SameSite=Lax Session Cookies vs Browser LocalStorage](#adr-005-httponly-samesitelax-session-cookies-vs-browser-localstorage)
6. [ADR-006: Immutable Double-Entry General Ledger vs CRUD Account Updates](#adr-006-immutable-double-entry-general-ledger-vs-crud-account-updates)

---

## ADR-001: Modular Monolith vs Distributed Microservices

### Context
WealthOS manages 17 distinct functional domains (Ledger, Reconciliation, Investments, Budgets, Liabilities, Copilot, Household, etc.). Many enterprise architectures decompose such domains into independent microservices communicating over gRPC or HTTP.

### Decision
We retain a **Modular Monolith** architecture for the WealthOS core platform. Domain modules reside in `backend/app/domains/` with strictly enforced service interfaces and isolated transaction boundaries.

### Rationale
1. **Financial Transaction Atomicity:** Double-entry journal entries, cash transfers, and investment lot settlements require absolute ACID atomicity. In a microservices architecture, cross-service transactions require two-phase commit (2PC) or the Saga pattern with eventual consistency, introducing severe risk of orphaned debits or unreconciled balances.
2. **Operational Simplicity:** A modular monolith eliminates network hop latency, distributed tracing overhead, and complex service mesh management while still allowing independent horizontal scaling of API and worker processes.
3. **Refactoring Velocity:** Strict internal boundaries provide the structural benefits of microservices without the distributed systems operational penalty.

---

## ADR-002: PostgreSQL Primary + Read Replicas vs Database Sharding

### Context
As user adoption grows, database read/write volume increases. We must establish a scalability path that satisfies high throughput without sacrificing financial correctness.

### Decision
We implement a **Single Primary Writer + Asynchronous Read Replicas with PgBouncer** connection pooling, and **explicitly reject database sharding**.

### Rationale
1. **Cross-Entity Integrity:** WealthOS features Household accounts where multiple users share assets and transfer funds between accounts. Sharding by user or tenant would split related accounts across database nodes, breaking foreign keys, unique constraints, and atomic multi-account journal entries.
2. **Capacity Headroom:** A modern, tuned PostgreSQL 16 primary on modest cloud hardware (8–16 vCPUs, NVMe storage) can process $> 10,000$ write transactions/sec and millions of records. Read-heavy analytical workloads (Tax, Planning, Risk reports) are easily routed to read replicas via `PrimaryReplicaRouter`.
3. **Operational Risk:** Sharding introduces rebalancing overhead, cross-shard query latency, and disaster recovery complexity that is wholly unnecessary for the foreseeable operating horizon.

---

## ADR-003: PostgreSQL Row-Level Security (RLS) vs Separate Schemas / Databases

### Context
WealthOS is a multi-tenant platform. Tenant isolation must prevent cross-tenant data access under all conditions.

### Decision
We adopt **Shared Database, Shared Schema with PostgreSQL Kernel Row-Level Security (RLS)** using an unprivileged application role (`wealthos_app`).

### Rationale
1. **Defense-in-Depth:** Traditional multi-tenancy relying on application-level ORM filters (`WHERE tenant_id = ...`) is fragile; a single missing filter in a developer's query exposes other tenants' data. RLS enforces the filter inside the PostgreSQL query planner itself.
2. **Migration Manageability:** Schema-per-tenant or database-per-tenant architectures require executing migrations across thousands of schemas, leading to schema drift and maintenance bottlenecks. Shared-schema RLS allows a single Alembic migration command to update the entire platform instantaneously.
3. **Connection Efficiency:** Connection pooling via PgBouncer is vastly more efficient against a single consolidated database schema.

---

## ADR-004: Redis-Backed Celery Worker Architecture vs Apache Kafka

### Context
Heavy operations (document OCR, bank statement extraction, market data synchronization) must execute asynchronously outside the HTTP request/response cycle.

### Decision
We use **Celery 5.3 with Redis 7.2** organized into specialized worker queues (`default`, `ocr_heavy`, `market_data`), and reject Apache Kafka.

### Rationale
1. **Appropriate Complexity:** Redis is already operational in WealthOS for session blacklisting and caching. Utilizing Redis as the Celery broker provides sub-millisecond job dispatch without the operational footprint of ZooKeeper/KRaft clusters, JVM tuning, and partition management required by Kafka.
2. **Task Semantics vs Event Streaming:** WealthOS requires discrete job execution with retry logic, rate limiting, and progress tracking, for which Celery is purpose-built. Kafka excels at high-throughput event streaming (e.g. clickstreams), which is not the requirement here.

---

## ADR-005: HttpOnly SameSite=Lax Session Cookies vs Browser LocalStorage

### Context
The baseline audit revealed that JWT access tokens and tenant IDs are stored in browser `localStorage`.

### Decision
We migrate all web client session token storage from `localStorage` to **HttpOnly, SameSite=Lax, Secure Cookies**, backed by Redis server-side revocation.

### Rationale
1. **Mitigation of Token Theft (XSS):** Any script executing in the browser (via a compromised third-party package or XSS vulnerability) can read all data in `localStorage`. `HttpOnly` cookies are inaccessible to JavaScript, completely neutralizing token exfiltration.
2. **CSRF Protection:** Combining `SameSite=Lax` with Anti-CSRF header verification for state-changing requests prevents cross-site request forgery while maintaining smooth browser navigation.

---

## ADR-006: Immutable Double-Entry General Ledger vs CRUD Account Updates

### Context
Financial balances could naively be updated by executing `UPDATE accounts SET balance = balance + 100`.

### Decision
All balance movements must occur via **Immutable Double-Entry Journal Entries** with strict mathematical balance enforcement:
$$\sum \text{Debit} - \sum \text{Credit} = 0.0000$$

### Rationale
1. **Irrefutable Audit Trail:** Direct balance mutation leaves no history of how a balance was reached and makes discrepancy reconciliation impossible. In WealthOS, account balances are the exact mathematical sum of posted journal lines.
2. **Disaster Recovery & Financial Verification:** In the event of data corruption or auditing disputes, the complete state of any account can be recomputed from genesis by replaying immutable journal lines.
3. **Zero Float Drift:** Every transaction is stored using PostgreSQL `NUMERIC(20, 4)` and Python `Decimal`, ensuring exact penny and fractional currency precision.
