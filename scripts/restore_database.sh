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

# Reject system catalog databases
if [[ "${TARGET_DB}" =~ ^(postgres|template[01]|rdsadmin|azure_sys)$ ]]; then
  echo "[CRITICAL REJECTION] Target database '${TARGET_DB}' is a system catalog and cannot be overwritten!" >&2
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

# Verify target database existence and reachability before any operation
if ! psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${TARGET_DB}" -c "SELECT 1;" >/dev/null 2>&1; then
  echo "[CRITICAL REJECTION] Target database '${TARGET_DB}' does not exist or is not reachable at ${POSTGRES_HOST}:${POSTGRES_PORT}!" >&2
  exit 1
fi

PYTHON_BIN="${REPO_ROOT}/backend/.venv/bin/python3"
if [ ! -f "${PYTHON_BIN}" ]; then
  PYTHON_BIN="python3"
fi

DECRYPTED_FILE="${ENC_FILE%.enc}.tmp_restore.dump"
RESTORE_LOG=""

cleanup() {
  if [ -n "${DECRYPTED_FILE:-}" ] && [ -f "${DECRYPTED_FILE}" ]; then
    rm -f "${DECRYPTED_FILE}"
  fi
  if [ -n "${RESTORE_LOG:-}" ] && [ -f "${RESTORE_LOG}" ]; then
    rm -f "${RESTORE_LOG}"
  fi
}
trap cleanup EXIT INT TERM

echo "[INFO] Commencing authenticated decryption and restore verification for target '${TARGET_DB}'..."

# 3. Authenticated Decryption with GCM Tag & Checksum Verification
if ! "${PYTHON_BIN}" "${SCRIPT_DIR}/backup_crypto.py" decrypt \
  --input "${ENC_FILE}" \
  --output "${DECRYPTED_FILE}" \
  --manifest "${MANIFEST_FILE}"; then
  echo "[CRITICAL ALERT] Authenticated decryption failed! Aborting restore." >&2
  exit 1
fi

# 4. Verify custom dump structure prior to database execution
if ! pg_restore --list "${DECRYPTED_FILE}" > /dev/null 2>&1; then
  echo "[CRITICAL ALERT] Decrypted archive corrupted or invalid PostgreSQL dump!" >&2
  exit 1
fi
echo "[INFO] Decrypted archive verified clean via pg_restore --list."

# 5. Restore into controlled target database with strict exit-code verification
echo "[INFO] Executing pg_restore into ${TARGET_DB} at ${POSTGRES_HOST}:${POSTGRES_PORT}..."
RESTORE_LOG=$(mktemp "/tmp/wealthos_restore_${TARGET_DB}_XXXXXX.log")

set +e
pg_restore \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${TARGET_DB}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  "${DECRYPTED_FILE}" > "${RESTORE_LOG}" 2>&1
RESTORE_EXIT_CODE=$?
set -e

# Decrypted archive removed immediately
rm -f "${DECRYPTED_FILE}"

if [ "${RESTORE_EXIT_CODE}" -ne 0 ]; then
  # Tolerate harmless client version configuration parameter differences (e.g. transaction_timeout introduced in pg17)
  CLIENT_DIFF_COUNT=$(grep 'unrecognized configuration parameter "transaction_timeout"' "${RESTORE_LOG}" | wc -l | tr -d ' ')
  TOTAL_ERROR_COUNT=$(grep 'ERROR:' "${RESTORE_LOG}" | wc -l | tr -d ' ')
  if [ "${CLIENT_DIFF_COUNT}" -ge 1 ] && [ "${TOTAL_ERROR_COUNT}" -eq 1 ]; then
    echo "[INFO] Ignored harmless client version difference: unrecognized parameter 'transaction_timeout'."
  else
    echo "[CRITICAL ALERT] pg_restore failed with non-zero exit code: ${RESTORE_EXIT_CODE}" >&2
    echo "[DIAGNOSTICS] pg_restore execution log:" >&2
    cat "${RESTORE_LOG}" >&2
    exit "${RESTORE_EXIT_CODE}"
  fi
fi

# Verify no fatal errors hidden in output log
if grep -Ei "FATAL:|could not connect|server closed the connection" "${RESTORE_LOG}" >/dev/null 2>&1; then
  echo "[CRITICAL ALERT] pg_restore encountered fatal connection error in output log:" >&2
  cat "${RESTORE_LOG}" >&2
  exit 1
fi

echo "[INFO] Archive contents loaded successfully. Starting post-restore verification..."

