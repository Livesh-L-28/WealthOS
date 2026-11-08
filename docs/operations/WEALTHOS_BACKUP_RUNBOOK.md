# WealthOS Authenticated Database Backup Runbook

**Stage:** Release Gate Remediation & Hardened Production Operations  
**Architecture:** PostgreSQL 16+ Custom Archive with AES-256-GCM Authenticated Encryption  
**Primary Script:** [`scripts/backup_database.sh`](file:///Users/livesh/WEALTHOS/scripts/backup_database.sh)  
**Cryptographic Engine:** [`scripts/backup_crypto.py`](file:///Users/livesh/WEALTHOS/scripts/backup_crypto.py)  
**Date:** 2026-11-08  
**Author:** Staff SRE & Security Engineering Team  

---

## 1. Overview & Security Architecture

The WealthOS production backup system employs a two-tier authenticated backup pipeline:
1. **Archive Generation:** Generates a compressed, custom-format PostgreSQL archive (`pg_dump --format=custom --compress=9`).
2. **Pre-Encryption Validation:** Verifies table catalog and TOC readability with `pg_restore --list` before applying encryption.
3. **Authenticated AEAD Encryption:** Encrypts the archive using **AES-256-GCM** (Galois/Counter Mode) with unique 96-bit (12-byte) initialization vectors (IV/nonce) per backup, generating a 128-bit (16-byte) GCM authentication tag.
4. **Manifest Creation:** Generates a SHA-256 cryptographic manifest JSON recording archive format, compression, key identifier hash, plaintext SHA-256, and ciphertext SHA-256.
5. **Configurable Retention:** Automated pruning of archives older than `RETENTION_DAYS` (default 14 days).

---

## 2. Secrets Management & Fail-Closed Enforcement

> [!CAUTION]
> Hardcoded development keys or fallback passwords in production are strictly forbidden. The backup script fails closed immediately if required keys are missing.

### Environment Configuration
```bash
# Master Encryption Key (Retrieve from AWS KMS / HashiCorp Vault / Secret Manager)
export WEALTHOS_BACKUP_ENCRYPTION_KEY="<32-byte-or-greater-master-secret>"

# Database Administrator Credentials (Role with read access to all schemas)
export POSTGRES_HOST="localhost"
export POSTGRES_PORT="5432"
export POSTGRES_ADMIN_USER="wealthos_admin"
export POSTGRES_ADMIN_PASSWORD="<vault-injected-db-admin-password>"
export POSTGRES_DB="wealthos"

# Storage Destination & Retention Policy
export BACKUP_DIR="/var/backups/wealthos"
export RETENTION_DAYS="14"
```

---

## 3. Manual Backup Execution

To execute an immediate, verified, encrypted backup:

```bash
./scripts/backup_database.sh
```

### Execution Output & Verification
```
[INFO] Starting WealthOS database backup at 20261108_032130Z (Target DB: wealthos)...
[INFO] Custom dump created: /tmp/wealthos_backups/wealthos_db_20261108_032130Z.dump (104K)
[INFO] Plaintext archive structure verified successfully via pg_restore --list.
[SUCCESS] Encrypted archive created with AES-256-GCM: /tmp/wealthos_backups/wealthos_db_20261108_032130Z.dump.enc
[INFO] Manifest generated: /tmp/wealthos_backups/wealthos_db_20261108_032130Z.json (Plain SHA: 06920cc1daeb..., Enc SHA: 47115870e755...)
[SUCCESS] Backup ciphertext, manifest, and authentication tag are valid.
[SUCCESS] WealthOS database backup completed and verified: /tmp/wealthos_backups/wealthos_db_20261108_032130Z.dump.enc
[INFO] Manifest written to /tmp/wealthos_backups/wealthos_db_20261108_032130Z.json
```

---

## 4. Offsite Replication & Disaster Recovery

Synchronize the encrypted container (`.dump.enc`) and manifest (`.json`) to an immutable AWS S3 Glacier or Cloud Storage bucket:

```bash
aws s3 cp "${BACKUP_DIR}/" s3://wealthos-offsite-backups/database/ \
  --recursive \
  --exclude "*" \
  --include "*.dump.enc" \
  --include "*.json" \
  --sse aws:kms \
  --sse-kms-key-id "arn:aws:kms:us-east-1:123456789012:key/wealthos-backup-key"
```
