# WEALTHOS — SYSTEM ARCHITECTURE SPECIFICATION

**Document Reference:** WOS-ARCH-001  
**Architecture Style:** Modular Monolith with Asynchronous Background Workers  
**Target Environment:** Local-First Dockerized Architecture / Cloud Deployable  
**Version:** 1.0.0-RELEASE-CANDIDATE  
**Status:** APPROVED / FROZEN BASELINE  

---

## 1. ARCHITECTURAL PHILOSOPHY & PATTERNS

### 1.1 The Modular Monolith Advantage
WealthOS is intentionally structured as a **Modular Monolith** rather than distributed microservices:
1. **Financial Transaction Atomicity:** Double-entry journal entries must post across accounts, ledgers, tax lots, and balances in a single ACID transaction. Distributed two-phase commit (2PC) or Sagas introduce eventual consistency risks that are unacceptable in accounting systems.
2. **Operational Simplicity:** Avoids Kubernetes, service meshes, distributed tracing overhead, and complex network partitions while enabling local-first development with high velocity.
3. **Strict Domain Boundaries:** Each financial domain is an isolated module with its own models, schemas, repositories, and services. Cross-domain interactions occur strictly through explicit service interfaces, never by reaching into another domain's raw database tables.
4. **Asynchronous Scaling:** Computationally heavy operations (OCR parsing, document rendering, statement import, portfolio valuation history) are decoupled via Celery workers and Redis task queues.

---

## 2. C4 ARCHITECTURE MODELS

### 2.1 C4 Level 1: System Context Diagram

```mermaid
C4Context
    title System Context Diagram — WealthOS

    Person(user, "WealthOS User", "Individual, Family Member, or High-Net-Worth Investor")
    
    System(wealthos, "WealthOS Platform", "Personal wealth management & financial intelligence SaaS")

    System_Ext(minio, "Private Object Storage", "MinIO (Local) / AWS S3 (Prod) storing statements, receipts, and proofs")
    System_Ext(postgres, "PostgreSQL 16+", "Primary ACID database storing ledger, transactions, holdings, and tenant data")
    System_Ext(redis, "Redis Cache & Broker", "Session cache, rate limiter, and Celery message broker")
    System_Ext(market_data, "Market Data Sources", "AMFI NAV feeds, NSE/BSE corporate action feeds, FX rates")

    Rel(user, wealthos, "Manages wealth, uploads documents, tracks P&L, interacts with Copilot", "HTTPS / WSS")
    Rel(wealthos, postgres, "Reads and writes transactional records with ACID guarantees", "TCP / TLS :5432")
    Rel(wealthos, redis, "Caches sessions, coordinates background jobs", "TCP :6379")
    Rel(wealthos, minio, "Stores & retrieves encrypted financial documents", "S3 API :9000")
    Rel(wealthos, market_data, "Pulls verified NAVs, stock quotes, and corporate actions", "HTTPS REST")
```

---

### 2.2 C4 Level 2: Container Diagram

```mermaid
C4Container
    title Container Diagram — WealthOS

    Person(user, "User", "Web browser or Mobile client")

    Container(web, "Web Application", "Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui, ECharts", "Delivers responsive desktop and tablet human-designed fintech UI")
    Container(mobile, "Mobile Application", "React Native, Expo SDK 51, TypeScript", "Delivers native iOS & Android personal finance mobile client")
    Container(api, "Backend Core API", "FastAPI, Python 3.12, Pydantic v2, SQLAlchemy 2.x async", "Modular monolith API delivering RESTful services, double-entry ledger, auth, and copilot")
    Container(worker, "Background Processing Worker", "Celery 5.4, PyMuPDF, PaddleOCR, Pandas", "Executes asynchronous document classification, OCR, parsing, and reconciliations")
    
    ContainerDb(db, "Primary Relational Database", "PostgreSQL 16+", "Stores immutable double-entry ledger, accounts, tenants, FIFO lots, and audit logs")
    ContainerDb(cache, "Cache & Broker", "Redis 7.2", "Message queue for Celery, distributed locks, session storage, and rate limiting")
    ContainerDb(storage, "Encrypted Object Store", "MinIO / S3", "Tenant-partitioned private storage for financial documents and statements")

    Rel(user, web, "Interacts with", "HTTPS")
    Rel(user, mobile, "Interacts with", "Native App")
    Rel(web, api, "Invokes backend API endpoints", "JSON / HTTPS")
    Rel(mobile, api, "Invokes backend API endpoints", "JSON / HTTPS")
    Rel(api, db, "ACID ledger transactions, relational queries", "SQLAlchemy / asyncpg")
    Rel(api, cache, "User sessions, rate limits, publishes tasks", "redis-py")
    Rel(api, storage, "Generates signed upload/download URLs", "boto3 / S3 API")
    Rel(worker, cache, "Consumes document processing tasks", "AMQP/Redis protocol")
    Rel(worker, storage, "Fetches uploaded documents for parsing", "S3 API")
    Rel(worker, db, "Writes extracted financial batches and reconciliation results", "SQLAlchemy")
```

