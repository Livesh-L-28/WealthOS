# WealthOS Database Restore & Integrity Verification Runbook

**Stage:** Release Gate Remediation & Hardened Production Operations  
**Architecture:** PostgreSQL 16+ pg_restore with AES-256-GCM Authenticated Decryption & Ledger Auditing  
**Primary Script:** [`scripts/restore_database.sh`](file:///Users/livesh/WEALTHOS/scripts/restore_database.sh)  
**Cryptographic Engine:** [`scripts/backup_crypto.py`](file:///Users/livesh/WEALTHOS/scripts/backup_crypto.py)  
**Date:** 2026-11-08  
**Author:** Staff SRE & Security Engineering Team  

---

## 1. Overview & Operational Safeguards

Restoration of financial databases requires strict controls to prevent accidental overwrites, data tampering, or restoring corrupt ledgers:

1. **Explicit Target Requirement:** Target database must be explicitly specified. Defaulting to production or implicit databases is rejected.
2. **Production Restoration Shield:** Restoration targeting `wealthos_prod` or databases containing `prod` is blocked unless `ALLOW_PRODUCTION_RESTORE=true` is set alongside authorized change control approvals.
3. **Explicit Confirmation Gate:** Restoration requires `CONFIRM_RESTORE=true` acknowledging destructive schema overwrite.
4. **Pre-Decryption Integrity Check:** The script validates the SHA-256 checksum of the ciphertext against the manifest before decryption is attempted.
5. **Authenticated GCM Decryption:** Verifies the 128-bit authentication tag. Any tampered byte or incorrect key causes decryption to fail closed immediately.
6. **Custom Archive Integrity Check:** Checks the unencrypted dump with `pg_restore --list` before loading into PostgreSQL.
7. **Four Automated Post-Restore Quality Gates:**
   - **Gate 1:** Schema Version check (`alembic_version == '0005_financial_foundation'`).
   - **Gate 2:** Double-entry ledger balance check ($\sum\text{Debits} - \sum\text{Credits} = 0.0000$).
   - **Gate 3:** Row-Level Security verification ($\ge 40$ tables forced RLS active).
   - **Gate 4:** Foreign-key referential integrity check (0 orphaned lines).

---

## 2. Standard Restoration Command

```bash
export WEALTHOS_BACKUP_ENCRYPTION_KEY="<master-backup-encryption-key>"
export POSTGRES_HOST="localhost"
export POSTGRES_PORT="5432"
export POSTGRES_ADMIN_USER="wealthos_admin"
export POSTGRES_ADMIN_PASSWORD="<vault-admin-password>"
export CONFIRM_RESTORE="true"

./scripts/restore_database.sh /path/to/wealthos_db_20261108_032130Z.dump.enc target_database_name
```

### Expected Output
```
[INFO] Commencing authenticated decryption and restore verification for target 'wealthos_dr_drill'...
[SUCCESS] Authenticated decryption complete. Verified plaintext SHA-256: 06920cc1daebbe6276504284dd36f62be53985d85f68812f6d00fbdf1fa0f9ba
[INFO] Decrypted archive verified clean via pg_restore --list.
[INFO] Executing pg_restore into wealthos_dr_drill at localhost:5432...
[INFO] Archive contents loaded. Starting post-restore verification...
[INFO] Post-restore Schema Version verified: 0005_financial_foundation
[INFO] Post-restore General Ledger balance verified: 0 unbalanced entries.
[INFO] Post-restore Row-Level Security verified: 43 tables active.
[INFO] Post-restore Foreign Key integrity verified: 0 orphaned lines.
[SUCCESS] WealthOS database restore and comprehensive integrity verification completed successfully on 'wealthos_dr_drill'!
```
