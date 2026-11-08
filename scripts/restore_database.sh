#!/usr/bin/env bash
# ==============================================================================
# WealthOS Enterprise Production Restore & Integrity Verification Script
# Decrypts AES-256-GCM Archive & Validates Ledger Invariants & Tenant Security
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

ENC_FILE="${1:-}"
TARGET_DB="${TARGET_DB:-${2:-}}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/wealthos_backups}"

# 1. Parameter & Confirmation Safety Guards
if [ -z "${ENC_FILE}" ]; then
  echo "[CRITICAL ALERT] No encrypted backup (.dump.enc) specified!" >&2
  echo "Usage: $0 /path/to/backup.dump.enc <target_database>" >&2
  exit 1
fi

if [ ! -f "${ENC_FILE}" ]; then
  echo "[CRITICAL ALERT] Backup file not found: ${ENC_FILE}" >&2
  exit 1
fi

MANIFEST_FILE="${ENC_FILE%.dump.enc}.json"
if [ ! -f "${MANIFEST_FILE}" ]; then
  MANIFEST_FILE="${ENC_FILE%.enc}.json"
fi
if [ ! -f "${MANIFEST_FILE}" ]; then
  echo "[CRITICAL ALERT] Missing manifest JSON for backup: ${MANIFEST_FILE}" >&2
  exit 1
fi

if [ -z "${TARGET_DB}" ]; then
  echo "[CRITICAL ALERT] Target database must be explicitly specified (TARGET_DB or arg 2)!" >&2
  exit 1
fi

# Reject production targets without explicit override
if [[ "${TARGET_DB}" =~ (prod|production|wealthos_prod) ]] && [ "${ALLOW_PRODUCTION_RESTORE:-false}" != "true" ]; then
  echo "[CRITICAL REJECTION] Restoration into production database '${TARGET_DB}' blocked!" >&2
  echo "[CRITICAL REJECTION] Set ALLOW_PRODUCTION_RESTORE=true with authorized ticket number to proceed." >&2
  exit 1
fi

# Require destructive action confirmation
if [ "${CONFIRM_RESTORE:-false}" != "true" ]; then
  echo "[CRITICAL REJECTION] Destructive restore confirmation not set!" >&2
  echo "[CRITICAL REJECTION] Set CONFIRM_RESTORE=true to acknowledge destructive schema overwrite on '${TARGET_DB}'." >&2
  exit 1
fi

# 2. Secret Management Gate: Fail Closed if Encryption Key is absent
if [ -z "${WEALTHOS_BACKUP_ENCRYPTION_KEY:-}" ] && [ -z "${WEALTHOS_BACKUP_KEY_FILE:-}" ]; then
  echo "[CRITICAL ALERT] Restore aborted: Missing required encryption key!" >&2
  echo "[CRITICAL ALERT] Provide WEALTHOS_BACKUP_ENCRYPTION_KEY or WEALTHOS_BACKUP_KEY_FILE." >&2
  exit 1
fi

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_ADMIN_USER:-wealthos_admin}"

if [ -z "${PGPASSWORD:-}" ] && [ -z "${POSTGRES_ADMIN_PASSWORD:-}" ]; then
  echo "[CRITICAL ALERT] Missing database password (PGPASSWORD / POSTGRES_ADMIN_PASSWORD)!" >&2
  exit 1
fi
export PGPASSWORD="${PGPASSWORD:-${POSTGRES_ADMIN_PASSWORD}}"

PYTHON_BIN="${REPO_ROOT}/backend/.venv/bin/python3"
if [ ! -f "${PYTHON_BIN}" ]; then
  PYTHON_BIN="python3"
fi

DECRYPTED_FILE="${ENC_FILE%.enc}.tmp_restore.dump"

echo "[INFO] Commencing authenticated decryption and restore verification for target '${TARGET_DB}'..."

# 3. Authenticated Decryption with GCM Tag & Checksum Verification
if ! "${PYTHON_BIN}" "${SCRIPT_DIR}/backup_crypto.py" decrypt \
  --input "${ENC_FILE}" \
  --output "${DECRYPTED_FILE}" \
  --manifest "${MANIFEST_FILE}"; then
  echo "[CRITICAL ALERT] Authenticated decryption failed! Aborting restore." >&2
  rm -f "${DECRYPTED_FILE}"
  exit 1
