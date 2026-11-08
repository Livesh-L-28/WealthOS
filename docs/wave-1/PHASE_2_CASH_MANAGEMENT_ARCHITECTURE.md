# Wave 1 — Phase 2: Cash Management & Liquidity Architecture

**Project:** WealthOS  
**Wave:** Wave 1  
**Phase:** Phase 2 (Cash Management System)  
**Date:** 2026-11-08  
**Standard:** Master Wave 1 Specification — Section 6.

---

## 1. Mission & Architectural Principles

The Cash Management System delivers consolidated liquidity intelligence, deterministic multi-horizon cash-flow projections, recurring obligation tracking, and scenario simulation without violating financial posting invariants.

### Non-Negotiable Invariants
1. **Transfer Neutrality:** Transfers between owned accounts are strictly non-income and non-expense ($\Delta\text{NetWorth} = 0$).
2. **Explicit Currency Segregation:** Balances in different currencies are never silently summed without explicit, auditable FX conversion.
3. **Receipt Realization Principle:** Expected future receipts (e.g. expected salary) must never be counted as realized cash.
4. **Deterministic Projections:** Forecasts use transparent mathematical formulas; simulation parameters do not mutate persisted financial ledger records.
5. **Loan Principal vs Interest Segregation:** Debt repayments separate principal amortization from finance expense.

---

## 2. Multi-Horizon Forecasting Engine

Projections span three configurable horizons:
- **30-Day Tactical Horizon:** Daily granularity based on confirmed bills, active recurring rules, and scheduled transfers.
- **90-Day Operational Horizon:** Weekly granularity incorporating regular payroll, recurring subscriptions, and quarterly tax/insurance obligations.
- **12-Month Strategic Horizon:** Monthly granularity modeling discretionary baseline burn, bonus income, and annual policy renewals.

### Projection Classification Taxonomy
| Tier | Description | Source Criteria |
| :--- | :--- | :--- |
| **`ACTUAL`** | Historical settled ledger transactions | Committed General Ledger entries |
| **`CONFIRMED`** | Invoiced or contractually fixed amounts | Direct debit mandates, utility bills |
| **`SCHEDULED`** | User-configured recurring payment rules | Active `recurring_transaction_rules` |
| **`EXPECTED`** | High-probability incoming receipts | Verified salary patterns, known rent |
| **`ESTIMATED`** | Rolling average baseline consumption | 90-day moving average discretionary burn |

---

## 3. Liquidity Formulas

$$\text{Total Liquid Cash} = \sum_{\text{Asset Accounts}} \text{Available Balance}$$

$$\text{Average Monthly Essential Burn} = \frac{\sum_{\text{90 days}} (\text{Rent} + \text{Utilities} + \text{Groceries} + \text{EMI} + \text{Insurance})}{3}$$

$$\text{Emergency Fund Coverage (Months)} = \frac{\text{Eligible Liquid Reserves}}{\text{Average Monthly Essential Burn}}$$

---

## 4. API Endpoints (`/api/v1/cash-management/*`)

- `GET /api/v1/cash-management/position` — Consolidated multi-account cash position and liquidity metrics.
- `GET /api/v1/cash-management/forecast` — Deterministic forecast across 30d, 90d, or 12m horizons.
- `POST /api/v1/cash-management/recurring-rules` — Register recurring payment obligation or income stream.
- `GET /api/v1/cash-management/recurring-rules` — List active recurring rules with next due dates.
- `POST /api/v1/cash-management/simulate-scenario` — Run deterministic scenario (EMI addition, income shock, expense increase) without ledger mutation.
