# WealthOS Wave 1 — User & Operator Guide
## Financial Foundation, Control Centre, Cash Management & Investment Accounting

---

## 1. Introduction

WealthOS is an enterprise-grade personal wealth management and financial intelligence platform. It provides institutional accounting rigor disguised as an intuitive, approachable user interface.

This guide provides end users and operators with practical instructions on how to use the Wave 1 capabilities.

---

## 2. Financial Control Centre (`/reconciliation`)

The Financial Control Centre is the operational heart of WealthOS. It allows users to verify that bank statements, credit card records, and mutual fund/stock holdings match the internal double-entry ledger.

### Key Capabilities:
- **Reconciliation Status Summary:** Shows total reconciled records, active variances requiring review, duplicate candidates, and overall data freshness.
- **Filterable Discrepancy Queue:** View discrepancies grouped by severity (`HIGH`, `MEDIUM`, `LOW`) and category (`AMOUNT_MISMATCH`, `DUPLICATE_CANDIDATE`, `MISSING_RECORD`, `DATE_VARIANCE`).
- **One-Click Triage Actions:**
  - **Match:** Confirm that an external transaction matches an internal ledger entry.
  - **Mark Duplicate:** Flag duplicate statement rows to exclude them from double counting.
  - **Resolve:** Apply an audited adjustment entry to bring records into balance.
  - **Reject / Escalate:** Flag suspicious entries for further investigation.
- **CAS Holdings Comparison:** Compare imported Consolidated Account Statements against tracked demat folio lots.

---

## 3. Cash & Liquidity Management (`/accounts` & `/dashboard`)

The Cash Management engine guarantees that users always know their true available spending power without risking overdrafts or disrupting scheduled investments.

### Key Capabilities:
- **Consolidated Cash Position:** View liquid funds across all savings, checking, and cash accounts in a single number.
- **Explicit Multi-Currency Breakdown:** Liquid funds in INR, USD, EUR, and GBP are never artificially blended without explicit exchange rate conversion.
- **Account Transfer Neutrality:** Moving money from HDFC Salary to SBI Emergency Savings updates individual account balances while preserving total net worth ($\Delta\text{NetWorth} = 0$).
- **Deterministic Cash-Flow Forecasting:**
  - Generate mathematically reproducible 30-day, 90-day, and 12-month forward projections.
  - Incorporates recurring income (salary, dividends) and recurring expenses (rent, SIPs, EMIs).
- **Zero-Mutation What-If Scenario Simulations:**
  - Simulate the liquidity impact of major life events (e.g., job transition, large capital purchase, market downturn).
  - Simulations run in memory without altering actual bank accounts or posted transactions.

---

## 4. Professional Investment Accounting (`/investments`)

The Investment engine manages stocks, mutual funds, ETFs, and bonds with professional tax-lot precision.

### Key Capabilities:
- **Strict FIFO Lot Accounting:**
  - Every buy trade creates a discrete acquisition lot with timestamp, purchase price, and capitalized fees/taxes.
  - Disposals strictly consume the oldest open lots first.
  - Negative inventory is prohibited: you can never sell shares you do not own.
- **Realized vs Unrealized P&L:**
  - **Unrealized Gain/Loss:** Mark-to-market difference between current market price and open lot cost basis.
  - **Realized Gain/Loss:** Locked profit or loss computed on disposal date.
- **Tax-Lot Inspector Tab:**
  - Switch to the **FIFO Lots & Tax Basis** tab to inspect individual tranches.
  - View holding duration with automated Short-Term Capital Gains (STCG) vs Long-Term Capital Gains (LTCG) badges (&gt;365 days).
- **Corporate Actions & Stock Splits:**
  - Record stock splits (e.g. 2:1 split).
  - The engine doubles share count and halves unit purchase price, keeping total cost basis strictly invariant.
- **Dividend Recognition:**
  - Track gross dividends, tax withheld at source (TDS), and net cash credited.

---

## 5. Security & Multi-Tenancy

- **Row-Level Security (RLS):** Every database query is strictly partitioned by tenant workspace.
- **Immutable Ledger:** Posted double-entry transactions cannot be deleted. Any corrections require balanced reversal entries.
- **AES-256-GCM Backups:** Automated backups are cryptographically encrypted with SHA-256 checksum verification.
