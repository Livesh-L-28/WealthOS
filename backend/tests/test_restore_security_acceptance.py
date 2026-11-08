"""WealthOS Gate 2 Restore Security & Fail-Closed Integrity Acceptance Tests.

Verifies:
1. Valid encrypted backup restoration and post-restore integrity checks.
2. Fail-closed rejection when encryption key is incorrect.
3. Fail-closed rejection when ciphertext is modified / corrupted.
4. Fail-closed rejection when manifest checksum is altered.
5. Verification of runtime role 'wealthos_app' attributes (rolsuper=false, rolbypassrls=false, rolcanlogin=true).
6. Complete inventory verification of all 43 tenant tables enforcing RLS (relrowsecurity=true and relforcerowsecurity=true).
7. Cross-tenant read denial and context reset behavior under role 'wealthos_app'.
8. Defense-in-depth prevention: 'wealthos_app' cannot disable RLS.
"""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import psycopg
import pytest
from psycopg import errors

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SCRIPTS_DIR = REPO_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))


ALL_43_TENANT_TABLES = [
    "account_transfers",
    "accounting_idempotency_records",
    "accounting_periods",
    "accounts",
    "analytics_snapshots",
    "assets",
    "budget_allocations",
    "budgets",
    "copilot_conversations",
    "copilot_messages",
    "financial_accounts",
    "financial_documents",
    "financial_goals",
    "financial_scenarios",
    "financial_transactions",
    "forecast_runs",
    "goal_contributions",
    "investment_holding_lots",
    "journal_entries",
    "journal_lines",
    "liabilities",
    "membership_roles",
    "notification_events",
    "notification_preferences",
    "notifications",
    "passive_income_records",
    "provider_connections",
    "provider_consents",
    "provider_credentials",
    "provider_sync_cursors",
    "reconciliation_records",
    "reconciliation_sessions",
    "recurring_transaction_rules",
    "report_jobs",
    "report_schedules",
    "roles",
    "security_audit_logs",
    "system_audit_logs",
    "tenant_invitations",
    "tenant_memberships",
    "tenants",
    "transaction_categories",
    "transaction_merchants",
]


@pytest.fixture(scope="module")
def pg_env():
    """Environment variables for PostgreSQL and backup restore scripts."""
    env = os.environ.copy()
    env["POSTGRES_HOST"] = os.getenv("POSTGRES_HOST", "localhost")
    env["POSTGRES_PORT"] = os.getenv("POSTGRES_PORT", "5432")
    env["POSTGRES_ADMIN_USER"] = os.getenv("POSTGRES_ADMIN_USER", "wealthos_admin")
    env["POSTGRES_ADMIN_PASSWORD"] = os.getenv(
        "POSTGRES_ADMIN_PASSWORD", "wealthos_local_dev_password_change_in_prod"
    )
    env["PGPASSWORD"] = env["POSTGRES_ADMIN_PASSWORD"]
    env["WEALTHOS_BACKUP_ENCRYPTION_KEY"] = "acceptance_test_key_round3_2026_super_secure"
    env["CONFIRM_RESTORE"] = "true"
    return env


@pytest.fixture(scope="module", autouse=True)
def ensure_restore_test_db(pg_env):
    """Ensure disposable test database exists for restore testing."""
    conn = psycopg.connect(
        host=pg_env["POSTGRES_HOST"],
        port=pg_env["POSTGRES_PORT"],
        user=pg_env["POSTGRES_ADMIN_USER"],
        password=pg_env["POSTGRES_ADMIN_PASSWORD"],
        dbname="postgres",
        autocommit=True,
    )
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_database WHERE datname = 'wealthos_restore_test';")
            if not cur.fetchone():
                cur.execute("CREATE DATABASE wealthos_restore_test OWNER wealthos_admin;")
                cur.execute("GRANT CONNECT ON DATABASE wealthos_restore_test TO wealthos_app;")
    finally:
        conn.close()


