# WealthOS — Wave 4 User Guide: Financial Copilot & Household Wealth Management

**Audience:** End Users, Families, Couples, Financial Advisors  
**Document Version:** 1.0.0  

---

## 1. AI Financial Copilot & Personal Financial Digital Twin

The WealthOS Financial Copilot is your conversational financial analyst. It is designed to explain, contextualize, and explore your finances without taking unauthorized actions.

### 1.1 Grounded Answers with Evidence Citations
Whenever you ask a question such as:
- *"What is my current net worth?"*
- *"Where did my money go this month?"*
- *"What is my India tax liability for FY 2026-27?"*

The Copilot runs deterministic financial tools directly against your workspace's double-entry records and cites the source of every figure. It never hallucinates numbers or balances.

### 1.2 What-If Financial Simulations
Explore hypothetical decisions safely:
- *"What if I cut expenses by 10%?"*
- *"Simulate prepaying ₹50,000 on my home loan"*

The simulation computes the impact on your monthly burn rate, annual savings, and debt payoff timeline without altering your real accounts or general ledger.

### 1.3 Personal Financial Digital Twin
The Digital Twin summarizes your overall financial state into a single cohesive profile:
- **Freshness Status:** `CURRENT` indicates recent synchronized data across cash, investments, debts, and budgets.
- **Liquid Net Worth:** Calculates your true spendable cushion after subtracting immediate debt obligations.
- **Emergency Runway:** Computes how many months of living expenses your liquid cash can sustain.

---

## 2. Household Wealth Management

Household Wealth Management lets families, couples, or partners pool financial visibility while maintaining privacy boundaries.

### 2.1 Three Levels of Privacy Containment
1. **`PERSONAL_ONLY`:** Your private personal accounts. Invisible to other household members.
2. **`HOUSEHOLD_SHARED`:** Joint accounts, shared home loans, or properties. Fully visible and consolidated into household totals.
3. **`LIMITED_SHARED`:** Balances are included in the household net worth total, but individual transaction lines and merchant names remain private.

### 2.2 Deduplicated Household Net Worth
Joint assets with fractional ownership (e.g. 50/50 property) are counted exactly once at 100% in the household balance sheet, preventing double-counting.

### 2.3 Transfer-Neutral Internal Reimbursements
When you pay a ₹10,000 grocery bill and your partner reimburses you ₹5,000:
- Record it under **Record Settlement**.
- The payment is recognized as an internal settlement. It does **not** count as new taxable income for you, nor does it create a duplicate living expense for your partner.

### 2.4 Collaborative Household Goals
Set shared milestones (e.g. "Family Vacation Fund" or "Child Higher Education"):
- Track collective progress toward the target amount.
- Record individual member contributions transparently.
