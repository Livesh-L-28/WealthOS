# WealthOS — Phase 10: Copilot Tool Registry & Allowlist Specification

**Document Version:** 1.0.0  
**Status:** Certified Registry  
**Domain:** `app.domains.copilot.tools`  

---

## 1. Registry Architecture

Every tool available to the Financial Copilot is registered in `AVAILABLE_TOOLS` with:
1. `handler`: Strongly-typed asynchronous Python callable scoped to `session: AsyncSession, tenant_id: uuid.UUID`.
2. `description`: Human- and LLM-readable function description.
3. `parameters`: Parameter definitions with typing and constraints.
4. `read_only`: Strictly `True`.

---

## 2. Tool Inventory Across Waves 1–4

| Tool Name | Wave / Domain | Description | Source Citations Provided |
| :--- | :--- | :--- | :--- |
| `get_net_worth` | Wave 1 / Foundational | Net worth = Total assets minus total liabilities | `assets_and_liabilities_ledger` |
| `get_account_balances` | Wave 1 / Cash | List all active checking, savings, and investment cash accounts | `financial_accounts` |
| `get_cash_position` | Wave 1 / Cash | Available liquid cash, reserves, and liquidity runway | `cash_accounts` |
| `get_budget_status` | Wave 2 / Budgets | Active budget allocations, spent amount, and variance | `budget_allocations` |
| `get_expense_summary` | Wave 2 / Budgets | Discretionary vs non-discretionary monthly spend breakdown | `financial_transactions` |
| `get_liability_summary` | Wave 2 / Liabilities | Active loans, credit cards, principal balances, monthly EMI obligations | `liabilities` |
| `get_loan_schedule` | Wave 2 / Liabilities | Amortization schedule, interest vs principal breakdown | `loan_payment_schedules` |
| `get_investment_holdings` | Wave 1 / Investments | Stock and mutual fund holdings, FIFO cost basis, unrealized gain/loss | `investment_holding_lots` |
| `get_financial_goals` | Wave 3 / Planning | Goals, target amounts, current progress, target completion dates | `financial_goals` |
| `get_retirement_projection` | Wave 3 / Planning | Retirement target corpus, accumulated savings, funding gap | `retirement_profiles` |
| `get_tax_readiness` | Wave 3 / India Tax | Income by head, deductions, tax liability comparison (New vs Old) | `tax_computations` |
| `get_risk_assessment` | Wave 3 / Risk | Financial health score (0-100) and active vulnerability alerts | `risk_assessments`, `risk_alerts` |
| `get_financial_forecast` | Wave 3 / Planning | 30-day, 90-day, and 12-month projected cash flow trajectory | `forecast_runs` |
| `get_digital_twin_status` | Wave 4 / Twin | Comprehensive Digital Twin state snapshot and freshness status | `financial_twin_snapshots` |
| `simulate_what_if` | Wave 4 / Simulation | Non-mutating scenario simulation (e.g. rate hike, expense cut, EMI prepayment) | `financial_scenarios` |

---

## 3. Strict Tool Refusal Policies

1. **State Mutation Commands:** If an inquiry asks to `create an account`, `transfer 50000`, `delete debt`, or `post journal entry`, the Copilot immediately refuses.
2. **Arbitrary SQL Execution:** Direct SQL execution, schema querying, or admin functions are strictly blocked.
3. **Cross-Tenant Parameters:** Tools accept only the session's verified `tenant_id` from the authenticated JWT token. Any user-supplied tenant ID is ignored.