@pytest.fixture(scope="module")
def test_encrypted_backup(tmp_path_factory, pg_env):
    """Generate an authentic encrypted backup from wealthos_test database."""
    backup_dir = tmp_path_factory.mktemp("restore_acceptance")
    backup_script = SCRIPTS_DIR / "backup_database.sh"

    env = pg_env.copy()
    env["BACKUP_DIR"] = str(backup_dir)
    env["POSTGRES_DB"] = "wealthos_test"

    proc = subprocess.run(
        ["bash", str(backup_script)],
        cwd=str(REPO_ROOT),
        env=env,
        capture_output=True,
        text=True,
    )
    assert proc.returncode == 0, f"Backup creation failed: {proc.stderr}\n{proc.stdout}"

    enc_files = list(backup_dir.glob("*.dump.enc"))
    assert len(enc_files) == 1, f"Expected 1 encrypted dump, found {len(enc_files)}"
    enc_file = enc_files[0]
    manifest_file = backup_dir / f"{enc_file.name[:-9]}.json"
    assert manifest_file.exists(), f"Manifest {manifest_file} missing"

    return {
        "dir": backup_dir,
        "enc_file": enc_file,
        "manifest_file": manifest_file,
    }


def test_restore_security_acceptance_valid_restore(test_encrypted_backup, pg_env):
    """Verify that a genuine encrypted backup restores cleanly and passes all post-restore gates."""
    restore_script = SCRIPTS_DIR / "restore_database.sh"
    target_db = "wealthos_restore_test"

    env = pg_env.copy()
    proc = subprocess.run(
        ["bash", str(restore_script), str(test_encrypted_backup["enc_file"]), target_db],
        cwd=str(REPO_ROOT),
        env=env,
        capture_output=True,
        text=True,
    )

    assert proc.returncode == 0, f"Restore failed: {proc.stderr}\n{proc.stdout}"
    assert (
        "Post-restore Schema Version verified: 0008_wave_2_intelligence" in proc.stdout
        or "Post-restore Schema Version verified: 0007_investment_accounting" in proc.stdout
        or "Post-restore Schema Version verified: 0005_financial_foundation" in proc.stdout
    )
    assert "Post-restore General Ledger balance verified: 0 unbalanced entries." in proc.stdout
    assert (
        "Application role 'wealthos_app' verified: rolsuper=false, rolbypassrls=false, rolcanlogin=true."
        in proc.stdout
    )
    assert (
        "Explicit verification of all 43 tenant tables passed: all have relrowsecurity=true and relforcerowsecurity=true."
        in proc.stdout
    )
    assert "Behavioral RLS isolation verified" in proc.stdout
    assert "Defense-in-depth verified: role 'wealthos_app' cannot disable RLS" in proc.stdout

    # Verify temporary decrypted dump was wiped
    tmp_dumps = list(test_encrypted_backup["dir"].glob("*.tmp_restore.dump"))
    assert len(tmp_dumps) == 0, f"Temporary decrypted file left behind: {tmp_dumps}"


def test_restore_security_rejection_wrong_key(test_encrypted_backup, pg_env, tmp_path):
    """Verify restore fails closed and cleans up temporary files when an incorrect key is provided."""
    restore_script = SCRIPTS_DIR / "restore_database.sh"
    target_db = "wealthos_restore_test"

    env = pg_env.copy()
    env["WEALTHOS_BACKUP_ENCRYPTION_KEY"] = "completely_wrong_key_unauthorized_attacker"

    proc = subprocess.run(
        ["bash", str(restore_script), str(test_encrypted_backup["enc_file"]), target_db],
        cwd=str(REPO_ROOT),
        env=env,
        capture_output=True,
        text=True,
    )

    assert proc.returncode != 0
    assert (
        "Authenticated decryption failed" in proc.stderr
        or "Authenticated decryption failed" in proc.stdout
    )

    # Ensure no decrypted plaintext dump persists
    tmp_dumps = list(test_encrypted_backup["dir"].glob("*.tmp_restore.dump"))
    assert len(tmp_dumps) == 0


