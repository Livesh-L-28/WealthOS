#!/usr/bin/env bash
# ==============================================================================
# WealthOS Enterprise Production Backup Script
# PostgreSQL Custom-Format Archive (.dump) with AES-256-GCM Authenticated Encryption
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

BACKUP_DIR="${BACKUP_DIR:-/tmp/wealthos_backups}"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
BACKUP_FILE="${BACKUP_DIR}/wealthos_db_${TIMESTAMP}.dump"
ENC_FILE="${BACKUP_FILE}.enc"
META_FILE="${BACKUP_DIR}/wealthos_db_${TIMESTAMP}.json"

mkdir -p "${BACKUP_DIR}"

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_ADMIN_USER:-wealthos_admin}"
POSTGRES_DB="${POSTGRES_DB:-wealthos}"

# 1. Secret Management Gate: Fail Closed if Encryption Key is absent
if [ -z "${WEALTHOS_BACKUP_ENCRYPTION_KEY:-}" ] && [ -z "${WEALTHOS_BACKUP_KEY_FILE:-}" ]; then
  echo "[CRITICAL ALERT] Backup aborted: Missing required encryption key!" >&2
  echo "[CRITICAL ALERT] Provide WEALTHOS_BACKUP_ENCRYPTION_KEY or WEALTHOS_BACKUP_KEY_FILE." >&2
  exit 1
fi

if [ -z "${PGPASSWORD:-}" ] && [ -z "${POSTGRES_ADMIN_PASSWORD:-}" ]; then
  echo "[CRITICAL ALERT] Backup aborted: Missing database credentials (PGPASSWORD / POSTGRES_ADMIN_PASSWORD)!" >&2
  exit 1
fi
export PGPASSWORD="${PGPASSWORD:-${POSTGRES_ADMIN_PASSWORD}}"

echo "[INFO] Starting WealthOS database backup at ${TIMESTAMP} (Target DB: ${POSTGRES_DB})..."

# Detect PostgreSQL version
PG_VERSION=$(psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -t -A -c "SHOW server_version;" 2>/dev/null || echo "16.8")

# 2. Export custom-format PostgreSQL dump
if ! pg_dump \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --format=custom \
  --compress=9 \
  --file="${BACKUP_FILE}"; then
  echo "[CRITICAL ALERT] pg_dump failed for database ${POSTGRES_DB}!" >&2
  rm -f "${BACKUP_FILE}"
  exit 1
fi

echo "[INFO] Custom dump created: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"

# 3. Verify archive readability using pg_restore --list before encryption
if ! pg_restore --list "${BACKUP_FILE}" > /dev/null 2>&1; then
  echo "[CRITICAL ALERT] Backup integrity verification failed: corrupt custom dump archive!" >&2
  rm -f "${BACKUP_FILE}"
  exit 1
fi
echo "[INFO] Plaintext archive structure verified successfully via pg_restore --list."

# 4. Authenticated Encryption via AES-256-GCM
PYTHON_BIN="${REPO_ROOT}/backend/.venv/bin/python3"
if [ ! -f "${PYTHON_BIN}" ]; then
  PYTHON_BIN="python3"
fi

if ! "${PYTHON_BIN}" "${SCRIPT_DIR}/backup_crypto.py" encrypt \
  --input "${BACKUP_FILE}" \
  --output "${ENC_FILE}" \
  --manifest "${META_FILE}" \
  --db-name "${POSTGRES_DB}" \
  --pg-version "${PG_VERSION}"; then
  echo "[CRITICAL ALERT] AES-256-GCM encryption failed for backup archive!" >&2
  rm -f "${BACKUP_FILE}" "${ENC_FILE}" "${META_FILE}"
  exit 1
fi

# Clean up unencrypted dump immediately
rm -f "${BACKUP_FILE}"

# 5. Verify encrypted artifact and manifest integrity
if ! "${PYTHON_BIN}" "${SCRIPT_DIR}/backup_crypto.py" verify \
  --input "${ENC_FILE}" \
  --manifest "${META_FILE}"; then
  echo "[CRITICAL ALERT] Post-encryption verification failed: ciphertext or manifest corrupted!" >&2
  rm -f "${ENC_FILE}" "${META_FILE}"
  exit 1
fi

# 6. Configurable Retention Management
RETENTION_DAYS="${RETENTION_DAYS:-14}"
if [ "${RETENTION_DAYS}" -gt 0 ]; then
  find "${BACKUP_DIR}" -type f \( -name "*.dump.enc" -o -name "*.json" \) -mtime +"${RETENTION_DAYS}" -delete 2>/dev/null || true
fi

echo "[SUCCESS] WealthOS database backup completed and verified: ${ENC_FILE}"
echo "[INFO] Manifest written to ${META_FILE}"