fi

# 4. Verify custom dump structure prior to database execution
if ! pg_restore --list "${DECRYPTED_FILE}" > /dev/null 2>&1; then
  echo "[CRITICAL ALERT] Decrypted archive corrupted or invalid PostgreSQL dump!" >&2
  rm -f "${DECRYPTED_FILE}"
  exit 1
fi
echo "[INFO] Decrypted archive verified clean via pg_restore --list."

# 5. Restore into controlled target database
echo "[INFO] Executing pg_restore into ${TARGET_DB} at ${POSTGRES_HOST}:${POSTGRES_PORT}..."
RESTORE_OUTPUT=$(pg_restore \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${TARGET_DB}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  "${DECRYPTED_FILE}" 2>&1 || true)

# Clean up decrypted file immediately
rm -f "${DECRYPTED_FILE}"

# Check for fatal errors in restore output
if echo "${RESTORE_OUTPUT}" | grep -Ei "FATAL:|could not connect|server closed the connection" >/dev/null; then
  echo "[CRITICAL ALERT] pg_restore encountered fatal error:" >&2
  echo "${RESTORE_OUTPUT}" >&2
  exit 1
fi

echo "[INFO] Archive contents loaded. Starting post-restore verification..."

# 6. Post-Restore Verification Gate 1: Schema Version Validation
ALEMBIC_VERSION=$(psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${TARGET_DB}" -t -A -c "SELECT version_num FROM alembic_version LIMIT 1;" 2>/dev/null || echo "MISSING")
if [ "${ALEMBIC_VERSION}" != "0005_financial_foundation" ]; then
  echo "[CRITICAL FAILURE] Schema version mismatch post-restore! Expected '0005_financial_foundation', got '${ALEMBIC_VERSION}'" >&2
  exit 2
fi
echo "[INFO] Post-restore Schema Version verified: ${ALEMBIC_VERSION}"

# 7. Post-Restore Verification Gate 2: General Ledger Balance Invariance
UNBALANCED_COUNT=$(psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${TARGET_DB}" -t -A -c "
  SELECT count(*) FROM (
    SELECT je.id
    FROM journal_entries je
    JOIN journal_lines jl ON je.id = jl.journal_entry_id
    WHERE je.status = 'POSTED'
    GROUP BY je.id
    HAVING SUM(jl.functional_debit_amount) <> SUM(jl.functional_credit_amount)
  ) unb;
")

if [ "${UNBALANCED_COUNT}" -ne 0 ]; then
  echo "[CRITICAL FAILURE] Database restored with ${UNBALANCED_COUNT} unbalanced journal entries!" >&2
  exit 2
fi
echo "[INFO] Post-restore General Ledger balance verified: 0 unbalanced entries."

# 8. Post-Restore Verification Gate 3: Row-Level Security Policy Enforcement
RLS_COUNT=$(psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${TARGET_DB}" -t -A -c "
  SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;
")
if [ "${RLS_COUNT}" -lt 40 ]; then
  echo "[CRITICAL FAILURE] Incomplete RLS policy restoration! Only ${RLS_COUNT} tables have RLS enabled (expected >= 40)." >&2
  exit 2
fi
echo "[INFO] Post-restore Row-Level Security verified: ${RLS_COUNT} tables active."

# 9. Post-Restore Verification Gate 4: Foreign-Key Referential Integrity
FK_VIOLATIONS=$(psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${TARGET_DB}" -t -A -c "
  SELECT count(*) FROM journal_lines jl
  LEFT JOIN journal_entries je ON jl.journal_entry_id = je.id
  WHERE je.id IS NULL;
")
if [ "${FK_VIOLATIONS}" -ne 0 ]; then
  echo "[CRITICAL FAILURE] Foreign key violation detected! ${FK_VIOLATIONS} orphaned journal lines found." >&2
  exit 2
fi
echo "[INFO] Post-restore Foreign Key integrity verified: 0 orphaned lines."

echo "[SUCCESS] WealthOS database restore and comprehensive integrity verification completed successfully on '${TARGET_DB}'!"
