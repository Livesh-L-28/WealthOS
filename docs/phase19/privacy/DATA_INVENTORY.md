# WealthOS Phase 19 — Comprehensive Data Inventory & Classification

## 1. Data Classification Tiers

| Tier | Category | Storage Subsystem | Examples | Statutory Retention |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1** | Statutory Accounting | PostgreSQL | `journal_entries`, `journal_lines`, `accounts`, `holding_lots` | 8 Years (Mandatory) |
| **Tier 2** | Customer Identity / Auth | PostgreSQL | `users`, `credentials`, `webauthn_credentials`, `devices` | Account Lifetime + 30 Days |
| **Tier 3** | Source Evidence Documents | MinIO / S3 | Raw Bank Statement PDFs, Investment Demat Statements | 3 Years (User-Managed) |
| **Tier 4** | AI Conversations & Insights | PostgreSQL | `copilot_messages`, `copilot_conversations` | 1 Year (Opt-out Purgeable) |
| **Tier 5** | Ephemeral Cache & State | Redis | API Idempotency Locks, Rate Limit Buckets, User Sessions | 24 Hours – 7 Days TTL |
| **Tier 6** | Security & Forensics | PostgreSQL | `security_audit_logs`, `system_audit_logs` | 5 Years (Immutable) |

