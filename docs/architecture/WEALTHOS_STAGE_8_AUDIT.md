# WealthOS — Stage 8 Pre-Implementation Audit & Dependency Verification
## Enterprise Reports, Notifications & Financial Provider Integrations

**Document Version:** 1.0.0  
**Date:** 2026-11-08  
**Repository:** `Livesh-L-28/WealthOS`  
**Active Branch:** `feature/final-financial-intelligence-production`  
**HEAD Commit SHA:** `6bf59e1279f187422f258ae9b77546efb231ff6f`  
**Approved Baseline Commit (Phase 4):** `e4fe49bb50aa41b790e86dd779efcf4bcc1b1a40`  
**CI Pipeline Status:** 100% Green across all workflow runs (`42399910740`, `42399593689`, `42399258411`, `42398836343`, `42398211550`, `42394010791`)  
**Backend Regression Suite:** 127 / 127 tests passing (16.83s execution duration)

---

## 1. Executive Summary

This audit serves as **Subphase 1** of **Stage 8: Enterprise Reports, Notifications & Financial Provider Integrations** in the WealthOS Final Phase milestone.

Stage 8 constructs the communication, export, and external connectivity infrastructure of WealthOS. While Stages 2–7 established the financial ledger, asset portfolios, document intelligence, analytics engine, AI Copilot, and budgeting/forecasting engines, Stage 8 solves three mission-critical operational requirements:
1. **Authoritative Financial Reporting:** Structured generation, multi-format export (PDF, Excel, CSV), and automated recurring scheduling of 12 canonical financial reports, strictly sourcing figures from verified Stage 5 analytics services and the Phase 4 double-entry general ledger.
2. **Centralized Notification Engine:** A unified, event-driven notification framework spanning all system domains, supporting in-app inbox management, delivery tracking, quiet-hours suppression, robust deduplication keys against worker retries, and strict non-disabling policies for mandatory security alerts.
3. **Secure Financial Provider Integration Framework:** An adapter-based external data synchronization pipeline operating under strict user consent, cryptographic envelope encryption (AES-256-GCM), incremental sync cursors, untrusted payload validation, and Stage 4 reconciliation review before ledger posting.

---

## 2. Inventory of Existing Codebase & Reusable Infrastructure (Stages 0–7)

### 2.1 Object Storage & Document Vault (Stage 0 / Phase 2)
- **`backend/app/infrastructure/storage.py`:**
  - Fully implements MinIO/S3 private bucket management (`wealthos-documents`, `wealthos-vault`, `wealthos-quarantine`).
  - Supports bucket allowlisting, strict key sanitization via `SAFE_KEY_PATTERN` (`^[a-zA-Z0-9_\-\./]+$`), MIME signature sniffing, and short-lived presigned URL generation with HMAC validation.
  - **Stage 8 Reuse:** Report exports (PDF, Excel, CSV) and provider sync logs will be stored in `wealthos-documents` under isolated tenant prefixes `tenants/{tenant_id}/reports/{report_id}/` and downloaded solely via short-lived authenticated presigned URLs.

### 2.2 Asynchronous Tasks, Idempotency & Distributed Locking (Stage 0 / Phase 2)
- **`backend/app/infrastructure/celery_app.py`:**
  - Implements Celery 5.4 application with Redis broker and result backend.
  - Provides atomic Redis-backed distributed locks (`acquire_task_lock`, `release_task_lock`) with owner token validation via atomic Lua scripts to guarantee fail-closed execution.
  - Implements queue routing topology (`default`, `ocr_heavy`, `market_data`).
  - **Stage 8 Reuse:** Report generation jobs, scheduled report delivery, notification dispatch, and incremental provider synchronization will execute as idempotent background tasks using dedicated queues (`reports`, `notifications`, `provider_sync`).

### 2.3 Cryptography & Envelope Encryption (Stage 0 / Phase 3)
- **`backend/app/core/config.py` & `backend/app/core/security.py`:**
  - `ENCRYPTION_MASTER_KEY`: 32-byte master key configured in settings, validated against insecure defaults in production.
  - `cryptography>=42.0.5` installed in Python 3.12 environment.
  - **Stage 8 Reuse:** Financial provider OAuth tokens, refresh tokens, client secrets, and API credentials will be encrypted at rest using AES-256-GCM authenticated envelope encryption with dedicated per-tenant salt, 12-byte initialization vectors (IVs), and authentication tags. Zero plaintext credentials will touch logs, database columns, or API outputs.

