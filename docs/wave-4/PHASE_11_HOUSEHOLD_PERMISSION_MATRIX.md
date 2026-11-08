# WealthOS — Phase 11: Household Permission & Visibility Matrix

**Document Version:** 1.0.0  
**Status:** Certified Policy  
**Domain:** `app.domains.household`  

---

## 1. Household Role Permissions Matrix

| Capability | OWNER | ADMIN | MEMBER | VIEWER |
| :--- | :---: | :---: | :---: | :---: |
| **Delete Household** | Yes | No | No | No |
| **Transfer Ownership** | Yes | No | No | No |
| **Invite New Members** | Yes | Yes | No | No |
| **Remove / Suspend Members** | Yes | Yes (non-owners) | No | No |
| **Modify Household Currency / Timezone** | Yes | Yes | No | No |
| **Create Shared Household Goal** | Yes | Yes | Yes | No |
| **Contribute to Shared Goal** | Yes | Yes | Yes | No |
| **Share Own Financial Account / Liability** | Yes | Yes | Yes | No |
| **Unshare Own Resource** | Yes | Yes | Yes | No |
| **Record Internal Settlement** | Yes | Yes | Yes | No |
| **View Consolidated Household Net Worth** | Yes | Yes | Yes | Yes |
| **View Shared Budgets & Goal Progress** | Yes | Yes | Yes | Yes |
| **Query Household Copilot** | Yes | Yes | Yes | Yes |

---

## 2. Resource Visibility Scopes

| Visibility Scope | Individual Personal View | Household Consolidated Net Worth | Other Household Members Detail View |
| :--- | :--- | :--- | :--- |
| **`PERSONAL_ONLY`** | 100% visible with full transaction lines | Excluded ($0) | Hidden (Zero leakage) |
| **`HOUSEHOLD_SHARED`** | Visible (pro-rated by ownership %) | 100% included (counted once) | Fully visible (balances & transactions) |
| **`LIMITED_SHARED`** | Visible (pro-rated by ownership %) | 100% included (counted once) | Aggregated balance visible; transaction lines & merchant details masked |

---

## 3. Transfer Neutrality & Settlement Rules

1. **Member-to-Member Settlement:**
   - When Member A reimburses Member B for a shared bill, the transaction is logged as `household_settlements` (`status='COMPLETED'`).
   - Neither party's income statement records the inflow as taxable income.
   - The outflow is not categorized as duplicate living expense.
2. **Net Settlement Balance:**
   - The system tracks net inter-member payable/receivable balances:
     $$\text{Net Balance}_{A \to B} = \sum \text{Shared Expenses Paid by B on behalf of A} - \sum \text{Reimbursements from A to B}$$