# 6. Post-Restore Verification Gate 1: Schema Version Validation
set +e
ALEMBIC_VERSION=$(psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${TARGET_DB}" -t -A -c "SELECT version_num FROM alembic_version LIMIT 1;" 2>&1)
ALEMBIC_STATUS=$?
set -e
if [ "${ALEMBIC_STATUS}" -ne 0 ] || [ -z "${ALEMBIC_VERSION}" ]; then
  echo "[CRITICAL FAILURE] Failed to query alembic_version post-restore: ${ALEMBIC_VERSION}" >&2
  exit 2
fi
EXPECTED_ALEMBIC_VERSION="${EXPECTED_ALEMBIC_VERSION:-0007_investment_accounting}"
if [ "${ALEMBIC_VERSION}" != "${EXPECTED_ALEMBIC_VERSION}" ] && [ "${ALEMBIC_VERSION}" != "0005_financial_foundation" ]; then
  echo "[CRITICAL FAILURE] Schema version mismatch post-restore! Expected '${EXPECTED_ALEMBIC_VERSION}', got '${ALEMBIC_VERSION}'" >&2
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

# 8. Post-Restore Verification Gate 3: Application Role Attributes & Row-Level Security
# 8a. Verify Application Role Attributes (must be non-superuser, no bypassrls, can login)
APP_ROLE_PROPS=$(psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${TARGET_DB}" -t -A -F '|' -c "
  SELECT rolsuper, rolbypassrls, rolcanlogin FROM pg_roles WHERE rolname = 'wealthos_app';
")
if [ -z "${APP_ROLE_PROPS}" ]; then
  echo "[CRITICAL FAILURE] Required application role 'wealthos_app' does not exist in database!" >&2
  exit 2
fi
APP_ROLSUPER=$(echo "${APP_ROLE_PROPS}" | cut -d'|' -f1)
APP_ROLBYPASSRLS=$(echo "${APP_ROLE_PROPS}" | cut -d'|' -f2)
APP_ROLCANLOGIN=$(echo "${APP_ROLE_PROPS}" | cut -d'|' -f3)

if [ "${APP_ROLSUPER}" != "f" ] || [ "${APP_ROLBYPASSRLS}" != "f" ] || [ "${APP_ROLCANLOGIN}" != "t" ]; then
  echo "[CRITICAL FAILURE] Role 'wealthos_app' has unsafe attributes: rolsuper=${APP_ROLSUPER}, rolbypassrls=${APP_ROLBYPASSRLS}, rolcanlogin=${APP_ROLCANLOGIN} (expected f|f|t)!" >&2
  exit 2
fi
echo "[INFO] Application role 'wealthos_app' verified: rolsuper=false, rolbypassrls=false, rolcanlogin=true."

# 8b. Ensure standard application privileges are established post-restore (fail closed)
if ! psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${TARGET_DB}" -v ON_ERROR_STOP=1 -c "
  GRANT USAGE ON SCHEMA public TO wealthos_app;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO wealthos_app;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO wealthos_app;
" > /dev/null 2>&1; then
  echo "[CRITICAL FAILURE] Failed to grant application privileges to role 'wealthos_app'!" >&2
  exit 2
fi
echo "[INFO] Application privileges successfully granted to 'wealthos_app'."

# 8c. Explicit inventory of all 43 tenant tables: relrowsecurity=true and relforcerowsecurity=true
DEFECTIVE_RLS_TABLES=$(psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${TARGET_DB}" -t -A -F '|' -c "
WITH required_tables AS (
  SELECT unnest(ARRAY[
    'account_transfers',
    'accounting_idempotency_records',
    'accounting_periods',
    'accounts',
    'analytics_snapshots',
    'assets',
    'budget_allocations',
    'budgets',
    'copilot_conversations',
    'copilot_messages',
    'financial_accounts',
    'financial_documents',
    'financial_goals',
    'financial_scenarios',
    'financial_transactions',
    'forecast_runs',
    'goal_contributions',
    'investment_holding_lots',
    'journal_entries',
    'journal_lines',
    'liabilities',
    'membership_roles',
    'notification_events',
    'notification_preferences',
    'notifications',
    'passive_income_records',
    'provider_connections',
    'provider_consents',
    'provider_credentials',
    'provider_sync_cursors',
    'reconciliation_records',
    'reconciliation_sessions',
    'recurring_transaction_rules',
    'report_jobs',
    'report_schedules',
    'roles',
    'security_audit_logs',
    'system_audit_logs',
    'tenant_invitations',
    'tenant_memberships',
    'tenants',
    'transaction_categories',
    'transaction_merchants'
  ]) AS relname
)
SELECT 
  r.relname,
  COALESCE(c.relrowsecurity, false) AS relrowsecurity,
  COALESCE(c.relforcerowsecurity, false) AS relforcerowsecurity,
  CASE 
    WHEN c.relname IS NULL THEN 'MISSING_TABLE'
    WHEN c.relrowsecurity = false THEN 'RLS_DISABLED'
    WHEN c.relforcerowsecurity = false THEN 'RLS_NOT_FORCED'
    ELSE 'OK'
  END AS status
FROM required_tables r
LEFT JOIN pg_class c ON c.relname = r.relname AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
WHERE c.relname IS NULL OR c.relrowsecurity = false OR c.relforcerowsecurity = false;
")

if [ -n "${DEFECTIVE_RLS_TABLES}" ]; then
  echo "[CRITICAL FAILURE] Table RLS audit failed! Missing or unforced RLS on tables:" >&2
  echo "${DEFECTIVE_RLS_TABLES}" >&2
  exit 2
fi
echo "[INFO] Explicit verification of all 43 tenant tables passed: all have relrowsecurity=true and relforcerowsecurity=true."

# 8d. Explicit policy presence verification across all 43 tenant tables
MISSING_POLICIES=$(psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${TARGET_DB}" -t -A -c "
WITH required_tables AS (
  SELECT unnest(ARRAY[
    'account_transfers',
    'accounting_idempotency_records',
    'accounting_periods',
    'accounts',
    'analytics_snapshots',
    'assets',
    'budget_allocations',
    'budgets',
    'copilot_conversations',
    'copilot_messages',
    'financial_accounts',
    'financial_documents',
    'financial_goals',
    'financial_scenarios',
    'financial_transactions',
    'forecast_runs',
    'goal_contributions',
    'investment_holding_lots',
    'journal_entries',
    'journal_lines',
    'liabilities',
    'membership_roles',
    'notification_events',
    'notification_preferences',
    'notifications',
    'passive_income_records',
    'provider_connections',
    'provider_consents',
    'provider_credentials',
    'provider_sync_cursors',
    'reconciliation_records',
    'reconciliation_sessions',
    'recurring_transaction_rules',
    'report_jobs',
    'report_schedules',
    'roles',
    'security_audit_logs',
    'system_audit_logs',
    'tenant_invitations',
    'tenant_memberships',
    'tenants',
    'transaction_categories',
    'transaction_merchants'
  ]) AS relname
)
SELECT r.relname
FROM required_tables r
LEFT JOIN (SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public') p ON r.relname = p.tablename
WHERE p.tablename IS NULL;
")

if [ -n "${MISSING_POLICIES}" ]; then
  echo "[CRITICAL FAILURE] Tenant tables missing RLS policies in pg_policies:" >&2
  echo "${MISSING_POLICIES}" >&2
  exit 2
fi
echo "[INFO] Explicit policy presence verified on all 43 tenant tables in pg_policies."

# 8e. Behavioral Cross-Tenant and Context Reset Verification under role 'wealthos_app'
psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${TARGET_DB}" -v ON_ERROR_STOP=1 -c "
DO \$\$
DECLARE
  v_rec_count integer;
  v_first_tenant_id uuid;
  v_other_tenant_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  -- 1. Without tenant context: must return 0
  SET ROLE wealthos_app;
  SELECT count(*) INTO v_rec_count FROM accounts;
  IF v_rec_count <> 0 THEN
    RAISE EXCEPTION 'RLS Leak: wealthos_app saw % rows without tenant context', v_rec_count;
  END IF;

  -- 2. Check if any tenant exists in database
  RESET ROLE;
  SELECT id INTO v_first_tenant_id FROM tenants LIMIT 1;

  IF v_first_tenant_id IS NOT NULL THEN
    SET ROLE wealthos_app;
    -- Set Tenant A context
    PERFORM set_config('app.current_tenant_id', v_first_tenant_id::text, false);
    SELECT count(*) INTO v_rec_count FROM accounts WHERE tenant_id <> v_first_tenant_id;
    IF v_rec_count <> 0 THEN
      RAISE EXCEPTION 'Cross-tenant leak: wealthos_app saw % rows belonging to other tenants', v_rec_count;
    END IF;

    -- Set Tenant B context (disjoint dummy tenant)
    PERFORM set_config('app.current_tenant_id', v_other_tenant_id::text, false);
    SELECT count(*) INTO v_rec_count FROM accounts WHERE tenant_id = v_first_tenant_id;
    IF v_rec_count <> 0 THEN
      RAISE EXCEPTION 'Cross-tenant leak: Tenant B context saw % rows belonging to Tenant A', v_rec_count;
    END IF;

    -- Reset context: must return 0
    PERFORM set_config('app.current_tenant_id', '', false);
    SELECT count(*) INTO v_rec_count FROM accounts;
    IF v_rec_count <> 0 THEN
      RAISE EXCEPTION 'RLS Leak after reset: wealthos_app saw % rows with empty tenant context', v_rec_count;
    END IF;
  END IF;

  RESET ROLE;
END \$\$;
"
echo "[INFO] Behavioral RLS isolation verified: zero cross-tenant records exposed to 'wealthos_app' across context switches and resets."

# 8f. Verification that application role cannot disable RLS or bypass policies
set +e
CAN_DISABLE_RLS=$(psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${TARGET_DB}" -v ON_ERROR_STOP=1 -c "
  SET ROLE wealthos_app;
  ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
" 2>&1)
CAN_DISABLE_EXIT=$?
set -e

if [ "${CAN_DISABLE_EXIT}" -eq 0 ]; then
  echo "[CRITICAL FAILURE] Application role 'wealthos_app' was able to alter RLS!" >&2
  exit 2
fi

if ! echo "${CAN_DISABLE_RLS}" | grep -qEi "must be owner|permission denied|denied"; then
  echo "[CRITICAL FAILURE] Expected permission denied when 'wealthos_app' attempts to alter RLS, got: ${CAN_DISABLE_RLS}" >&2
  exit 2
fi
echo "[INFO] Defense-in-depth verified: role 'wealthos_app' cannot disable RLS (exit ${CAN_DISABLE_EXIT})."

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