### 2.4 Document Generation Libraries (Stage 4 / Phase 4)
- **Installed Packages:**
  - `reportlab>=4.2.0`: Standard enterprise PDF generation engine with flowables, tables, canvas styling, and pagination support.
  - `openpyxl>=3.1.2`: Excel `.xlsx` workbook generation with formula protection, cell typing, auto-filtering, and styling.
  - `pypdf>=4.2.0`: PDF inspection, page counting, and metadata extraction.
  - `csv` (Standard Library): RFC 4180 compliant CSV serialization with explicit formula injection escaping.

### 2.5 General Ledger & Accounting Engine (Phase 4)
- **`PostingService.create_and_post`:** Enforces double-entry invariance ($\sum \text{Debits} = \sum \text{Credits}$), idempotency keys, and open accounting periods.
- **`ChartOfAccountsService` & `BalanceService`:** Canonical source of truth for posted ledger balances.
- **Stage 8 Reuse:** Reporting engine uses GL trial balances for wealth overview and income/expense validation. Provider integration transactions must be posted strictly via `PostingService` once reconciled.

### 2.6 Domain Core & Analytics Foundations (Stages 2–7)
- **Stage 2 Finance:** `financial_accounts`, `financial_transactions`, `transaction_categories`, `recurring_transaction_rules`.
- **Stage 3 Portfolio:** `assets`, `liabilities`, `investment_holding_lots` (FIFO), `passive_income_records`.
- **Stage 4 Document Intelligence & Reconciliation:** `reconciliation_sessions`, `reconciliation_matches`, `reconciliation_exceptions`.
- **Stage 5 Financial Analytics:** Canonical metric registries, `NetWorthAnalyticsService`, `CashFlowAnalyticsService`, `PortfolioAnalyticsService`.
- **Stage 6 AI Copilot:** Tool registry and grounded RAG retrieval.
- **Stage 7 Planning & Forecasting:** `budgets`, `financial_goals`, `forecast_runs`, `financial_scenarios`.

---

## 3. Identification of Missing Capabilities for Stage 8

To fulfill Stage 8 requirements, the following modules, schemas, and abstractions must be implemented:

| Domain | Missing Capability | Required Architectural Solution |
| :--- | :--- | :--- |
| **Reporting** | Report definitions & parameter binding | `ReportDefinition` entity with dynamic scope validation and JSON schema parameters |
| **Reporting** | Multi-format export engine | Unified `ReportExporter` protocol with `PdfReportExporter` (ReportLab), `ExcelReportExporter` (openpyxl), and `CsvReportExporter` |
| **Reporting** | Formula Injection Defense | Strict prefix escaping for Excel/CSV cells starting with `=`, `+`, `-`, `@`, `\t`, `\r` |
| **Reporting** | Recurring Report Scheduler | Scheduled Celery cron/interval tasks with tenant isolation and duplicate suppression |
| **Notifications** | Centralized Event Bus | In-memory and Celery-backed domain event dispatcher routing events across all 9 domains |
| **Notifications** | Multi-channel Delivery Adapters | Abstract `NotificationChannel` with concrete `InAppNotificationChannel` and `EmailNotificationChannel` (SMTP/SES) |
| **Notifications** | Deduplication & Quiet Hours | Redis deduplication keys (`tenant:recipient:event:source:version`) and timezone-aware quiet hours suppression |
| **Notifications** | Non-disabling Security Alerts | System enforcement guaranteeing security alerts cannot be suppressed or muted |
| **Integrations** | Provider Registry & Capability Flags | Registry model declaring provider ID, capabilities, authorization methods, and rate limits |
| **Integrations** | `FinancialProviderAdapter` ABC | Unified contract for auth, accounts, balances, transactions, holdings, cursors, and health checks |
| **Integrations** | User Consent & Scope Management | Granular consent tracking with validity timestamps, purpose descriptions, and one-click revocation |
| **Integrations** | Credential Envelope Encryption | `CredentialEncryptionService` executing AES-256-GCM encryption with per-record IV and auth tag |
| **Integrations** | Incremental Sync & Cursors | Resilient sync worker tracking incremental state, batch cursors, error retries, and rollback safety |
| **Integrations** | Untrusted Payload Ingestion | Stage 4 reconciliation review queue integration for ambiguous or unverified external transactions |

---

## 4. Financial Provider Ecosystem Audit: India-First & Global Realities

To satisfy the mandatory requirement: **"Do not create fake provider integrations, simulated bank connections, or made-up credentials,"** the provider landscape is audited below.

### 4.1 Indian Banking & Account Aggregator (AA) Ecosystem
- **Regulatory Framework:** Reserve Bank of India (RBI) Master Direction on Non-Banking Financial Company - Account Aggregator (NBFC-AA) Directions, 2016 (`DNBR.PD.030/03.10.119/2016-17`).
- **Operating Architecture:**
  - Participants: Financial Information Providers (FIPs — Banks, NBFCs), Financial Information Users (FIUs — Registered entities such as SEBI-registered RIAs or RBI entities), and NBFC-AAs (e.g., Setu/Pine Labs, Sahamati, OneMoney, Finvu, Anumati).
  - Protocol: ReBIT Technical Specifications (RESTful APIs with digital signatures, end-to-end encrypted payloads using Diffie-Hellman ephemeral keys, and signed consent artifacts).
