# WealthOS Financial Metric Dictionary

## 1. Registry Specification

This dictionary registers all 13 financial metrics computed by the WealthOS Analytics Engine.

| Metric Key | Metric Name | Domain | Unit | Aggregation | Allowed Grains | Source-of-Truth Reference | Invariant Formula |
|---|---|---|---|---|---|---|---|
| `net_worth` | Consolidated Net Worth | Wealth | Currency (INR) | Point-in-time | Day, Month, Quarter, Year | `journal_entries`, `financial_accounts`, `liabilities` | $\text{Assets} - \text{Liabilities}$ |
| `cash_flow` | Net Operating Cash Flow | Cash | Currency (INR) | Sum | Day, Week, Month, Year | `transactions` (excluding transfers) | $\text{Inflows} - \text{Outflows}$ |
| `income_expenses` | Income & Expense Velocity | Cash | Currency (INR) | Sum | Day, Week, Month, Year | `transactions`, `journal_entries` | $\sum \text{Credit Income} - \sum \text{Debit Expense}$ |
| `budget_utilization` | Budget Envelope Utilization | Budget | Percentage (%) | Ratio | Month, Year | `budget_categories`, `transactions` | $\frac{\text{Eligible Spending}}{\text{Approved Limit}} \times 100$ |
| `portfolio_performance` | Investment Portfolio AUM | Investment | Currency (INR) | Point-in-time | Day, Month, Quarter, Year | `investment_holdings`, `market_prices` | $\sum (\text{Quantity} \times \text{NAV/Price})$ |
| `asset_allocation` | Asset Class Allocation | Investment | Percentage (%) | Ratio | Point-in-time | `investment_holdings`, `financial_accounts` | $\frac{\text{Asset Value}}{\text{Total Portfolio Value}} \times 100$ |
| `portfolio_returns` | Realized vs Unrealized Returns | Investment | Currency (INR) | Sum / Point-in-time | Month, Year | `investment_holding_lots` (FIFO) | $\text{Mark-to-Market} - \text{Cost Basis}$ |
| `debt_amortization` | Principal vs Interest Amortization | Liability | Currency (INR) | Sum | Month, Year | `liability_amortization_schedules` | $\text{Monthly EMI} = \text{Principal} + \text{Interest}$ |
| `goal_progress` | Financial Goal Milestone | Planning | Percentage (%) | Ratio | Month, Year | `financial_goals`, `goal_contributions` | $\frac{\text{Accumulated Corpus}}{\text{Target Amount}} \times 100$ |
| `wealth_forecast` | Projected Net Worth Trajectory | Planning | Currency (INR) | Point-in-time | Year | `forecast_runs`, inflation compounding | Compound growth projection |
| `financial_health` | Solvency & Risk Health Score | Risk | Score (0-100) | Weighted Index | Point-in-time | 5-pillar risk evaluation | Weighted multi-signal index |
| `tax_liability` | India Income Tax Liability | Tax | Currency (INR) | Sum | Financial Year | Salary, LTCG/STCG, Sec 115BAC | Finance Act 2024 tax slabs + cess |
| `household_net_worth` | Collaborative Household Wealth | Household | Currency (INR) | Point-in-time | Month, Year | Shared accounts, ownership shares | $\sum (\text{Shared Assets} \times \text{Share \%}) - \text{Debts}$ |

