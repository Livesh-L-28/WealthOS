# WealthOS — Enterprise-Grade Personal Wealth Intelligence Platform

[![Status](https://img.shields.io/badge/Status-Phase_0_Architecture_Baseline_Frozen-success?style=flat-square)](./WEALTHOS_PRD.md)
[![Architecture](https://img.shields.io/badge/Architecture-Modular_Monolith-blue?style=flat-square)](./SYSTEM_ARCHITECTURE.md)
[![Ledger](https://img.shields.io/badge/Ledger-Double--Entry_General_Ledger-emerald?style=flat-square)](./DATABASE_DESIGN.md)
[![UI%2FUX](https://img.shields.io/badge/UI%2FUX-Human--Designed_FinTech-indigo?style=flat-square)](./WEALTHOS_PRD.md)

WealthOS is a production-oriented, commercial multi-tenant personal wealth management and financial intelligence SaaS platform. Engineered for modern individuals, families, and high-net-worth investors, WealthOS provides absolute financial truth by uniting liquid bank accounts, income, spending, investment portfolios (NSE/BSE equities, mutual funds, gold, bonds, retirement schemes), physical assets, debts, and tax-critical documents into a single verifiable, double-entry general ledger.

---

## 🏛️ ARCHITECTURAL PILLARS

1. **Immutable Double-Entry General Ledger:**
   Every balance update is anchored in balanced journal entries ($\sum \text{Debit} \equiv \sum \text{Credit}$) stored with PostgreSQL `NUMERIC(18, 4)` precision. Zero floating-point drift, zero unexplained balance jumps, complete historical auditability.
2. **Universal Document Intelligence Pipeline:**
   Ingest bank statements, broker contract notes, consolidated account statements (CAS), salary slips, and receipts across PDF, Excel, CSV, and image formats. Documents are parsed asynchronously via Celery and PyMuPDF/OCR, validated for arithmetic integrity, and held in an explicit **human review and approval gate** before posting to the ledger.
3. **Multi-Asset Portfolio Engine with FIFO Cost-Basis:**
   Native tracking for Indian capital markets (NSE/BSE equities, AMFI mutual funds, Sovereign Gold Bonds, EPF/PPF/NPS, FDs) with First-In, First-Out (FIFO) tax lot tracking for LTCG / STCG capital gains.
4. **Human-Designed FinTech User Experience:**
   Strict prohibition of AI-generated frontend UI. WealthOS features a handcrafted, information-dense, high-contrast dark foundation (`#0B0F17` canvas, `#111827` surface panels) built with Next.js 14, Tailwind CSS, shadcn/ui primitives, and Apache ECharts.
5. **Deterministic AI Financial Copilot:**
   Natural language financial intelligence grounded strictly in verified tenant-scoped database records and deterministic calculation tools. Zero write access to the ledger, zero fabricated figures.
6. **Robust Multi-Tenant Security & Privacy:**
   Row-level workspace isolation, Argon2id password hashing, TOTP multi-factor authentication, AES-256-GCM envelope encryption for integration secrets, and alignment with India's DPDP Act 2023 and RBI Account Aggregator guidelines.

---

## 📁 REPOSITORY STRUCTURE

```
wealthos/
├── apps/
│   ├── web/                     # Next.js 14 Web Application (Desktop & Tablet)
│   └── mobile/                  # Expo React Native Application (iOS & Android)
├── backend/
│   ├── app/
│   │   ├── api/                 # Versioned REST API Routers (/api/v1)
│   │   ├── core/                # Config, DB engine, security, exceptions, middleware
│   │   ├── domains/             # 26 Modular Financial Domains (Clean Architecture)
│   │   ├── infrastructure/      # S3/MinIO, Redis, Celery app
│   │   └── workers/             # Celery background tasks (OCR, reconciliations)
│   ├── migrations/              # Alembic database migrations
│   └── tests/                   # Pytest test suite (unit, integration, invariants)
├── packages/
│   ├── shared-types/            # Shared TypeScript & Pydantic models
│   ├── design-tokens/           # Handcrafted FinTech design tokens
│   └── api-client/              # Type-safe API client
├── infrastructure/
│   ├── docker/                  # Docker Compose & container configurations
│   ├── monitoring/              # Observability dashboards
│   └── deployment/              # Production deployment scripts
├── docs/                        # Architecture, DB, API, Security specifications
│   ├── architecture/
│   │   ├── decisions/           # Architecture Decision Records (ADR-001 to ADR-010)
│   │   ├── API_BOUNDARIES.md    # Domain boundaries & REST contracts
│   │   ├── REQUIREMENTS_TRACEABILITY_MATRIX.md # RTM mapping requirements
│   │   ├── SYSTEM_DIAGRAMS.md   # C4 diagrams & runtime topology
│   │   └── THREAT_MODEL.md      # STRIDE threat model & DREAD ratings
│   └── database/
│       └── ER_DIAGRAM.md        # Relational ER diagram & constraint policies
├── WEALTHOS_PRD.md              # Product Requirements Document
├── WEALTHOS_SRS.md              # Software Requirements Specification (IEEE 830)
├── SYSTEM_ARCHITECTURE.md       # Comprehensive System Architecture
├── DATABASE_DESIGN.md           # Relational Database Schema & Data Dictionary
├── SECURITY_ARCHITECTURE.md     # Security Architecture & Compliance
└── README.md                    # Project Master Documentation
```

---

## 🗺️ PHASE-WISE ROADMAP

- [x] **PHASE 0: Product Specification & Architecture Baseline** (PRD, SRS, System Architecture, Database Design, Security Architecture, ADRs, ERD, Threat Model, RTM) — Tag: `v0.1.0-phase0`
- [x] **PHASE 1: Human-Designed UI/UX Specifications** (20 Domains IA, 16 User Journeys, 65 Reconciled Screens, WCAG AA Design Tokens, Usability Plan) — Tag: `v0.2.0-phase1`
- [x] **PHASE 2: Repository & Infrastructure Foundation** (FastAPI async runtime, PostgreSQL 16, Redis 7, Celery queues, MinIO, Next.js 14 App Router, Expo mobile, Docker Compose, CI/CD)
- [x] **PHASE 3: Authentication & Security Foundation** (Argon2id, TOTP MFA, session cookies, RBAC, tenant context, PostgreSQL Row-Level Security)
- [x] **PHASE 4: Financial Accounting Engine** (Immutable double-entry general ledger, 52-account COA template, balance invariants, mirror reversals, multi-currency NUMERIC(18,4), period closures, reconciliation primitives)
- [x] **PHASE 5: Income & Expenses** (Accounts, transactions, splits, categories, recurring bills)
- [x] **PHASE 6: Assets & Liabilities** (Real estate, gold, loans, amortization schedules, net worth engine)
- [x] **PHASE 7: Investment Portfolio & FIFO Engine** (Instruments, broker accounts, trades, FIFO lots, LTCG/STCG P&L)
- [x] **PHASE 8: Dividends & Passive Income** (Announcements, TDS withholding, bank matching)
- [x] **PHASE 9: Universal Document Intelligence** (PDF, Excel, OCR extraction pipeline, Canonical Financial Schema)
- [x] **PHASE 10: Financial Reconciliation** (Duplicate detection, matching rules, human review & approval gate)
- [x] **PHASE 11: Complete Application Dashboard** (Real-time financial metrics, cash flow, allocation charts, drill-downs)
- [x] **PHASE 12: AI Financial Copilot** (Grounded natural language queries, deterministic calculations)
- [x] **PHASE 13: Budgeting, Goals & Forecasting** (Envelopes, goal progress, savings rates)
- [x] **PHASE 14: Mobile Application** (Expo React Native client for iOS & Android)
- [x] **PHASE 15: Reports & Provider Integrations** (PDF/Excel exports, notifications, Account Aggregator hooks)
- [x] **PHASE 16: Production Hardening** (Penetration testing, performance benchmarks, deployment)

---

## 🚀 QUICKSTART: LOCAL DEVELOPMENT

### Option A: Complete Docker Compose Cluster
```bash
# Start all services (Database, Redis, MinIO, API, Celery Workers, Next.js Web)
docker compose up -d

# Verify system health
curl http://localhost:8000/api/v1/health
```

### Option B: Local Hybrid Development
```bash
# 1. Start backing services in Docker
docker compose up -d postgres redis minio minio-init

# 2. Run backend API
cd backend
python3 -m pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000

# 3. Run Next.js web application
npm run --workspace=@wealthos/web dev
```

### Option C: Automated Testing
```bash
# Run backend pytest suite (127 tests including full accounting engine & RLS)
cd backend
uv run pytest -v

# Run frontend quality checks & vitest tests
npm run typecheck
npm test
npm run --workspace=@wealthos/web lint
```

---

## 📄 LICENSE & SECURITY

WealthOS is proprietary software. For vulnerability reporting, consult [SECURITY.md](./SECURITY.md).
