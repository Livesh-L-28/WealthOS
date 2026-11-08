# WealthOS — Phase 8: India Tax Readiness Architecture Specification

**Document Version:** 1.0.0  
**Phase:** Phase 8 — Wave 3 Master Implementation  
**Status:** IMPLEMENTED & VERIFIED  
**Module Path:** `backend/app/domains/tax/`  

---

## 1. Executive Summary & Non-Authoritative Scope

The WealthOS India Tax Readiness module provides end users with structured, evidence-backed tax readiness insights. It consolidates financial records, categorizes income under standard Indian income tax heads, isolates capital gains using realized FIFO lot disposals, extracts verified Form 16 / TDS credits, and models tax liability under both the **New Concessional Tax Regime (Section 115BAC)** and the **Old Tax Regime**.

### Crucial Regulatory Disclaimer
The module is strictly an **Informational Tax Readiness & Organization Tool**. It does not file tax returns with the Income Tax Department (ITD), does not replace a qualified Chartered Accountant (CA), and does not represent an authoritative legal tax determination. All user-facing screens and reports feature prominent, non-dismissible advisory disclaimers.

---

## 2. Temporal Architecture: Financial Year (FY) vs Assessment Year (AY)

In India:
- A **Financial Year (FY)** runs from **April 1** of year $Y$ through **March 31** of year $Y+1$.
- The corresponding **Assessment Year (AY)** is the year immediately following the FY, during which income earned in the FY is assessed and filed:
  $$\text{AY} = (Y+1) - (Y+2)$$

Examples:
- Income earned between **01-Apr-2025 and 31-Mar-2026** $\rightarrow$ **FY 2025-26** $\rightarrow$ **AY 2026-27**.
- Income earned between **01-Apr-2026 and 31-Mar-2027** $\rightarrow$ **FY 2026-27** $\rightarrow$ **AY 2027-28**.

All transactions are bound to the exact transaction date falling inside the $[ \text{01-Apr-FY}_{\text{start}}, \text{31-Mar-FY}_{\text{end}} ]$ interval.

---

## 3. Heads of Income & Aggregation Pipeline

Income is categorized into five statutory heads:

1. **Income from Salaries:**
   - Base salary, Dearness Allowance (DA), special allowances, performance bonus.
   - Less Standard Deduction:
     - New Regime: **₹75,000** (effective FY 2024-25 onwards)
     - Old Regime: **₹50,000**
2. **Income from House Property:**
   - Gross annual value (rental income received) minus municipal taxes paid.
   - Less statutory deduction of 30% under Section 24(a).
   - Less home loan interest deduction under Section 24(b) (up to ₹2,00,000 for self-occupied in Old Regime; restricted in New Regime).
3. **Profits and Gains of Business or Profession (PGBP):**
   - Professional freelancing or consulting income net of allowable expenses.
4. **Capital Gains:**
   - Realized gains from disposition of capital assets (Equity, Debt, Mutual Funds, Real Estate).
   - Determined using Wave 1 actual FIFO lot liquidation records.
   - Segmented into Short-Term Capital Gains (STCG) and Long-Term Capital Gains (LTCG).
5. **Income from Other Sources (IFOS):**
   - Bank savings account interest (eligible for Sec 80TTA deduction up to ₹10,000 in Old Regime).
   - Fixed deposit interest.
   - Dividend income from shares and mutual funds.

---

## 4. Strict Non-Income Credit Exclusion (Transfer Neutrality)

A primary failure in automated tax tracking is treating internal transfers, refunds, or loans as taxable income. The WealthOS tax engine applies strict non-income filtering:

1. **Internal Account Transfers:**
   - Any transaction tagged as `TRANSFER` or moving money between accounts belonging to the same tenant ($\Delta \text{Assets} = 0$) is completely excluded from Gross Total Income.
2. **Loan Disbursements & Borrowings:**
   - Inflows from loan originations are credited to liabilities, not income.
3. **Refunds & Reimbursements:**
   - Reversals of medical, expense, or merchant charges are netted against corresponding expenses rather than treated as income.
4. **Capital Inflows:**
   - Maturity of investments where principal is returned without gain is excluded from ordinary income.

---

## 5. Capital Gains FIFO Engine Integration

Capital gains are computed directly from realized dispositions recorded in `investment_holding_lots` and financial transaction sales:

### 5.1 Holding Period Classification (Finance Act 2024 Rules)
- **Listed Equity & Equity Mutual Funds:**
  - Holding period $\le 12$ months: **Short-Term Capital Gain (STCG)** (Taxed at 20% under Section 111A).
  - Holding period $> 12$ months: **Long-Term Capital Gain (LTCG)** (Taxed at 12.5% under Section 112A, with annual exemption up to ₹1,25,000).
- **Unlisted Shares & Real Estate:**
  - Holding period $\le 24$ months: STCG (Taxed at slab rates).
  - Holding period $> 24$ months: LTCG (Taxed at 12.5% without indexation).
- **Specified Mutual Funds / Debt Funds (Acquired on or after 01-Apr-2023):**
  - Always deemed **Short-Term Capital Gain** regardless of holding period (Taxed at ordinary slab rates under Section 50AA).

---

## 6. Versioned Tax Computation Engine

The computation applies versioned tax tables based on `rule_version` (e.g. `2026.1`):

### 6.1 New Tax Regime (Section 115BAC — Default)
- **Standard Deduction:** ₹75,000 for salaried employees.
- **Tax Slabs (Finance Act 2024 / FY 2025-26 & FY 2026-27):**
  - Up to ₹3,00,000: **Nil**
  - ₹3,00,001 to ₹7,00,000: **5%**
  - ₹7,00,001 to ₹10,00,000: **10%**
  - ₹10,00,001 to ₹12,00,000: **15%**
  - ₹12,00,001 to ₹15,00,000: **20%**
  - Above ₹15,00,000: **30%**
- **Section 87A Rebate:** If taxable income $\le ₹7,00,000$, full tax rebate (tax payable = ₹0).
- **Health & Education Cess:** 4% on tax liability before TDS.

### 6.2 Old Tax Regime (Optional)
- **Standard Deduction:** ₹50,000.
- **Deductions:** Section 80C (up to ₹1,50,000), Section 80D (Health Insurance up to ₹25,000 / ₹50,000), Section 80TTA (Savings interest up to ₹10,000), Section 24(b) (Home loan interest up to ₹2,00,000).
- **Tax Slabs:**
  - Up to ₹2,50,000: **Nil**
  - ₹2,50,001 to ₹5,00,000: **5%**
  - ₹5,00,001 to ₹10,00,000: **20%**
  - Above ₹10,00,000: **30%**
- **Section 87A Rebate:** If taxable income $\le ₹5,00,000$, full tax rebate (tax payable = ₹0).
- **Health & Education Cess:** 4% on tax liability.

### 6.3 Net Tax Payable
$$\text{Net Tax Payable} = \max(0, \text{Total Tax Liability} - \text{TDS Credits})$$
If $\text{TDS Credits} > \text{Total Tax Liability}$, the excess represents an **Estimated Refund Due**.
