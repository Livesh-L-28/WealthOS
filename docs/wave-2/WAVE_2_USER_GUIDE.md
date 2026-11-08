# WealthOS — Wave 2 User & Operator Guide

**Audience:** WealthOS End Users, Financial Planners, and System Administrators  
**Features Covered:** Budget & Expense Intelligence, Liability & Debt Management, Universal Financial Document Vault  

---

## 1. Budget & Expense Intelligence

### Creating a Spending Envelope
1. Navigate to **Budgets** from the primary navigation bar.
2. Click **New Budget Envelope**.
3. Select your desired period:
   - **Monthly:** Resets on the first of each month.
   - **Annual:** Full calendar-year planning.
   - **Custom:** Explicit date windows.
4. Allocate spending limits across standard categories (Housing, Groceries, Dining, Utilities, Healthcare, Technology, Transportation).
5. WealthOS automatically computes your **Budget Variance**:
   $$\text{Variance} = \text{Budgeted Amount} - \text{Actual Expenses}$$
   - **Positive Variance (Green):** You have headroom remaining in your envelope.
   - **Negative Variance (Red):** The envelope has exceeded its allocation.

### Threshold Alerts & Rollover
- **Automated Alerts:** WealthOS triggers notification warnings when category spend crosses **50%**, **75%**, **90%**, and **100%** of allocation.
- **Budget Rollover:** If enabled, unspent envelope surplus carries over to increase next month's spending allowance, or overspent deficits are deducted from next month's allocation.

---

## 2. Liability & Debt Management

### Adding a Loan or Credit Facility
1. Navigate to **Net Worth** and locate the **Recognized Liabilities** section.
2. Provide debt details:
   - **Type:** Mortgage, Auto Loan, Personal Loan, Education Loan, or Credit Card.
   - **Principal Amount & Annual Interest Rate (%):** e.g., ₹1,000,000 at 9.5% APR.
   - **Tenure:** Number of months.
3. WealthOS automatically calculates the exact reducing-balance monthly installment (EMI) and generates the full amortization schedule.

### Recording Installment Payments
- When you pay a monthly installment, mark it as **Paid**.
- WealthOS automatically splits the payment into:
  - **Principal Component:** Reduces your outstanding loan balance on the balance sheet.
  - **Interest Component:** Recognized as finance expense on the income statement.

### Prepayment & Debt Strategy Optimizer
- **Prepayment Calculator:** Simulate making an extra ₹5,000 monthly contribution or a one-time lump-sum payment. See immediately how many months earlier you will be debt-free and exactly how much interest you save.
- **Avalanche vs Snowball:**
  - **Avalanche (Highest APR First):** Directs surplus cash flow to the debt with the highest interest rate. Mathematically optimal to minimize total interest paid.
  - **Snowball (Lowest Balance First):** Directs surplus cash flow to the smallest debt balance first to deliver fast psychological wins.

---

## 3. Universal Financial Document Intelligence

### Uploading Financial Statements & Bills
1. Navigate to **Documents** in the sidebar.
2. Drag and drop your bank statement (PDF), credit card statement, brokerage CAS report, invoice, or payslip.
3. Files are encrypted and quarantined in MinIO storage with strict MIME type and magic-byte validation.

### Deterministic Arithmetic Verification
Before any data can be accepted into your records, WealthOS runs deterministic mathematical checks:
- **Bank Statements:** $\text{Opening Balance} + \sum \text{Credits} - \sum \text{Debits} == \text{Closing Balance}$
- **Invoices:** $\sum \text{Line Items} + \text{Taxes} - \text{Discounts} == \text{Total Amount}$
- **Payslips:** $\text{Gross Earnings} - \text{Deductions} == \text{Net Pay}$

### Human-in-the-Loop Review & Approval
- AI extractions **never post directly to your ledger**.
- Extracted records appear in `READY_FOR_APPROVAL` or `NEEDS_REVIEW` status.
- Inspect the figures, run the **Reconciliation Matcher** to link with existing bank transactions, and click **Approve & Post to GL** to create balanced double-entry vouchers with an immutable audit log.