def test_restore_security_rejection_tampered_ciphertext(test_encrypted_backup, pg_env, tmp_path):
    """Verify restore fails closed when ciphertext bytes have been tampered with."""
    restore_script = SCRIPTS_DIR / "restore_database.sh"
    target_db = "wealthos_restore_test"

    # Copy files to tmp_path
    tampered_enc = tmp_path / "tampered.dump.enc"
    tampered_manifest = tmp_path / "tampered.json"
    shutil.copyfile(test_encrypted_backup["enc_file"], tampered_enc)
    shutil.copyfile(test_encrypted_backup["manifest_file"], tampered_manifest)

    # Corrupt last byte of ciphertext
    data = bytearray(tampered_enc.read_bytes())
    data[-1] = (data[-1] + 1) % 256
    tampered_enc.write_bytes(data)

    env = pg_env.copy()
    proc = subprocess.run(
        ["bash", str(restore_script), str(tampered_enc), target_db],
        cwd=str(REPO_ROOT),
        env=env,
        capture_output=True,
        text=True,
    )

    assert proc.returncode != 0
    assert (
        "Authenticated decryption failed" in proc.stderr
        or "Authenticated decryption failed" in proc.stdout
    )

    tmp_dumps = list(tmp_path.glob("*.tmp_restore.dump"))
    assert len(tmp_dumps) == 0


def test_restore_security_rejection_tampered_manifest(test_encrypted_backup, pg_env, tmp_path):
    """Verify restore fails closed when manifest checksum does not match ciphertext."""
    restore_script = SCRIPTS_DIR / "restore_database.sh"
    target_db = "wealthos_restore_test"

    tampered_enc = tmp_path / "manifest_tamper.dump.enc"
    tampered_manifest = tmp_path / "manifest_tamper.json"
    shutil.copyfile(test_encrypted_backup["enc_file"], tampered_enc)

    manifest_data = json.loads(test_encrypted_backup["manifest_file"].read_text())
    manifest_data["encrypted_artifact"]["sha256"] = (
        "0000000000000000000000000000000000000000000000000000000000000000"
    )
    tampered_manifest.write_text(json.dumps(manifest_data))

    env = pg_env.copy()
    proc = subprocess.run(
        ["bash", str(restore_script), str(tampered_enc), target_db],
        cwd=str(REPO_ROOT),
        env=env,
        capture_output=True,
        text=True,
    )

    assert proc.returncode != 0
    assert (
        "Authenticated decryption failed" in proc.stderr
        or "Authenticated decryption failed" in proc.stdout
    )

    tmp_dumps = list(tmp_path.glob("*.tmp_restore.dump"))
    assert len(tmp_dumps) == 0


def test_restore_security_role_attributes(pg_env):
    """Verify role 'wealthos_app' strictly has rolsuper=false, rolbypassrls=false, rolcanlogin=true."""
    conn = psycopg.connect(
        host=pg_env["POSTGRES_HOST"],
        port=pg_env["POSTGRES_PORT"],
        user=pg_env["POSTGRES_ADMIN_USER"],
        password=pg_env["POSTGRES_ADMIN_PASSWORD"],
        dbname="wealthos_restore_test",
    )
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT rolsuper, rolbypassrls, rolcanlogin FROM pg_roles WHERE rolname = 'wealthos_app';"
            )
            row = cur.fetchone()
            assert row is not None, "Role 'wealthos_app' missing from database"
            rolsuper, rolbypassrls, rolcanlogin = row
            assert rolsuper is False, "Role 'wealthos_app' must NOT be superuser"
            assert rolbypassrls is False, "Role 'wealthos_app' must NOT have BYPASSRLS privilege"
            assert rolcanlogin is True, "Role 'wealthos_app' must have LOGIN privilege"
    finally:
        conn.close()


