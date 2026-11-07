# WEALTHOS — SYSTEM ARCHITECTURE DIAGRAMS & RUNTIME TOPOLOGY

**Document Reference:** WOS-ARCH-DIAG-001  
**Version:** 1.0.0-RELEASE-CANDIDATE  
**Status:** APPROVED / FROZEN BASELINE  

---

## 1. INFRASTRUCTURE & RUNTIME TOPOLOGY

```mermaid
flowchart TB
    subgraph "Client Layer"
        WebBrowser["Modern Web Browser (Desktop / Tablet)"]
        MobileApp["iOS & Android Device (Expo Mobile Client)"]
    end

    subgraph "Docker Compose / Local Development Cluster"
        subgraph "Ingress & Edge"
            Caddy["Reverse Proxy / Edge Router (Port 80/443)"]
        end

        subgraph "Frontend Services"
            NextWeb["Next.js 14 SSR & Static App (Port 3000)"]
        end

        subgraph "Application Core"
            FastAPI["FastAPI Modular Monolith API (Port 8000)"]
            CeleryDefault["Celery Worker: Default Queue"]
            CeleryOCR["Celery Worker: Heavy OCR Queue"]
            CeleryBeat["Celery Beat Periodic Scheduler"]
        end

        subgraph "State & Persistence Services"
            Postgres[("PostgreSQL 16 DB (Port 5432)")]
            RedisCluster[("Redis 7.2 Broker & Cache (Port 6379)")]
            MinIOStore[("MinIO Private S3 Storage (Port 9000/9001)")]
        end
    end

    WebBrowser -->|"HTTP / WS"| Caddy
    MobileApp -->|"HTTP"| Caddy
    Caddy -->|"Route /"| NextWeb
    Caddy -->|"Route /api/*"| FastAPI
    NextWeb -->|"Server-Side API calls"| FastAPI
    
    FastAPI -->|"DB Read/Write (Async)"| Postgres
    FastAPI -->|"Session / Cache / Locks"| RedisCluster
    FastAPI -->|"Put / Get Object Signed URLs"| MinIOStore
    FastAPI -->|"Enqueue Background Jobs"| RedisCluster
    
    RedisCluster -->|"Distribute Tasks"| CeleryDefault
    RedisCluster -->|"Distribute Heavy OCR Tasks"| CeleryOCR
    CeleryBeat -->|"Periodic Triggers"| RedisCluster
    
    CeleryDefault -->|"Update Extraction Batches"| Postgres
    CeleryOCR -->|"Read Raw Statement Files"| MinIOStore
    CeleryOCR -->|"Save Parsing Results"| Postgres
```

---

## 2. CELERY ASYNCHRONOUS WORKER QUEUE TOPOLOGY

To ensure fast user interaction, background workloads are partitioned across specialized Redis queues:

```mermaid
graph LR
    subgraph "FastAPI Producer"
        P1["Document Upload Endpoint"]
        P2["Market Price Ingestion Service"]
        P3["Tax Report Export Endpoint"]
    end

    subgraph "Redis 7.2 Message Queues"
        Q_OCR["Queue: ocr_heavy (Concurrency: 2, PyMuPDF, OCR)"]
        Q_DEFAULT["Queue: default (Concurrency: 4, Reconciliations, Alerts)"]
        Q_MARKET["Queue: market_data (Concurrency: 2, NAV, EOD feeds)"]
        Q_EXPORTS["Queue: exports (Concurrency: 1, PDF / Excel generation)"]
    end

    subgraph "Dedicated Celery Worker Pool"
        W_OCR["Worker: ocr_worker"]
        W_DEF["Worker: default_worker"]
        W_MKT["Worker: market_worker"]
    end

    P1 --> Q_OCR
    P2 --> Q_MARKET
    P3 --> Q_EXPORTS

    Q_OCR --> W_OCR
    Q_DEFAULT --> W_DEF
    Q_MARKET --> W_MKT
```

---

## 3. NET WORTH POINT-IN-TIME CALCULATION ENGINE

```mermaid
flowchart TD
    A["Calculate Net Worth as of Date T"] --> B["Fetch All Active Financial Accounts"]
    B --> C["Fetch All Investment Holdings as of T"]
    C --> D["Fetch All Physical Assets Valuations as of T"]
    D --> E["Fetch All Outstanding Liabilities Balances as of T"]
    
    subgraph "Assets Aggregation"
        B --> A1["Cash & Bank Balances (Cleared)"]
        C --> A2["Investment Market Value (Units * Price_T)"]
        D --> A3["Real Estate & Physical Assets Valuations"]
        A1 & A2 & A3 --> TOTAL_ASSETS["Total Assets = A1 + A2 + A3"]
    end

    subgraph "Liabilities Aggregation"
        E --> L1["Mortgage & Home Loans Principal"]
        E --> L2["Vehicle & Personal Loans Principal"]
        E --> L3["Credit Card Balances & Short-Term Debt"]
        L1 & L2 & L3 --> TOTAL_LIAB["Total Liabilities = L1 + L2 + L3"]
    end

    TOTAL_ASSETS --> CALC["Net Worth = Total Assets - Total Liabilities"]
    TOTAL_LIAB --> CALC
    CALC --> RESULT["Persist Historical Snapshot / Render in Dashboard"]
```

---

## 4. DIVIDEND & BANK RECONCILIATION STATE MACHINE

```mermaid
stateDiagram-v2
    [*] --> ANNOUNCED: Corporate Announcement Ingested
    ANNOUNCED --> ELIGIBLE: Record Date Passed & Holdings Verified
    ELIGIBLE --> PENDING_RECEIPT: Ex-Date Passed, Awaiting Payment Date
    PENDING_RECEIPT --> RECEIVED_UNMATCHED: Payout Date Passed
    
    RECEIVED_UNMATCHED --> MATCHED: Bank Credit Found (Amount & Date Window Match)
    MATCHED --> POSTED_TO_LEDGER: Human Approves Link or Auto-Rule Confirmed
    POSTED_TO_LEDGER --> [*]: Ledger Posted & TDS Recorded
```
