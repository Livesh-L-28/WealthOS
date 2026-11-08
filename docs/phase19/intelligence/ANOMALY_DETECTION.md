# WealthOS Phase 19 — Real-Time Financial Anomaly Detection

## 1. Automated Detection Triggers

| Anomaly Type | Math Condition | Severity | Plain-English Action |
| :--- | :--- | :--- | :--- |
| `EXPENSE_SPIKE` | Monthly Spend $\ge 2.5\times$ 90-day baseline average | `HIGH` | Identify abnormal categorical spending |
| `LIQUIDITY_DETERIORATION` | Emergency cash $< 1.5$ months burn rate | `CRITICAL` / `HIGH` | Replenish liquid cash buffer |
| `UNUSUAL_SINGLE_OUTFLOW` | Single transfer $\ge 35\%$ of total depository cash | `HIGH` | Verify transaction legitimacy |
| `DEBT_BURDEN_ACCELERATION`| Debt EMI $> 45\%$ of net monthly income | `CRITICAL` / `HIGH` | Plan debt restructuring / prepayments |

