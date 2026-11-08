# WealthOS Phase 19 — Statutory Data Retention Matrix

## Matrix of Retention Rules

| Entity / Table | Classification | Retention Period | Statutory Hold? | Legal Basis | Purge Allowed? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `journal_entries` | Statutory Accounting | 8 Years (2920 days) | **YES** | India IT Act Sec 149 / Companies Act Sec 128 | **NO** |
| `journal_lines` | Statutory Accounting | 8 Years (2920 days) | **YES** | Ledger Invariant Compliance | **NO** |
| `investment_holding_lots` | Statutory Accounting | 8 Years (2920 days) | **YES** | Capital Gains Tax Basis Verification | **NO** |
| `passive_income_records` | Statutory Accounting | 8 Years (2920 days) | **YES** | TDS / Tax Credit Audit | **NO** |
| `financial_documents` | Document Evidence | 3 Years (1095 days) | NO | User-managed document archive | YES |
| `copilot_messages` | AI Context | 1 Year (365 days) | NO | Conversational Assistant Context | YES |
| `api_idempotency_records`| Ephemeral Cache | 7 Days | NO | Network Deduplication | YES |
| `security_audit_logs` | Audit Trail | 5 Years (1825 days) | **YES** | SOC2 / ISO 27001 Access & Forensics | **NO** |

