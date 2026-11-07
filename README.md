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

- [x] **PHASE 0: Product Specification & Architecture Baseline** (PRD, SRS, System Architecture, Database Design, Security Architecture, ADRs, ERD, Threat Model, RTM)
- [ ] **PHASE 1: Human-Designed UI/UX Specifications** (User journeys, wireframes, design tokens, component specifications)
- [ ] **PHASE 2: Repository & Infrastructure Foundation** (Monorepo, Next.js, FastAPI, PostgreSQL 16, Redis, Celery, MinIO, Docker Compose, CI/CD)
- [ ] **PHASE 3: Authentication & Security Foundation** (Argon2id, TOTP MFA, session cookies, RBAC, tenant context)
- [ ] **PHASE 4: Financial Accounting Engine** (Double-entry general ledger, journal entries, balance invariants, reversals)
- [ ] **PHASE 5: Income & Expenses** (Accounts, transactions, splits, categories, recurring bills)
- [ ] **PHASE 6: Assets & Liabilities** (Real estate, gold, loans, amortization schedules, net worth engine)
- [ ] **PHASE 7: Investment Portfolio & FIFO Engine** (Instruments, broker accounts, trades, FIFO lots, LTCG/STCG P&L)
- [ ] **PHASE 8: Dividends & Passive Income** (Announcements, TDS withholding, bank matching)
- [ ] **PHASE 9: Universal Document Intelligence** (PDF, Excel, OCR extraction pipeline, Canonical Financial Schema)
- [ ] **PHASE 10: Financial Reconciliation** (Duplicate detection, matching rules, human review & approval gate)
- [ ] **PHASE 11: Complete Application Dashboard** (Real-time financial metrics, cash flow, allocation charts, drill-downs)
- [ ] **PHASE 12: AI Financial Copilot** (Grounded natural language queries, deterministic calculations)
- [ ] **PHASE 13: Budgeting, Goals & Forecasting** (Envelopes, goal progress, savings rates)
- [ ] **PHASE 14: Mobile Application** (Expo React Native client for iOS & Android)
- [ ] **PHASE 15: Reports & Provider Integrations** (PDF/Excel exports, notifications, Account Aggregator hooks)
- [ ] **PHASE 16: Production Hardening** (Penetration testing, performance benchmarks, deployment)

---

## 📄 LICENSE & SECURITY

WealthOS is proprietary software. For vulnerability reporting, consult [SECURITY.md](./SECURITY.md).