- **WealthOS Integration Status:**
  - **Licensing Dependency:** Direct production access requires FIU registration and contractual agreements with a licensed NBFC-AA or certified TSP (Technical Service Provider).
  - **Implementation Strategy:** Implement the ReBIT 1.1.2 standard Account Aggregator adapter contract (`AccountAggregatorAdapter`) supporting standard consent initiation, polling, and FI data fetching. In development/staging environments without live FIU production keys, the adapter operates against documented sandbox endpoints or marks live status as `REQUIRES_APPROVAL`.

### 4.2 Indian Stock Brokerage Ecosystem (e.g. Zerodha Kite Connect, Upstox)
- **API Framework:**
  - Zerodha Kite Connect API v3: Documented REST APIs for holdings, positions, margins, orders, and user profile. Requires Zerodha Developer App registration, API Key, API Secret, and OAuth2 authorization code redirect flow resulting in a daily `access_token` (valid until 06:00 IST next day).
- **WealthOS Integration Status:**
  - **Implementation Strategy:** Implement `ZerodhaKiteAdapter` strictly conforming to Kite Connect API v3 documentation. Credential management handles `api_key`, `api_secret`, and encrypted session tokens. If credentials are missing in deployment, the connection is displayed as `REQUIRES_CONFIGURATION` / `REQUIRES_APPROVAL`.

### 4.3 Mutual Fund & Depository Ecosystem (CAMS, KFintech, CDSL/NSDL)
- **API Framework:**
  - Direct depository APIs for personal retail accounts are restricted; depositories do not offer open OAuth2 for third-party SaaS without extensive institutional depository participant licensing.
  - The standard retail method for mutual fund and equity holdings is the **Consolidated Account Statement (CAS)** in PDF or eCAS format.
- **WealthOS Integration Status:**
  - Leverages WealthOS Stage 4 Document Intelligence to ingest, parse, verify, and reconcile CAS statements. Documented in adapter registry as `CAS_DOCUMENT_SYNC` with status `AVAILABLE`.

### 4.4 International Banking & Aggregators (Plaid, Teller, MX)
- Plaid / Teller require commercial US/UK developer agreements and client IDs.
- **WealthOS Integration Status:** Documented in provider registry as `REQUIRES_APPROVAL` with international scope; deferred in favor of the India-first financial core.

---

## 5. Security, Privacy & Compliance Boundaries

### 5.1 Digital Personal Data Protection (DPDP) Act, 2023 (India)
- **Explicit Consent:** Section 6 of DPDP Act mandates consent that is free, specific, informed, unconditional, and unambiguous with clear notice.
- **Withdrawal of Consent:** Users must be able to withdraw consent at any time as easily as giving consent. Revocation immediately terminates synchronization and triggers credential deletion.
- **Data Minimization:** WealthOS requests only read-only scopes necessary for financial management (e.g., `accounts:read`, `transactions:read`, `holdings:read`). Fund transfers, trading execution, or write permissions are strictly excluded.

### 5.2 Banking & Password Protection Policy
- **Zero Scraping:** Headless browser scraping (Puppeteer/Selenium) of banking portals is strictly prohibited due to violation of bank terms of service, fraud prevention policies, and credential security.
- **Zero Credential Custody:** WealthOS will NEVER prompt for or store bank login passwords, transaction passwords, UPI PINs, ATM PINs, or SMS OTPs.

### 5.3 Spreadsheet Formula Injection Mitigation
- Exported Excel (`.xlsx`) and CSV files containing user-provided descriptions, payee names, or merchant text must prevent Formula Injection (CSV Injection / CWE-1236).
- All string cells starting with `=`, `+`, `-`, `@`, `\t`, or `\r` must be sanitized by prepending a single quote (`'`) or stripping dangerous control prefixes before rendering.

---

## 6. Pre-Implementation Audit Sign-Off

The audit confirms:
1. Reusable storage, Celery, database RLS, and cryptography components are operational and healthy.
2. The 127 existing backend regression tests are 100% green.
3. Provider integration requirements are mapped to legitimate APIs (RBI AA, Zerodha Kite Connect, CAMS/KFintech CAS) with no simulated or fake implementations.
4. Compliance, DPDP consent, and formula security boundaries are explicitly defined.

**Status:** AUDIT PASSED — PROCEED TO ARCHITECTURE & TECHNICAL SPECIFICATION.
