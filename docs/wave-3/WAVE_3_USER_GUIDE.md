# WealthOS — Wave 3: End-User & Operational Guide

**Document Version:** 1.0.0  
**Target Audience:** WealthOS Users, Wealth Managers, System Administrators  
**Date:** 08-Nov-2026  

---

## 1. Financial Planning & Forecasting (Phase 7)

### 1.1 Goal Setting & Feasibility Tracking
Navigate to **Goals** (`/goals`):
- **Set a Goal:** Enter a target amount, maturity date, and monthly contribution commitment.
- **Inflation-Adjusted Toggle:** Switch on "Adjust for Inflation" to view real purchasing power requirements. The engine automatically compounds target costs based on category (General: 6%, Education: 10%, Housing: 7%).
- **Feasibility Badges:**
  - `ON TRACK`: Current savings velocity is projected to reach $\ge 95\%$ of target cost.
  - `NEEDS ADJUSTMENT`: Projected to reach $75\% - 95\%$. The card indicates the exact additional monthly contribution required to close the gap.
  - `AT RISK`: Projected to reach $< 75\%$. Immediate attention needed.

### 1.2 Actuarial Retirement Planning
Click on the **Retirement Planning** tab under Goals:
- Input Current Age, Target Retirement Age, and Life Expectancy.
- Enter current living expenses.
- Review your **Target Retirement Corpus** (computed via actuarial Annuity Due formula taking into account post-retirement real returns) vs **Projected Corpus**.
- Inspect your **Retirement Readiness Percentage** and required monthly savings.

### 1.3 What-If Scenario Simulations
- Test life decisions: simulate a 20% salary increase, debt prepayment, or return stress tests.
- Projections are purely analytical and **never alter your real accounts or transaction ledgers**.

---

## 2. India Tax Readiness (Phase 8)

### 2.1 Overview & Scope
Navigate to **Analytics & Tax** (`/analytics`):
- **Statutory Heads of Income:** WealthOS categorizes your earnings into Salary, House Property, Capital Gains, and Other Sources.
- **Transfer Neutrality:** Money transferred between your own accounts is automatically excluded from taxable income.
- **FIFO Capital Gains:** Realized stock and mutual fund disposals are classified into Short-Term (STCG) and Long-Term (LTCG) with the Section 112A ₹1,25,000 exemption.

### 2.2 Dual-Regime Tax Optimization
- **New Tax Regime (Section 115BAC):** Standard deduction of ₹75,000 applies automatically. Section 87A rebate provides full tax rebate for taxable income up to ₹7,00,000.
- **Old Tax Regime:** Incorporates Chapter VI-A deductions (Section 80C, 80D, 80TTA) and home loan interest.
- **Recommendation Card:** WealthOS automatically calculates which regime saves you more money and displays the exact difference in tax liability.

*Note: WealthOS Tax Readiness is a preparatory organization tool and not an official tax filing engine. Always consult a qualified Chartered Accountant before filing.*

---

## 3. Financial Risk Intelligence (Phase 9)

### 3.1 Financial Health Score (0–100)
- Located on your **Analytics** dashboard.
- Measures your overall financial resilience across 5 transparent pillars:
  1. **Emergency Reserve (25%):** Target 6 months of living expenses + debt service.
  2. **Debt Service Burden (25%):** Target EMI-to-income ratio $\le 35\%$.
  3. **Cash Flow & Savings (20%):** Consistency of monthly surplus cash flow.
  4. **Portfolio Diversification (15%):** Avoidance of over-concentration in single stocks or sectors.
  5. **Data Freshness & Integrity (15%):** Regular reconciliation of bank accounts and statement verifications.

### 3.2 Evidence-Backed Risk Warnings
- Alerts are triggered only when empirical thresholds are breached (e.g. debt service $> 40\%$, emergency reserve $< 3$ months, or loan maturity within 60 days).
- Every alert includes the specific accounts and figures responsible.
- Click **Acknowledge** or **Resolve** with your personal notes once remediation steps have been taken.
