# WEALTHOS — USABILITY TEST PLAN & HEURISTIC EVALUATION

**Document Reference:** WOS-UX-TST-001  
**Target SUS Score:** $\ge 85 / 100$ (Grade A / Excellent)  
**Version:** 1.0.0-RELEASE-CANDIDATE  
**Status:** APPROVED / FROZEN BASELINE  
**Classification:** Quality & UX Evaluation Plan  

---

## 1. OBJECTIVES & EVALUATION METHODOLOGY

The purpose of the WealthOS Usability Test Plan is to validate that the human-designed fintech user experience enables investors, salaried professionals, and family wealth managers to accomplish complex financial operations with zero ambiguity, zero balance confusion, and high velocity.

### 1.1 Core Usability Metrics
1. **Task Completion Rate (TCR):** Target $\ge 95\%$ on unassisted core workflows.
2. **Time on Task (ToT):** Benchmarked against existing market alternatives (Zerodha, Tiller, INDmoney).
3. **Error Frequency:** Number of validation errors, incorrect category tags, or misread ledger entries per session.
4. **System Usability Scale (SUS):** Standard 10-item post-test survey targeting a minimum composite score of **85**.

---

## 2. THE 10 USABILITY TEST SCENARIOS

| # | Task Name | Persona | Scenario & Goal | Success Criteria | Max Target Time |
|---|---|---|---|---|---|
| **T-01** | First Account Setup & Security | Aditya (Salaried) | Register account, select INR base currency, configure TOTP MFA with Google Authenticator, download backup codes. | Account active, MFA verified, backup codes saved, on dashboard. | $90 \text{ seconds}$ |
| **T-02** | Bank Statement Upload & Ingestion | Aditya (Salaried) | Upload a 3-page HDFC Bank PDF statement into the Document Vault and enter PDF password. | File uploaded, SHA-256 hash verified, background worker enqueued. | $45 \text{ seconds}$ |
| **T-03** | Statement Review & Ledger Post | Aditya (Salaried) | Inspect extracted rows side-by-side with PDF, verify arithmetic integrity, edit 1 category, confirm & post to ledger. | 42 journal entries posted, bank balance reconciled to ₹2.90L. | $120 \text{ seconds}$ |
| **T-04** | Record Salary with Deductions | Kabir (Freelancer) | Record gross salary credit of ₹3.50L with TDS, PF, and Professional Tax deduction lines. | $\sum \text{Debit} \equiv \sum \text{Credit}$, net bank credit matches formula. | $60 \text{ seconds}$ |
| **T-05** | Split Supermarket Transaction | Kabir (Freelancer) | Take a ₹12,800 credit card transaction and split it across Household Groceries (₹8.6K) and Business Supplies (₹4.2K). | Split amounts sum exactly to ₹12.8K; parent journal entry split into 2 debits. | $45 \text{ seconds}$ |
| **T-06** | Record Equity Sell & Inspect FIFO | Meera (HNI Investor)| Record sale of 100 shares of Infosys @ ₹1,850 and review FIFO tax lot consumption. | Oldest purchase lots depleted first; LTCG vs STCG accurately separated. | $75 \text{ seconds}$ |
| **T-07** | Dividend & TDS Reconciliation | Meera (HNI Investor)| Match received bank credit of ₹7,560 with Infosys gross dividend of ₹8,400 and capture 10% TDS withholding. | TDS receivable ledger entry created; dividend status changed to Reconciled. | $60 \text{ seconds}$ |
| **T-08** | Interrogate Copilot for Analytics | Aditya (Salaried) | Ask Copilot: *"What was my average monthly discretionary expense over the last 6 months?"* | Grounded response returned within 3s with explicit record citations. | $30 \text{ seconds}$ |
| **T-09** | Household Workspace Conversion | Ramesh (Retiree) | Convert personal workspace to "Verma Family Wealth" and invite spouse as Admin. | New household tenant active; invitation link generated. | $60 \text{ seconds}$ |
| **T-10** | Emergency Account Deletion Flow | Kabir (Freelancer) | Navigate to Privacy settings, initiate account deletion, type confirmation word `DELETE`. | Destructive modal prevents accidental deletion; audit log committed. | $45 \text{ seconds}$ |

---

## 3. HEURISTIC EVALUATION CHECKLIST (NIELSEN'S 10 HEURISTICS FOR FINTECH)

| Heuristic | Architectural Enforcement in WealthOS |
|---|---|
| **1. Visibility of System Status** | Live market status pill (`● Live` / `○ Closed`); Real-time document parsing progress bar; Arithmetic balance check indicator. |
| **2. Match Between System & Real World** | Indian financial vernacular (Lakhs, Crores, TDS, Section 80C/80D, Demat, Folio numbers); Intuitive debit/credit directionality. |
| **3. User Control & Freedom** | Every posted transaction can be reversed via an immutable reversing entry; In-progress statement review can be discarded or saved as draft. |
| **4. Consistency & Standards** | Monospaced tabular alignment for all numbers; Uniform `#10B981` for gains/inflows and `#F43F5E` for expenses/losses; Consistent 4px grid. |
| **5. Error Prevention** | Compulsory arithmetic verification before document posting; Destructive actions require typing explicit keyword; Non-negative balance rules. |
| **6. Recognition Rather than Recall** | `Cmd+K` global command search with auto-complete; Autocomplete merchant names; Split builder displays remaining balance dynamically. |
| **7. Flexibility & Efficiency of Use** | Keyboard navigation throughout data tables; Fast action shortcuts; Configurable dashboard widgets. |
| **8. Aesthetic & Minimalist Design** | Deep navy foundation; Zero decorative cards or excessive glassmorphism; Strict high information-to-ink ratio. |
| **9. Help Users Recognize & Recover from Errors**| Plain-English error messages with diagnostic error codes; Inline field indicators; Actionable retry buttons. |
| **10. Help & Documentation** | Contextual helper tooltips on financial metrics (e.g., explaining XIRR vs CAGR); Built-in grounded AI Copilot for financial inquiry. |
