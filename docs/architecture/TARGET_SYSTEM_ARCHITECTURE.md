# WealthOS — Target System Architecture & Enterprise Design

**Programme:** WealthOS Enterprise Architecture & Production Readiness  
**Document:** Target System Architecture  
**Date:** 2026-11-08  
**Status:** Architecture Blueprint (Phase 1 Target)  
**Author:** Principal Software Architect, Database Architect, AppSec Lead & SRE Lead  

---

## 1. Executive Architecture Overview

WealthOS is an enterprise-grade, multi-tenant financial management and intelligence operating system. The platform guarantees strict financial correctness (balanced double-entry ledger, zero float drift), bank-grade tenant isolation (database-enforced PostgreSQL Row-Level Security), high availability (primary-replica database replication, automatic connection pooling), horizontal scalability (stateless API instances behind NGINX), and end-to-end auditability.

The architectural pattern is a **Modular Monolith** with strict logical domain boundaries, asynchronous background task execution, and decoupled web and mobile client frontends.

---

## 2. Core Architectural Principles & Logical Domain Boundaries

WealthOS enforces 17 encapsulated logical domains. Cross-domain communication is governed through explicit service interfaces and domain contracts, preventing circular dependencies and unauthorized cross-domain database mutations.

### The 17 Logical Domain Boundaries

```mermaid
flowchart TD
    subgraph CoreSecurity["1. Security & Identity Boundary"]
        IAM["1. Identity & Access Management"]
        TenantMgr["2. Tenant & Household Management"]
    end

    subgraph CoreLedger["2. Accounting & Transaction Boundary"]
        FinAccts["3. Financial Accounts"]
        TxMgr["4. Transactions"]
        GenLedger["5. Accounting Ledger"]
    end

    subgraph FinancialOps["3. Wealth Management Boundary"]
        Investments["6. Investment Management"]
        Budgets["7. Budget & Expense Management"]
        Liabilities["8. Liability Management"]
    end

    subgraph Intelligence["4. Financial Intelligence Boundary"]
        DocIntel["9. Document Intelligence"]
        Planning["10. Financial Planning"]
        Tax["11. Tax Readiness"]
        Risk["12. Risk Intelligence"]
        Copilot["13. Financial Copilot"]
        Twin["14. Financial Digital Twin"]
    end

    subgraph OpsIntegration["5. Platform & Operations Boundary"]
        Notifs["15. Notifications"]
        Integrations["16. Provider Integrations"]
        Analytics["17. Reporting & Analytics"]
    end

    IAM --> TenantMgr
    TenantMgr --> FinAccts
    FinAccts --> TxMgr
    TxMgr --> GenLedger
    TxMgr --> Investments
    TxMgr --> Budgets
    TxMgr --> Liabilities
    DocIntel --> TxMgr
    Investments --> Analytics
    Budgets --> Analytics
    Liabilities --> Analytics
    GenLedger --> Analytics
    Analytics --> Planning
    Analytics --> Tax
    Analytics --> Risk
    Analytics --> Twin
    Twin --> Copilot
    Risk --> Notifs
    Integrations --> DocIntel
    Integrations --> TxMgr
```

### Domain Module Specifications

