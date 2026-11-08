# WealthOS — Phase 6: Universal Financial Document Intelligence Architecture Specification

**Document Version:** 1.0.0  
**Phase:** Phase 6 — Wave 2 Master Implementation  
**Status:** IMPLEMENTED & VERIFIED  
**Module Path:** `backend/app/domains/documents/`

---

## 1. Executive Summary & Philosophy

Financial documents (bank statements, credit card bills, mutual fund/brokerage CAS reports, expense invoices, and salary payslips) represent primary financial evidence. Phase 6 delivers an enterprise-grade ingestion and extraction intelligence platform.

### Non-Negotiable Core Principles
1. **Quarantine First:** Untrusted uploaded files are stored in an isolated quarantine bucket; MIME types and magic byte headers are strictly verified prior to promotion to active storage.
2. **Deterministic Arithmetic Verification:** Extracted data is subjected to strict mathematical assertions:
   - Bank Statements: $\text{Opening Balance} + \sum \text{Credits} - \sum \text{Debits} = \text{Closing Balance}$
   - Invoices: $\sum \text{Line Items} + \text{Taxes} - \text{Discounts} = \text{Total Amount}$
   - Credit Cards: $\text{Previous Balance} + \text{Debits} - \text{Credits} + \text{Finance Charges} = \text{New Balance}$
3. **No Direct Ledger Posting Without Approval:** AI/OCR output can hallucinate or misread low-resolution scans. Extracted transactions **never directly post to the General Ledger**. They require deterministic validation, reconciliation matching, and explicit human approval.
4. **Comprehensive Provenance & Audit Trail:** Every extraction, validation check, user override, and approval action is permanently logged in `document_approval_events` with actor attribution.

---

## 2. Ingestion Pipeline & Quarantine Architecture

```
[User Upload]
      |
      v
[Magic Byte & MIME Validation] ---> [Invalid / Spoofed] ---> REJECT (HTTP 400)
      |
      v
[Quarantine Storage (MinIO/S3)]
      |
      v
[SHA-256 Deduplication Check] ---> [Duplicate Hash in Tenant] ---> REJECT / LINK
      |
      v
[Promotion to Verified Bucket]
      |
      v
[FinancialDocument Created (processing_status: 'PENDING')]
      |
      v
[OCR & Extraction Engine (Parser/AI)]
      |
      v
[DocumentExtraction Created (validation_status: 'PENDING')]
      |
      v
[Deterministic Arithmetic Validator]
      |
      +---> [Passed] ---> validation_status: 'VALIDATED', processing_status: 'READY_FOR_APPROVAL'
      +---> [Failed] ---> validation_status: 'FAILED', processing_status: 'NEEDS_REVIEW'
```

---

## 3. Canonical Document Schemas

The system supports 5 canonical financial schemas (`schema_version: 'v1'`):

1. **`BANK_STATEMENT`:**
   - Account number, financial institution, reporting period (start/end).
   - Opening balance, closing balance, total deposits (credits), total withdrawals (debits).
   - Array of transactions: `date`, `description`, `reference_number`, `type` (`DEBIT`/`CREDIT`), `amount`, `running_balance`.
2. **`CREDIT_CARD_STATEMENT`:**
   - Card identifier (last 4), bank, statement date, payment due date.
   - Previous balance, new balance, minimum due, credit limit, available credit, finance charges.
   - Array of itemized purchases and payments.
3. **`BROKERAGE_CAS` (Consolidated Account Statement):**
   - Demat / folio identifier, statement date, depository (NSDL/CDSL/CAMS/KFin).
   - Array of asset holdings: `symbol`, `isin`, `asset_type` (`EQUITY`, `MUTUAL_FUND`), `quantity`, `nav_or_price`, `current_value`.
4. **`INVOICE_RECEIPT`:**
   - Vendor name, tax ID (GSTIN/VAT), invoice number, invoice date.
   - Subtotal, taxes, discounts, net total.
   - Array of line items: `description`, `quantity`, `unit_price`, `total_price`.
5. **`PAYSLIP`:**
   - Employer, employee name, pay period, currency.
   - Gross earnings, itemized deductions (tax, provident fund, insurance), net pay.

---

## 4. Deterministic Arithmetic Verification

The validation engine executes strict mathematical checks using Python `Decimal`:
- Tolerance Invariant: Discrepancy $\le 0.0001$ considered zero.
- If $\left| \text{Calculated} - \text{Reported} \right| > 0.0001$:
  - `validation_status` set to `FAILED`.
  - Detailed errors appended to `validation_errors` JSONB array (e.g., `{"field": "closing_balance", "expected": 15000.00, "actual": 14950.00, "difference": -50.00}`).
  - Document flagged as `NEEDS_REVIEW`.

---

## 5. Reconciliation Matching Engine

Before human approval, the system matches extracted transactions against existing transactions in WealthOS:
- **`EXACT_MATCH`:** Extracted record matches an existing transaction by identical date, amount, and reference number.
- **`PROBABLE_MATCH`:** Matches within $\pm 3$ days and exact amount.
- **`NEW_TRANSACTION`:** No existing record matches; candidate for posting upon approval.

---

## 6. Approval & Controlled Ledger Posting

When a user approves an extraction via `POST /api/v1/documents/{document_id}/extractions/{extraction_id}/approve`:
1. `document_approval_events` logs the approval with `actor_id` and optional notes.
2. If `post_transactions=True`:
   - Extracted transactions categorized as `NEW_TRANSACTION` generate balanced double-entry journal entries via `AccountingPostingService`.
   - Debit: Expense / Asset Account.
   - Credit: Bank Settlement Account.
   - Invariant: $\sum\text{Dr} - \sum\text{Cr} = 0.0000$.
3. Document status transitions to `APPROVED` and subsequently `POSTED`.