---

### 2.3 C4 Level 3: Backend Component Diagram

```mermaid
graph TD
    subgraph "FastAPI Backend Application"
        Router["API Gateway / Routers Layer (/api/v1/*)"]
        
        subgraph "Cross-Cutting Core"
            Auth["Identity, Auth & MFA (Argon2id, TOTP, JWT)"]
            Tenancy["Tenant Context Middleware & RBAC"]
            Audit["Audit Logging Service"]
            RateLimit["Rate Limiting & Security Headers"]
        end

        subgraph "Financial Domain Layer"
            AccountsDomain["Financial Accounts Domain"]
            LedgerDomain["Double-Entry Ledger Domain (Journal Entries & Lines)"]
            TxnDomain["Transactions, Income & Expense Domain"]
            InvestDomain["Investments & Portfolio Domain (FIFO Cost-Basis)"]
            PassiveDomain["Dividends & Interest Domain"]
            AssetLiabDomain["Assets, Liabilities & Loans Domain"]
            NetWorthDomain["Net Worth Calculation Domain"]
            DocDomain["Document Intelligence Domain"]
            ReconDomain["Reconciliation Engine Domain"]
            AnalyticsDomain["Analytics & Dashboard Engine"]
            CopilotDomain["AI Financial Copilot Domain (Read-Only Grounded)"]
        end

        subgraph "Infrastructure & Repositories"
            DBPool["SQLAlchemy Async Session Pool"]
            S3Client["MinIO / S3 Storage Client"]
            CeleryClient["Celery Task Dispatcher"]
        end
    end

    Router --> Auth
    Router --> Tenancy
    Tenancy --> AccountsDomain
    Tenancy --> LedgerDomain
    Tenancy --> TxnDomain
    Tenancy --> InvestDomain
    Tenancy --> PassiveDomain
    Tenancy --> AssetLiabDomain
    Tenancy --> NetWorthDomain
    Tenancy --> DocDomain
    Tenancy --> ReconDomain
    Tenancy --> AnalyticsDomain
    Tenancy --> CopilotDomain

    AccountsDomain --> LedgerDomain
    TxnDomain --> LedgerDomain
    InvestDomain --> LedgerDomain
    PassiveDomain --> LedgerDomain
    AssetLiabDomain --> LedgerDomain
    ReconDomain --> LedgerDomain

    LedgerDomain --> DBPool
    DocDomain --> S3Client
    DocDomain --> CeleryClient
    AnalyticsDomain --> DBPool
    CopilotDomain --> DBPool
```

---

## 3. CORE FINANCIAL DATA FLOW PIPELINES

