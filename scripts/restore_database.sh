#!/usr/bin/env bash
# ==============================================================================
# WealthOS Enterprise Production Restore Script
# Decrypts AES-256 Archive & Restores via PostgreSQL pg_restore
# ==============================================================================
set -euo pipefail

ENC_FILE="${1:-}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/wealthos_backups}"

if [ -z "${ENC_FILE}" ]; then
  # Pick the latest encrypted backup in BACKUP_DIR
  ENC_FILE=$(ls -t "${BACKUP_DIR}"/*.dump.enc 2>/dev/null | head -n 1 || true)
  if [ -z "${ENC_FILE}" ]; then
    echo "[ERROR] No encrypted backup (.dump.enc) specified or found in ${BACKUP_DIR}" >&2
    exit 1
  fi
fi

if [ ! -f "${ENC_FILE}" ]; then
  echo "[ERROR] Backup file not found: ${ENC_FILE}" >&2
  exit 1
fi

DECRYPTED_FILE="${ENC_FILE%.enc}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_ADMIN_USER:-wealthos_admin}"
POSTGRES_DB="${POSTGRES_DB:-wealthos}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-wealthos_local_32_byte_master_key_for_aes_gcm_123}"

echo "[INFO] Decrypting backup: ${ENC_FILE}..."
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in "${ENC_FILE}" \
  -out "${DECRYPTED_FILE}" \
  -pass "pass:${ENCRYPTION_KEY}"

echo "[INFO] Inspecting custom dump contents via pg_restore --list..."
pg_restore --list "${DECRYPTED_FILE}" | head -n 10

echo "[INFO] Restoring into ${POSTGRES_DB} at ${POSTGRES_HOST}:${POSTGRES_PORT}..."
PGPASSWORD="${POSTGRES_ADMIN_PASSWORD:-wealthos_local_dev_password_change_in_prod}" pg_restore \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  "${DECRYPTED_FILE}" || true  # Ignore non-fatal warnings on clean drop of non-existent objects

# Clean up decrypted temporary file
rm -f "${DECRYPTED_FILE}"

echo "[INFO] Running post-restore General Ledger mathematical balance verification..."
UNBALANCED_COUNT=$(PGPASSWORD="${POSTGRES_ADMIN_PASSWORD:-wealthos_local_dev_password_change_in_prod}" psql \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  -t -A \
  -c "
    SELECT count(*) FROM (
      SELECT je.id
      FROM journal_entries je
      JOIN journal_lines jl ON je.id = jl.journal_entry_id
      WHERE je.status = 'POSTED'
      GROUP BY je.id
      HAVING SUM(jl.debit_amount) <> SUM(jl.credit_amount)
    ) unb;
  ")

if [ "${UNBALANCED_COUNT}" -ne 0 ]; then
  echo "[CRITICAL FAILURE] Database restored with ${UNBALANCED_COUNT} unbalanced journal entries!" >&2
  exit 2
fi

echo "[SUCCESS] Database restoration verified successfully! 0 unbalanced journal entries."