1. **Identity & Access Management (IAM):** User lifecycle, bcrypt credential verification, JWT issuance, multi-factor authentication (MFA), Redis token blacklist revocation, user account deletion.
2. **Tenant & Household Management:** Multi-tenant organization boundaries, Household RBAC roles (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`), visibility tier enforcement (`PERSONAL_ONLY`, `HOUSEHOLD_SHARED`, `LIMITED_SHARED`).
3. **Financial Accounts:** Account definitions (checking, savings, credit cards, brokerage, loans), currency definitions, balance tracking.
4. **Transactions:** Financial journal lines, transaction deduplication, categorization, transfer neutrality filtering.
5. **Accounting Ledger:** Immutable double-entry general ledger, atomic journal entries ($\sum\text{Dr} - \sum\text{Cr} = 0$), audit log verification, reversing entries.
6. **Investment Management:** First-In, First-Out (FIFO) lot matching, realized and unrealized gain/loss calculations, stock split corporate action invariance, XIRR returns.
7. **Budget & Expense Management:** Envelope budgeting, rollover surplus/deficit mechanics, category tracking, burn radar.
8. **Liability Management:** Loan amortization schedules, reducing balance interest calculations, debt payoff simulators (avalanche vs snowball).
9. **Document Intelligence:** Quarantine pipeline, SHA-256 deduplication, MIME/magic-byte validation, OCR extraction, statement reconciliation.
10. **Financial Planning:** Goal-based wealth projections, retirement simulations, Monte Carlo analyses.
11. **Tax Readiness:** India FY/AY tax calculations, Section 112A capital gains exemptions, Old vs New Regime comparisons (Section 115BAC).
12. **Risk Intelligence:** 5-pillar Financial Health Score (0–100), automated vulnerability detection, alert lifecycle management.
13. **Financial Copilot:** AI query interface, 15 allowlisted read-only tools, regex prompt injection defenses, citation generation.
14. **Financial Digital Twin:** Dynamic financial graph synthesis, point-in-time net worth snapshots, data freshness states.
15. **Notifications:** System alerts, threshold warnings, email/SMS dispatch queues.
16. **Provider Integrations:** Normalized `ProviderAdapter`, Account Aggregator consent flows, NSE/BSE market feeds, broker CAS ingestion, envelope credential encryption.
17. **Reporting & Analytics:** Aggregated balance sheets, cash flow summaries, multi-period audit trails.

---

## 3. System Diagrams (Mermaid)

### 3.1 System Context Diagram (C4 Level 1)

```mermaid
flowchart TD
    User["End User / Household Member"]
    ExternalAA["RBI Account Aggregator"]
    ExternalMarket["NSE / BSE Market Data Feed"]
    ExternalCAS["Broker CAS Repository"]

    subgraph WealthOSSystem["WealthOS Financial Intelligence Platform"]
        WebPlatform["Web Application (Next.js 14)"]
        MobilePlatform["Mobile Application (React Native)"]
        APIGateway["WealthOS API Gateway & Modular Monolith"]
        BackgroundWorkers["Asynchronous Task Workers (Celery)"]
        DatabaseEngine[("PostgreSQL 16 HA Cluster")]
    end

    User -->|HTTPS / Modern Browser| WebPlatform
    User -->|Mobile App / Android| MobilePlatform
    WebPlatform -->|RESTful JSON API| APIGateway
    MobilePlatform -->|RESTful JSON API| APIGateway
    APIGateway -->|Read/Write Operations| DatabaseEngine
    APIGateway -->|Enqueue Asynchronous Tasks| BackgroundWorkers
    BackgroundWorkers -->|Async Persistence| DatabaseEngine

    ExternalAA -.->|Encrypted Financial Consents| APIGateway
    ExternalMarket -.->|Market Quotes & NAVs| BackgroundWorkers
    ExternalCAS -.->|Consolidated Statement PDFs| APIGateway
```

---

### 3.2 Container Diagram (C4 Level 2)

```mermaid
flowchart TD
    subgraph IngressLayer["Edge & Ingress Layer"]
        Nginx["NGINX Reverse Proxy / Load Balancer<br/>Port 80/443 (SSL Termination, Rate Limiting)"]
    end

    subgraph ClientLayer["Frontend Clients"]
        NextWeb["Next.js 14 Web Application<br/>Node.js 20 (Port 3000)"]
        RNMobile["React Native / Expo Mobile App<br/>Android APK/AAB (SDK 34/35)"]
    end

    subgraph ServiceLayer["Stateless Application Instances"]
        API1["FastAPI Instance 1<br/>Uvicorn (Port 8000)"]
        API2["FastAPI Instance 2<br/>Uvicorn (Port 8001)"]
    end

    subgraph PoolLayer["Connection Pooling Layer"]
        PgBouncer["PgBouncer Connection Pooler<br/>Port 6432 (Transaction Mode)"]
    end

    subgraph DataLayer["Persistence & Storage Layer"]
        PGPrimary[("PostgreSQL 16 Primary<br/>Read/Write (Port 5432)")]
        PGReplica[("PostgreSQL 16 Read Replica<br/>Physical Streaming Replication")]
        RedisCore[("Redis 7.2 Cluster<br/>Session Blacklist & Task Broker")]
        MinIOStore[("MinIO / S3 Object Storage<br/>Document Quarantine Vault")]
    end

    subgraph WorkerLayer["Asynchronous Worker Pools"]
        CeleryDefault["Celery Worker: Default Tasks"]
        CeleryOCR["Celery Worker: Heavy OCR Parsing"]
        CeleryMarket["Celery Worker: Market Feeds"]
    end

    NextWeb -->|HTTP Ingress| Nginx
    RNMobile -->|HTTP Ingress| Nginx
    Nginx -->|Round Robin / Path Routing| API1
    Nginx -->|Round Robin / Path Routing| API2

    API1 -->|Transactional Writes| PgBouncer
    API2 -->|Transactional Writes| PgBouncer
    API1 -->|Read-Only Queries| PGReplica
    API2 -->|Read-Only Queries| PGReplica

    PgBouncer -->|Pooled Connections| PGPrimary
    PGPrimary -->|Streaming Replication WAL| PGReplica

    API1 -->|Token Blacklist & Rate Limit| RedisCore
    API2 -->|Token Blacklist & Rate Limit| RedisCore
    API1 -->|Quarantined File Uploads| MinIOStore
    API2 -->|Quarantined File Uploads| MinIOStore

    API1 -->|Dispatch Background Jobs| RedisCore
    API2 -->|Dispatch Background Jobs| RedisCore

    RedisCore --> CeleryDefault
    RedisCore --> CeleryOCR
    RedisCore --> CeleryMarket

    CeleryDefault --> PgBouncer
    CeleryOCR --> MinIOStore
    CeleryOCR --> PgBouncer
    CeleryMarket --> PgBouncer
```

---

### 3.3 Component Diagram: Backend Modular Monolith (C4 Level 3)

```mermaid
flowchart LR
    subgraph Presentation["API Routing Layer"]
        RouterAuth["Auth Router"]
        RouterLedger["Ledger Router"]
        RouterInvest["Investments Router"]
        RouterCopilot["Copilot Router"]
        RouterIntegrations["Integrations Router"]
    end

    subgraph Service["Application Domain Services"]
        AuthService["Auth & Security Service"]
        LedgerService["Double-Entry Ledger Service"]
        InvestService["FIFO Accounting Service"]
        CopilotService["AI Copilot Service (15 Tools)"]
        IntegrationService["Provider Integration Service"]
    end

    subgraph Infrastructure["Infrastructure & Persistence Providers"]
        DBRouter["Primary/Replica DB Router"]
        RedisAdapter["Redis Session & Cache Adapter"]
        ObjectVault["MinIO Document Vault Adapter"]
        CryptoEngine["AES-256-GCM Envelope Engine"]
    end

    RouterAuth --> AuthService
    RouterLedger --> LedgerService
    RouterInvest --> InvestService
    RouterCopilot --> CopilotService
    RouterIntegrations --> IntegrationService

    AuthService --> DBRouter
    AuthService --> RedisAdapter
    LedgerService --> DBRouter
    InvestService --> DBRouter
    CopilotService --> DBRouter
    IntegrationService --> DBRouter
    IntegrationService --> CryptoEngine
    IntegrationService --> ObjectVault
```

---

### 3.4 Production Deployment Topology

```mermaid
flowchart TD
    subgraph PublicInternet["Public Internet"]
        ClientBrowser["Web Browser (Chrome, Safari, Firefox)"]
        AndroidDevice["Android Mobile Device (Google Play Release)"]
    end

    subgraph DMZ["Public DMZ / Ingress"]
        EdgeProxy["NGINX Ingress Gateway<br/>(TLS 1.3 Termination, CSP, Rate Limits)"]
    end

    subgraph AppPrivateNetwork["Private Application Network (VPC / Docker Internal)"]
        WebNode["Next.js Node.js Server (Port 3000)"]
        APINode1["FastAPI Container 1 (Port 8000)"]
        APINode2["FastAPI Container 2 (Port 8001)"]
        WorkerDefault["Celery Default Worker"]
        WorkerOCR["Celery OCR Heavy Worker"]
        WorkerMarket["Celery Market Worker"]
    end

    subgraph DataPrivateNetwork["Private Data Storage Network (Isolated)"]
        PgBouncerNode["PgBouncer Connection Pooler (Port 6432)"]
        PostgresMaster[("PostgreSQL 16 Primary (Port 5432)")]
        PostgresReplicaNode[("PostgreSQL 16 Read Replica (Port 5433)")]
        RedisNode[("Redis 7.2 (Port 6379)")]
        MinIONode[("MinIO Storage (Port 9000)")]
    end

    ClientBrowser -->|Port 443 HTTPS| EdgeProxy
    AndroidDevice -->|Port 443 HTTPS| EdgeProxy

    EdgeProxy -->|Forward Web Traffic| WebNode
    EdgeProxy -->|Forward /api/v1/ Traffic| APINode1
    EdgeProxy -->|Forward /api/v1/ Traffic| APINode2

    WebNode -->|Internal API Calls| APINode1
    APINode1 -->|Write Transactions| PgBouncerNode
    APINode2 -->|Write Transactions| PgBouncerNode
    APINode1 -->|Read-Only Queries| PostgresReplicaNode
    APINode2 -->|Read-Only Queries| PostgresReplicaNode

    PgBouncerNode --> PostgresMaster
    PostgresMaster -->|Continuous WAL Archival| MinIONode
    PostgresMaster -->|Streaming Replication| PostgresReplicaNode

    APINode1 --> RedisNode
    APINode2 --> RedisNode
    WorkerDefault --> PgBouncerNode
    WorkerOCR --> MinIONode
    WorkerOCR --> PgBouncerNode
    WorkerMarket --> PgBouncerNode
```

---

## 4. Sequence Diagrams

### 4.1 Authentication & Session Issuance Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Client
    participant Nginx as NGINX Proxy
    participant API as FastAPI Backend
    participant DB as PostgreSQL Primary
    participant Redis as Redis Cache

    User->>Nginx: POST /api/v1/auth/login {email, password}
    Nginx->>API: Route to available API instance
    API->>DB: Query user record by email
    DB-->>API: User record (password_hash, tenant_id, role)
    API->>API: Verify bcrypt(password, password_hash)
    alt Password Invalid
        API-->>User: HTTP 401 Unauthorized
    else Password Valid
        API->>API: Generate JWT Access Token (exp: 60m)
        API->>API: Generate Refresh Token (exp: 7d)
        API->>Redis: Store active session metadata
        API-->>Nginx: Set-Cookie: wealthos_access_token=... (HttpOnly, Secure, SameSite=Lax)
        Nginx-->>User: HTTP 200 OK with User Profile & Cookie
    end
```

---

### 4.2 Database Transaction Write Sequence (ACID Ledger Invariance)

```mermaid
sequenceDiagram
    autonumber
    actor Client as Authenticated Client
    participant API as FastAPI Backend
    participant Pool as PgBouncer
    participant Primary as PostgreSQL Primary

    Client->>API: POST /api/v1/transactions (Create Journal Entry)
    API->>API: Validate input schema & verify balanced: Sum(Debit) == Sum(Credit)
    API->>Pool: Acquire pooled connection
    Pool->>Primary: BEGIN TRANSACTION
    API->>Primary: SET LOCAL app.current_tenant_id = 'tenant-uuid'
    API->>Primary: INSERT INTO journal_entries (...) RETURNING id
    API->>Primary: INSERT INTO journal_lines (entry_id, account_id, debit, credit)
    Primary->>Primary: Execute RLS policy checks on all inserted rows
    alt Check Fails or Imbalance
        API->>Primary: ROLLBACK
        API-->>Client: HTTP 422 Unprocessable Entity
    else Invariant Holds
        API->>Primary: COMMIT
        Primary-->>API: Transaction Committed
        Pool-->>API: Release connection
        API-->>Client: HTTP 201 Created (Journal Entry Details)
    end
```

---

### 4.3 Read-Replica Routing Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Client as User / Dashboard
    participant API as FastAPI Backend
    participant Router as PrimaryReplicaRouter
    participant Primary as PostgreSQL Primary
    participant Replica as PostgreSQL Read Replica

    Client->>API: GET /api/v1/tax/reports/fy-2025-2026
    API->>Router: Execute analytical query
    Router->>Router: Inspect context (is_write=False, route=analytical)
    Router->>Replica: Acquire read-only connection
    API->>Replica: SET LOCAL app.current_tenant_id = 'tenant-uuid'
    API->>Replica: SELECT * FROM tax_schedules WHERE ...
    Replica-->>API: Result rows
    Router->>Replica: Return connection to pool
    API-->>Client: HTTP 200 OK (Tax Analytics Payload)

    Note over API,Primary: If POST / PUT / DELETE occurs:
    Client->>API: POST /api/v1/tax/adjustments
    API->>Router: Execute mutation query
    Router->>Router: Inspect context (is_write=True)
    Router->>Primary: Acquire read-write connection
    API->>Primary: INSERT / UPDATE ...
    Primary-->>API: Success
    API-->>Client: HTTP 200 OK
```

---

### 4.4 High-Availability Database Failover Sequence

```mermaid
sequenceDiagram
    autonumber
    participant Monitor as HA Health Monitor
    participant Primary as PostgreSQL Primary
    participant Replica as PostgreSQL Read Replica
    participant Pooler as PgBouncer
    participant API as Backend API Replicas

    loop Every 2 Seconds
        Monitor->>Primary: Heartbeat probe (pg_isready)
    end
    Note over Primary: Primary Node Failure / Network Partition
    Monitor->>Primary: Probe timeout (Attempt 1)
    Monitor->>Primary: Probe timeout (Attempt 2)
    Monitor->>Primary: Probe timeout (Attempt 3) - CONFIRMED DEAD
    Monitor->>Replica: Verify replication replay status
    Monitor->>Replica: Execute Promotion: pg_promote()
    Replica->>Replica: Promote Read Replica to Read/Write Standalone Primary
    Monitor->>Pooler: Pause incoming traffic: PAUSE
    Monitor->>Pooler: Update host configuration to point to Promoted Node
    Monitor->>Pooler: Reload configuration: RELOAD & RESUME
    API->>Pooler: Subsequent write transactions succeed immediately
    Note over API,Replica: Failover Completed (RTO < 10 seconds, RPO = 0)
```

---

### 4.5 Background Job Execution Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant API as FastAPI Backend
    participant Redis as Redis Task Queue
    participant Worker as Celery Worker
    participant Storage as MinIO / Database

    User->>API: POST /api/v1/documents/parse-async {document_id}
    API->>API: Generate task_id
    API->>Redis: LPUSH celery_queue:ocr {task_id, doc_id, tenant_id}
    API-->>User: HTTP 202 Accepted {task_id, status: "PENDING"}

    Worker->>Redis: BRPOP celery_queue:ocr
    Worker->>Worker: Set task state: "PROCESSING"
    Worker->>Storage: Fetch quarantined document from MinIO
    Worker->>Worker: Run OCR text extraction and balance check
    Worker->>Storage: Update document status = "PARSED" in DB
    Worker->>Redis: SET celery_result:task_id {status: "SUCCESS"}

    User->>API: GET /api/v1/documents/tasks/{task_id}
    API->>Redis: GET celery_result:task_id
    Redis-->>API: Result payload
    API-->>User: HTTP 200 OK {status: "COMPLETED", parsed_rows: 42}
```

---

### 4.6 Universal Document Ingestion & Quarantine Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as End User
    participant API as FastAPI Backend
    participant Quarantine as MinIO Quarantine Bucket
    participant Celery as Celery OCR Worker
    participant CleanStore as MinIO Verified Bucket
    participant DB as PostgreSQL

    User->>API: POST /api/v1/documents/upload (Multipart File)
    API->>API: Compute SHA-256 hash & inspect magic bytes (PDF/CSV/PNG)
    alt Hash exists for tenant
        API-->>User: HTTP 409 Conflict (Duplicate Statement)
    else Invalid MIME/Magic
        API-->>User: HTTP 400 Bad Request (Invalid Format)
    else Validation Passed
        API->>Quarantine: Write to quarantine-bucket/{tenant_id}/{file_hash}
        API->>DB: INSERT INTO documents (status="QUARANTINED")
        API->>Celery: Enqueue extraction task
        API-->>User: HTTP 202 Accepted (Upload Quarantined)
        Celery->>Quarantine: Read raw bytes
        Celery->>Celery: Run malware scan & arithmetic statement balance check
        alt Balance Sanity Check Fails
            Celery->>DB: UPDATE documents SET status="REJECTED_IMBALANCE"
        else Sanity Check Passes
            Celery->>CleanStore: Move file to verified-bucket/{tenant_id}/{file_hash}
            Celery->>DB: UPDATE documents SET status="VERIFIED_PARSED"
        end
    end
```

---

### 4.7 Financial Copilot Request Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant API as FastAPI Copilot Endpoint
    participant Guard as Prompt Injection Guard
    participant Agent as Copilot Execution Engine
    participant Registry as Read-Only Tool Registry (15 Tools)
    participant DB as PostgreSQL Read Replica

    User->>API: POST /api/v1/copilot/query {"query": "What is my net worth and tax liability?"}
    API->>Guard: Scan prompt against injection regex rules
    alt Prompt Injection Detected
        Guard-->>User: HTTP 400 Bad Request ("Query rejected by security guardrails")
    else Query Clean
        Guard->>Agent: Initialize agent context with user tenant_id
        Agent->>Agent: Determine required tools: [get_net_worth, get_tax_liability]
        Agent->>Registry: Invoke tool: get_net_worth(tenant_id)
        Registry->>DB: Execute read-only calculation
        DB-->>Registry: Net worth: ₹1,45,20,000
        Agent->>Registry: Invoke tool: get_tax_liability(tenant_id)
        Registry->>DB: Execute read-only tax calculation
        DB-->>Registry: Estimated tax: ₹2,15,400
        Agent->>Agent: Synthesize answer with grounded source citations
        Agent-->>API: Final structured response
        API-->>User: HTTP 200 OK {"answer": "...", "citations": [...], "confidence": 0.98}
    end
```

---

### 4.8 User Account Deletion & Right-to-be-Forgotten Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as Authenticated User
    participant API as FastAPI Backend
    participant Redis as Redis Token Store
    participant DB as PostgreSQL Primary
    participant Vault as MinIO Object Storage

    User->>API: DELETE /api/v1/users/me {confirmation: "DELETE MY ACCOUNT AND DATA"}
    API->>API: Validate user credentials & confirmation token
    API->>DB: Check if user is sole OWNER of active Household
    alt Household has other members and user is sole OWNER
        API-->>User: HTTP 400 Conflict ("Transfer Household ownership before deletion")
    else Deletion Permitted
        API->>DB: BEGIN TRANSACTION (app.current_tenant_id = user_tenant_id)
        API->>DB: Soft-delete / anonymize personal identity records (audit compliance)
        API->>DB: Delete user preferences, API keys, notifications
        API->>DB: Purge quarantined and uploaded documents
        API->>Vault: Delete tenant documents in MinIO
        API->>DB: Revoke all provider consents & purge encrypted credentials
        API->>DB: Mark user record as DELETED (status="DELETED", email=anonymized_uuid)
        API->>DB: COMMIT TRANSACTION
        API->>Redis: Blacklist all issued JWTs for user (TTL: 7 days)
        API-->>User: Set-Cookie: Clear session cookies
        API-->>User: HTTP 200 OK {"status": "ACCOUNT_DELETED", "timestamp": "2026-11-08T..."}
    end
```
