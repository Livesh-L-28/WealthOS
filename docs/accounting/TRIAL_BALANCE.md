# WealthOS — Trial Balance & General Ledger Reporting

## 1. Mathematical Integrity of the Trial Balance

A Trial Balance aggregates all posted account balances at a point in time or over an accounting period. It verifies that debit entries equal credit entries across the entire ledger.

$$\sum_{\text{All Accounts}} \text{Debit Balance} \equiv \sum_{\text{All Accounts}} \text{Credit Balance}$$

---

## 2. Reporting Rules
1. **Exclude Drafts:** Unposted drafts are strictly omitted.
2. **Date Boundaries:** Balances can be evaluated as of any target date.
3. **Integrity Assurance:** If total debit balances do not match total credit balances down to $0.0001$, the engine flags a critical integrity error rather than masking the imbalance.