### 3.1 Pipeline A: Universal Document Ingestion & Approval Gate

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as Web Frontend
    participant API as FastAPI Backend
    participant S3 as MinIO / S3 Storage
    participant Worker as Celery Worker
    participant DB as PostgreSQL 16
    
    User->>Web: Selects Bank Statement PDF / Excel
    Web->>API: POST /api/v1/documents/upload (Multipart)
    API->>API: Validate MIME Magic & Compute SHA-256
    API->>S3: PutObject to /tenants/{id}/documents/{hash}.pdf
    API->>DB: Insert Document (status='UPLOADED')
    API->>Worker: Enqueue task: process_document(document_id)
    API-->>Web: Return Document ID & Status
    
    Worker->>S3: Download Document Stream
    Worker->>Worker: Classify Type (Bank / Broker / Mutual Fund / Invoice)
    Worker->>Worker: Extract text/tables via PyMuPDF or OCR
    Worker->>Worker: Normalize into Canonical Financial Schema
    Worker->>Worker: Verify Opening + Inflows - Outflows == Closing
    Worker->>DB: Save CanonicalTransactionBatch (status='PENDING_REVIEW')
    Worker->>DB: Update Document (status='READY_FOR_REVIEW')
    
    User->>Web: Opens Document Review Interface
    Web->>API: GET /api/v1/documents/{id}/review
    API->>DB: Fetch Extracted Batch & Discrepancy Flags
    API-->>Web: Return JSON with Extracted Lines & Confidence
    
    User->>Web: Inspects, edits rows, clicks "Confirm & Post to Ledger"
    Web->>API: POST /api/v1/documents/{id}/approve
    API->>DB: Begin Atomic DB Transaction
    API->>DB: Create JournalEntries and JournalLines (Double-Entry)
    API->>DB: Update FinancialAccount balances
    API->>DB: Mark Batch 'POSTED' and Document 'PROCESSED'
    API->>DB: Commit DB Transaction
    API-->>Web: Success Response
    Web->>User: Displays Updated Net Worth & Transaction Records
```

---

### 3.2 Pipeline B: Double-Entry Transaction Ledger Posting Invariant

```mermaid
flowchart TD
    A["API Request: Post Transaction"] --> B["Extract Tenant Context (tenant_id)"]
    B --> C["Open Database Transaction (SERIALIZABLE)"]
    C --> D["Construct JournalEntry (Date, Memo, Reference)"]
    D --> E["Construct JournalLines (Debits and Credits)"]
    E --> F{"Is SUM(Debit) == SUM(Credit)?"}
    F -- "No: Discrepancy > 0.0000" --> G["Raise UnbalancedJournalEntryException"]
    G --> H["Rollback DB Transaction & Return 422 Unprocessable Entity"]
    F -- "Yes: Zero Discrepancy" --> I["Insert JournalEntry (status='POSTED')"]
    I --> J["Insert JournalLines (debit, credit, account_id)"]
    J --> K["Update FinancialAccount.current_balance atomically"]
    K --> L["Append Immutable Audit Log Entry"]
    L --> M["Commit Database Transaction"]
    M --> N["Emit Local Cache Invalidation Event"]
    N --> O["Return 201 Created with Posted Journal Data"]
```

---

### 3.3 Pipeline C: FIFO Securities Cost-Basis Engine

```mermaid
flowchart TD
    A["Sell Order Executed: Instrument X, Quantity Q_sell, Price P_sell"] --> B["Fetch Active Investment Lots for Instrument X (ORDER BY purchase_date ASC)"]
    B --> C["Initialize: Remaining_To_Sell = Q_sell, Total_Cost_Basis = 0"]
    C --> D{"Remaining_To_Sell > 0 and More Lots Available?"}
    D -- "Yes" --> E["Current Lot = Next Lot"]
    E --> F["Allocated_Qty = MIN(Remaining_To_Sell, Current_Lot.units_remaining)"]
    F --> G["Lot_Cost = Allocated_Qty * Current_Lot.unit_cost_price"]
    G --> H["Total_Cost_Basis += Lot_Cost"]
    H --> I["Current_Lot.units_remaining -= Allocated_Qty"]
    I --> J["Remaining_To_Sell -= Allocated_Qty"]
    J --> K["Record InvestmentSaleAllocation (sale_id, lot_id, Allocated_Qty, Lot_Cost)"]
    K --> D
    D -- "No and Remaining_To_Sell > 0" --> L["Raise InsufficientSharesException (Short selling unsupported)"]
    D -- "No and Remaining_To_Sell == 0" --> M["Calculate Realized P&L = (Q_sell * P_sell) - Total_Cost_Basis - Fees"]
    M --> N["Post Journal Entry:"]
    N --> O["Debit Asset:Cash = Net Proceeds"]
    N --> P["Credit Asset:Investments = Total_Cost_Basis"]
    N --> Q{"Realized P&L > 0?"}
    Q -- "Yes (Gain)" --> R["Credit Income:Realized Capital Gain = Realized P&L"]
    Q -- "No (Loss)" --> S["Debit Expense:Realized Capital Loss = ABS(Realized P&L)"]
    R --> T["Commit Transaction & Return Allocation Summary"]
    S --> T
