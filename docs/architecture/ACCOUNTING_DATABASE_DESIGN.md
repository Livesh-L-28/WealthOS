# WealthOS — Accounting Database Design & Relational Invariants

## 1. Schema Tables

### `accounts`
Stores tenant-scoped chart of accounts.
- Columns: `id (UUID PK)`, `tenant_id (UUID FK)`, `account_code (VARCHAR 50)`, `account_name (VARCHAR 255)`, `description (TEXT)`, `account_type (VARCHAR 50)`, `normal_balance (VARCHAR 10)`, `parent_account_id (UUID FK)`, `currency_code (VARCHAR 3)`, `is_system_account (BOOL)`, `is_active (BOOL)`, `is_control_account (BOOL)`, `created_at (TIMESTAMPTZ)`, `updated_at (TIMESTAMPTZ)`.
- Constraints: `UNIQUE (tenant_id, account_code)`.

### `journal_entries`
Stores double-entry transaction headers.
- Columns: `id (UUID PK)`, `tenant_id (UUID FK)`, `entry_number (VARCHAR 50)`, `entry_date (DATE)`, `posting_date (TIMESTAMPTZ)`, `description (TEXT)`, `reference (VARCHAR 100)`, `source_type (VARCHAR 50)`, `source_id (VARCHAR 100)`, `status (VARCHAR 20)`, `functional_currency (VARCHAR 3)`, `total_debit (NUMERIC 18,4)`, `total_credit (NUMERIC 18,4)`, `idempotency_key (VARCHAR 100)`, `created_by (UUID FK)`, `posted_by (UUID FK)`, `posted_at (TIMESTAMPTZ)`, `reversal_of_entry_id (UUID FK)`, `reversed_by_entry_id (UUID FK)`, `created_at (TIMESTAMPTZ)`, `updated_at (TIMESTAMPTZ)`.
- Constraints: `UNIQUE (tenant_id, entry_number)`.

### `journal_lines`
Stores debit/credit postings.
- Columns: `id (UUID PK)`, `tenant_id (UUID FK)`, `journal_entry_id (UUID FK)`, `account_id (UUID FK)`, `description (TEXT)`, `line_number (INT)`, `debit_amount (NUMERIC 18,4)`, `credit_amount (NUMERIC 18,4)`, `transaction_currency (VARCHAR 3)`, `transaction_amount (NUMERIC 18,4)`, `exchange_rate (NUMERIC 18,8)`, `functional_debit_amount (NUMERIC 18,4)`, `functional_credit_amount (NUMERIC 18,4)`, `created_at (TIMESTAMPTZ)`.
- Constraints: `UNIQUE (journal_entry_id, line_number)`, check constraints ensuring non-negative amounts and positive values on exactly one side.

### `accounting_periods`
Stores fiscal periods for closing gates.
- Columns: `id (UUID PK)`, `tenant_id (UUID FK)`, `period_name (VARCHAR 100)`, `start_date (DATE)`, `end_date (DATE)`, `status (VARCHAR 20)`, `closed_at (TIMESTAMPTZ)`, `closed_by (UUID FK)`, `created_at (TIMESTAMPTZ)`.
- Constraints: `UNIQUE (tenant_id, period_name)`.

### `accounting_idempotency_records`
Stores deduplication records for posting requests.
- Columns: `id (UUID PK)`, `tenant_id (UUID FK)`, `idempotency_key (VARCHAR 100)`, `request_fingerprint (VARCHAR 64)`, `operation_type (VARCHAR 50)`, `status (VARCHAR 20)`, `journal_entry_id (UUID FK)`, `response_payload (JSONB)`, `created_at (TIMESTAMPTZ)`, `updated_at (TIMESTAMPTZ)`.
- Constraints: `UNIQUE (tenant_id, idempotency_key)`.

### `reconciliation_records`
Stores reconciliation matches against external sources.
- Columns: `id (UUID PK)`, `tenant_id (UUID FK)`, `source_reference (VARCHAR 100)`, `account_id (UUID FK)`, `journal_entry_id (UUID FK)`, `expected_amount (NUMERIC 18,4)`, `posted_amount (NUMERIC 18,4)`, `currency_code (VARCHAR 3)`, `status (VARCHAR 30)`, `matched_at (TIMESTAMPTZ)`, `matched_by (UUID FK)`, `discrepancy_reason (TEXT)`, `created_at (TIMESTAMPTZ)`, `updated_at (TIMESTAMPTZ)`.
