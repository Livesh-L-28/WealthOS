#!/usr/bin/env bash
# ==============================================================================
# WealthOS Enterprise Production Backup Script
# PostgreSQL Custom-Format Archive (.dump) with AES-256-CBC Encryption
# ==============================================================================
set -euo pipefail

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
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-wealthos_local_32_byte_master_key_for_aes_gcm_123}"

echo "[INFO] Starting WealthOS database backup at ${TIMESTAMP}..."

# 1. Export custom-format PostgreSQL dump
PGPASSWORD="${POSTGRES_ADMIN_PASSWORD:-wealthos_local_dev_password_change_in_prod}" pg_dump \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --format=custom \
  --compress=9 \
  --file="${BACKUP_FILE}"

echo "[INFO] Custom dump created: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"

# 2. Verify archive readability using pg_restore --list
if ! pg_restore --list "${BACKUP_FILE}" > /dev/null 2>&1; then
  echo "[ERROR] Backup integrity verification failed: corrupt custom dump archive!" >&2
  rm -f "${BACKUP_FILE}"
  exit 1
fi
echo "[INFO] Archive structure verified successfully via pg_restore --list."

# 3. Encrypt archive using OpenSSL AES-256-CBC with PBKDF2
openssl enc -aes-256-cbc -salt -pbkdf2 \
  -in "${BACKUP_FILE}" \
  -out "${ENC_FILE}" \
  -pass "pass:${ENCRYPTION_KEY}"

# 4. Generate SHA256 checksum and metadata manifest
RAW_SHA=$(shasum -a 256 "${BACKUP_FILE}" | cut -d ' ' -f 1)
ENC_SHA=$(shasum -a 256 "${ENC_FILE}" | cut -d ' ' -f 1)
FILE_SIZE=$(wc -c < "${ENC_FILE}" | tr -d ' ')

cat <<EOF > "${META_FILE}"
{
  "backup_id": "wealthos_db_${TIMESTAMP}",
  "timestamp": "${TIMESTAMP}",
  "database": "${POSTGRES_DB}",
  "format": "custom",
  "compression": "zlib-9",
  "encryption": "aes-256-cbc-pbkdf2",
  "raw_file_sha256": "${RAW_SHA}",
  "encrypted_file": "${ENC_FILE}",
  "encrypted_file_sha256": "${ENC_SHA}",
  "file_size_bytes": ${FILE_SIZE},
  "status": "VERIFIED_VALID"
}
EOF

# Clean up unencrypted dump
rm -f "${BACKUP_FILE}"

echo "[SUCCESS] WealthOS backup completed and encrypted: ${ENC_FILE}"
echo "[INFO] Manifest written to ${META_FILE}"