```

---

## 4. MULTI-TENANT ISOLATION ARCHITECTURE

### 4.1 Row-Level Isolation Architecture
- Shared Database, Shared Process, Row-Level Isolation.
- Every query utilizes a tenant filter injected automatically via FastAPI dependency `get_current_tenant_id`:
  ```python
  stmt = select(Account).where(
      Account.tenant_id == current_tenant.id,
      Account.id == account_id
  )
  ```
- Any query lacking a tenant predicate is flagged during automated static analysis and code review.

### 4.2 Storage Key Hierarchy
Documents in S3 / MinIO are strictly partitioned by tenant:
```
/wealthos-vault/
   └── tenants/
        └── {tenant_id}/
             ├── documents/
             │    └── {year}/{month}/{file_hash}.{ext}
             ├── exports/
             │    └── {export_id}.zip
             └── avatars/
                  └── {user_id}.png
```
Pre-signed URLs are generated on-demand with a strict TTL of 300 seconds. Public read access to the bucket is prohibited.

---

## 5. REPOSITORY DIRECTORY LAYOUT

```
wealthos/
├── apps/
│   ├── web/                     # Next.js 14 Web Application
│   │   ├── src/
│   │   │   ├── app/             # App router pages
│   │   │   ├── components/      # Manually designed UI components (shadcn/ui based)
│   │   │   ├── lib/             # API client, formatting utils, state stores
│   │   │   └── styles/          # Tailwind CSS design system tokens
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── mobile/                  # Expo React Native Application
│       ├── src/
│       ├── app.json
│       └── package.json
├── backend/
│   ├── app/
│   │   ├── api/                 # API routers versioned under /api/v1
│   │   │   └── v1/
│   │   ├── core/                # Config, DB engine, security, exceptions, middleware
│   │   ├── domains/             # 26 Domain modules (clean architecture)
│   │   │   ├── auth/            # Identity & MFA
│   │   │   ├── tenancy/         # Workspaces & Memberships
│   │   │   ├── accounts/        # Financial Accounts
│   │   │   ├── ledger/          # Double-Entry Accounting Engine
│   │   │   ├── transactions/    # Inflows, Outflows, Splits
│   │   │   ├── investments/     # Portfolio, Instruments, FIFO lots
│   │   │   ├── dividends/       # Dividends & Interest
│   │   │   ├── assets/          # Real estate, gold, valuations
│   │   │   ├── liabilities/     # Loans, credit cards, amortization
│   │   │   ├── net_worth/       # Net worth snapshots & history
│   │   │   ├── documents/       # File upload & vault
│   │   │   ├── extraction/      # OCR, PDF/Excel parsers
│   │   │   ├── reconciliation/  # Reconciliation rule engine
│   │   │   ├── analytics/       # Aggregations, cash flow, spending
│   │   │   ├── copilot/         # Grounded AI assistant
│   │   │   ├── budgeting/       # Envelopes & goals
│   │   │   └── audit/           # Audit trail logging
│   │   ├── infrastructure/      # S3/MinIO, Redis, Celery app
│   │   └── workers/             # Celery background tasks
│   ├── migrations/              # Alembic database migrations
│   ├── tests/                   # Pytest test suite (unit, integration, invariants)
│   ├── pyproject.toml
│   └── Dockerfile
├── packages/
│   ├── shared-types/            # Shared TypeScript/Pydantic schemas
│   ├── design-tokens/           # FinTech color palettes, spacing, typography
│   └── api-client/              # Generated TypeScript API client
├── infrastructure/
│   ├── docker/                  # Docker Compose, Dockerfiles, dev configs
│   ├── monitoring/              # Prometheus, Grafana dashboards
│   └── deployment/              # Production deployment scripts
├── docs/                        # Architecture, DB, API, Security specifications
├── docker-compose.yml           # Unified local development compose
├── README.md
├── SECURITY.md
└── CONTRIBUTING.md
```
