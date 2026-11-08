# WealthOS — Phase 7: Financial Planning & Forecasting Architecture Specification

**Document Version:** 1.0.0  
**Phase:** Phase 7 — Wave 3 Master Implementation  
**Status:** IMPLEMENTED & VERIFIED  
**Module Path:** `backend/app/domains/planning/`  

---

## 1. Executive Summary & Philosophy

Phase 7 delivers a deterministic, transparent financial planning and projection system. The mission is to empower end users to understand their holistic financial position, evaluate the feasibility of multi-horizon life goals, forecast future cash flows, plan retirement, and simulate financial decisions without complex financial jargon.

### Architectural Invariants
1. **Zero Double-Counting:** Goal allocations represent an intentional partitioning or tagging of existing liquid or invested wealth. They never create a duplicate asset balance or shadow ledger account.
2. **Explicit Assumption Attribution:** All projections disclose their assumed annual return rates and category-specific inflation rates. Actual historical portfolio returns are strictly segregated from simulated future projections.
3. **Deterministic Arithmetic:** All monetary calculations use Python `Decimal` and PostgreSQL `NUMERIC(18, 4)` with rounded compounding. Binary floats are prohibited.
4. **Simulation Non-Mutation:** What-if scenario modeling runs in isolation, producing analytical projections without modifying real accounts, transactions, or journal vouchers.

---

## 2. Mathematical Formulations & Feasibility Engine

### 2.1 Inflation-Adjusted Target Cost
For a current estimated expense $C_0$, annual category inflation rate $i$, and horizon $n$ in months ($y = n / 12$ years):
$$FV_{\text{target}} = \text{round}\left(C_0 \times (1 + i)^y, 4\right)$$

Category Inflation Defaults:
- General Living Expenses: $6.0\%$
- Higher / Children's Education: $10.0\%$
- Healthcare & Medical: $8.0\%$
- Real Estate & Housing: $7.0\%$

### 2.2 Future Value of Wealth & Required Monthly Savings
Given current savings $A_0$, planned monthly contribution $PMT$, expected annual return $R$, and monthly rate $r = R / 12$:

1. **Future Value of Current Savings:**
   $$FV_{\text{current}} = A_0 \times (1 + r)^n$$
2. **Future Value of Monthly Savings Stream:**
   $$FV_{\text{contributions}} = PMT \times \frac{(1 + r)^n - 1}{r}$$
   *(If $r = 0$, $FV_{\text{contributions}} = PMT \times n$)*
3. **Total Projected Wealth at Target Date:**
   $$FV_{\text{projected}} = FV_{\text{current}} + FV_{\text{contributions}}$$
4. **Required Monthly Contribution to Bridge Target:**
   $$PMT_{\text{required}} = \max\left(0, \frac{FV_{\text{target}} - FV_{\text{current}}}{\frac{(1 + r)^n - 1}{r}}\right)$$

### 2.3 Feasibility Classification State Machine
- **`ON_TRACK`:** $FV_{\text{projected}} \ge 0.95 \times FV_{\text{target}}$
- **`NEEDS_ADJUSTMENT`:** $0.75 \times FV_{\text{target}} \le FV_{\text{projected}} < 0.95 \times FV_{\text{target}}$
- **`AT_RISK`:** $FV_{\text{projected}} < 0.75 \times FV_{\text{target}}$

---

## 3. Retirement Corpus & Drawdown Engine

For current age $A_{\text{curr}}$, retirement age $A_{\text{ret}}$, life expectancy $A_{\text{life}}$, monthly living expenses $E_0$, general inflation $i$, pre-retirement return $R_{\text{pre}}$, and post-retirement return $R_{\text{post}}$:

1. **Years to Retirement ($Y_{\text{work}}$) and Years in Retirement ($Y_{\text{ret}}$):**
   $$Y_{\text{work}} = A_{\text{ret}} - A_{\text{curr}}, \quad Y_{\text{ret}} = A_{\text{life}} - A_{\text{ret}}$$
2. **Monthly Expense at Day 1 of Retirement:**
   $$E_{\text{ret}} = E_0 \times (1 + i)^{Y_{\text{work}}}$$
3. **Real Return in Retirement ($r_{\text{real}}$):**
   $$r_{\text{real}} = \frac{1 + R_{\text{post}}}{1 + i} - 1$$
4. **Target Retirement Corpus ($C_{\text{target}}$):**
   Using an annuity due formula to fund inflation-adjusted annual withdrawals for $Y_{\text{ret}}$ years:
   $$C_{\text{target}} = (12 \times E_{\text{ret}}) \times \frac{1 - (1 + r_{\text{real}})^{-Y_{\text{ret}}}}{r_{\text{real}}}$$
5. **Projected Corpus from Existing Savings + Monthly Contribution:**
   $$C_{\text{projected}} = C_{\text{existing}} \times (1 + R_{\text{pre}})^{Y_{\text{work}}} + PMT \times \frac{(1 + R_{\text{pre}} / 12)^{12 \times Y_{\text{work}}} - 1}{R_{\text{pre}} / 12}$$
6. **Funding Gap:**
   $$\text{Gap} = \max(0, C_{\text{target}} - C_{\text{projected}})$$

---

## 4. Emergency Fund Coverage

- **Essential Monthly Expenses:** Calculated from active housing/utility budgets + mandatory loan EMIs + subsistence groceries.
- **Liquid Assets:** Bank accounts, high-yield savings, and overnight liquid funds only (illiquid property, retirement lock-ins, and equity holdings are strictly excluded).
- **Coverage Ratio:**
  $$\text{Months of Coverage} = \frac{\text{Liquid Cash Assets}}{\text{Essential Monthly Expenses}}$$
- Target threshold default: 6.0 months.

---

## 5. What-If Simulation Engine

The simulation engine takes a baseline snapshot and evaluates parameterized adjustments:
1. **Income Volatility:** $\Delta \text{Income} \in [-50\%, +50\%]$
2. **Expense Inflation:** $\Delta \text{Expenses} = +\$X$ or $+Y\%$
3. **Accelerated Debt Extinguishment:** Lump-sum prepayment simulation
4. **Market Shocks:** Return stress tests ($R \in [4\%, 14\%]$)
Outputs delta on net worth, goal completion dates, and cash runway without mutating production records.