def test_restore_security_all_43_tables_rls_forced(pg_env):
    """Verify all 43 tenant tables have relrowsecurity=true and relforcerowsecurity=true."""
    conn = psycopg.connect(
        host=pg_env["POSTGRES_HOST"],
        port=pg_env["POSTGRES_PORT"],
        user=pg_env["POSTGRES_ADMIN_USER"],
        password=pg_env["POSTGRES_ADMIN_PASSWORD"],
        dbname="wealthos_restore_test",
    )
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                WITH required_tables AS (
                    SELECT unnest(%s::text[]) AS relname
                )
                SELECT
                    r.relname,
                    COALESCE(c.relrowsecurity, false) AS relrowsecurity,
                    COALESCE(c.relforcerowsecurity, false) AS relforcerowsecurity
                FROM required_tables r
                LEFT JOIN pg_class c ON c.relname = r.relname
                    AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
                WHERE c.relname IS NULL OR c.relrowsecurity = false OR c.relforcerowsecurity = false;
            """,
                (ALL_43_TENANT_TABLES,),
            )
            defective = cur.fetchall()
            assert defective == [], f"Tenant tables with missing/unforced RLS: {defective}"
    finally:
        conn.close()


def test_restore_security_cross_tenant_isolation_and_context_reset(pg_env):
    """Verify behavioral cross-tenant isolation and context reset under role 'wealthos_app'."""
    conn = psycopg.connect(
        host=pg_env["POSTGRES_HOST"],
        port=pg_env["POSTGRES_PORT"],
        user=pg_env["POSTGRES_ADMIN_USER"],
        password=pg_env["POSTGRES_ADMIN_PASSWORD"],
        dbname="wealthos_restore_test",
        autocommit=True,
    )
    try:
        with conn.cursor() as cur:
            # 1. Without tenant context: wealthos_app sees 0 rows
            cur.execute("SET ROLE wealthos_app;")
            cur.execute("SELECT count(*) FROM accounts;")
            count_no_context = cur.fetchone()[0]
            assert count_no_context == 0, (
                f"Expected 0 accounts without tenant context, got {count_no_context}"
            )

            # 2. Get real tenant ID
            cur.execute("RESET ROLE;")
            cur.execute("SELECT id FROM tenants LIMIT 1;")
            row = cur.fetchone()
            if row:
                tenant_a = str(row[0])
                tenant_b = "00000000-0000-0000-0000-000000000002"

                cur.execute("SET ROLE wealthos_app;")

                # Set Tenant A context
                cur.execute(f"SET app.current_tenant_id = '{tenant_a}';")
                cur.execute(f"SELECT count(*) FROM accounts WHERE tenant_id <> '{tenant_a}';")
                cross_tenant_leaks = cur.fetchone()[0]
                assert cross_tenant_leaks == 0, (
                    f"Tenant A saw accounts from other tenants: {cross_tenant_leaks}"
                )

                # Set Tenant B context (disjoint tenant)
                cur.execute(f"SET app.current_tenant_id = '{tenant_b}';")
                cur.execute(f"SELECT count(*) FROM accounts WHERE tenant_id = '{tenant_a}';")
                tenant_b_saw_tenant_a = cur.fetchone()[0]
                assert tenant_b_saw_tenant_a == 0, (
                    f"Tenant B saw accounts from Tenant A: {tenant_b_saw_tenant_a}"
                )

                # Reset context
                cur.execute("RESET app.current_tenant_id;")
                cur.execute("SELECT count(*) FROM accounts;")
                count_after_reset = cur.fetchone()[0]
                assert count_after_reset == 0, (
                    f"Expected 0 accounts after reset, got {count_after_reset}"
                )

            cur.execute("RESET ROLE;")
    finally:
        conn.close()


def test_restore_security_app_cannot_disable_rls(pg_env):
    """Verify defense-in-depth: 'wealthos_app' receives permission denied when attempting to alter RLS."""
    conn = psycopg.connect(
        host=pg_env["POSTGRES_HOST"],
        port=pg_env["POSTGRES_PORT"],
        user=pg_env["POSTGRES_ADMIN_USER"],
        password=pg_env["POSTGRES_ADMIN_PASSWORD"],
        dbname="wealthos_restore_test",
    )
    try:
        with conn.cursor() as cur:
            cur.execute("SET ROLE wealthos_app;")
            with pytest.raises(errors.InsufficientPrivilege) as exc_info:
                cur.execute("ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;")
            assert "must be owner of table accounts" in str(exc_info.value).lower()
    finally:
        conn.close()
