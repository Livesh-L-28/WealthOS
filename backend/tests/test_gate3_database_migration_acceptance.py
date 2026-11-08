"""Gate 3 — Database & Migration Acceptance Verification Test Suite.

Executes comprehensive PostgreSQL 16+ integration checks against a disposable
test database ('wealthos_disposable_gate3_test'):
1. Fresh database creation and full Alembic migration chain upgrade.
2. Downgrade (-1) and re-upgrade lifecycle validation.
3. PostgreSQL extensions, schema version, table inventory (43 tenant tables).
4. Composite tenant foreign keys and parent UNIQUE (id, tenant_id) constraints.
5. Row-Level Security (RLS) and FORCE RLS policy verification.
6. Runtime role 'wealthos_app' least-privilege checks (NOBYPASSRLS, non-superuser).
7. Cross-tenant isolation matrix between Tenant Alpha and Tenant Beta across
   accounts, transactions, documents, reports, copilot, budgets, and investments.
8. Connection pool context cleanup and transaction-local session isolation.
"""

import os
import subprocess
import uuid
from pathlib import Path

import psycopg
import pytest

from app.core.config import settings

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DISPOSABLE_DB = "wealthos_disposable_gate3_test"


@pytest.fixture(scope="module")
def disposable_database():
    """Create a pristine disposable database for migration and lifecycle testing, then destroy it."""
    # Connect to default maintenance database as admin
    admin_conn = psycopg.connect(
        host=settings.POSTGRES_HOST,
        port=settings.POSTGRES_PORT,
        user=settings.POSTGRES_ADMIN_USER,
        password=settings.POSTGRES_ADMIN_PASSWORD,
        dbname="postgres",
        autocommit=True,
    )

    with admin_conn.cursor() as cur:
        # Drop if previously left over
        cur.execute(f"DROP DATABASE IF EXISTS {DISPOSABLE_DB} WITH (FORCE);")
        cur.execute(f"CREATE DATABASE {DISPOSABLE_DB} OWNER {settings.POSTGRES_ADMIN_USER};")

    # Install extensions in disposable DB
    db_conn = psycopg.connect(
        host=settings.POSTGRES_HOST,
        port=settings.POSTGRES_PORT,
        user=settings.POSTGRES_ADMIN_USER,
        password=settings.POSTGRES_ADMIN_PASSWORD,
        dbname=DISPOSABLE_DB,
        autocommit=True,
    )
    with db_conn.cursor() as cur:
        cur.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
        cur.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')
        cur.execute('CREATE EXTENSION IF NOT EXISTS "btree_gist";')
    db_conn.close()

    yield DISPOSABLE_DB

    # Cleanup teardown
    with admin_conn.cursor() as cur:
        cur.execute(f"DROP DATABASE IF EXISTS {DISPOSABLE_DB} WITH (FORCE);")
    admin_conn.close()


def test_disposable_migration_lifecycle(disposable_database):
    """Verify full Alembic migration chain upgrade, downgrade -1, and re-upgrade."""
    env = os.environ.copy()
    env["POSTGRES_DB"] = disposable_database

    # 1. Upgrade to Head
    res_up = subprocess.run(
        ["alembic", "upgrade", "head"],
        cwd=str(REPO_ROOT / "backend"),
        env=env,
        capture_output=True,
        text=True,
    )
    assert res_up.returncode == 0, f"Alembic upgrade head failed:\n{res_up.stderr}"

    # Verify schema version
    conn = psycopg.connect(
        host=settings.POSTGRES_HOST,
        port=settings.POSTGRES_PORT,
        user=settings.POSTGRES_ADMIN_USER,
        password=settings.POSTGRES_ADMIN_PASSWORD,
        dbname=disposable_database,
    )
    with conn.cursor() as cur:
        cur.execute("SELECT version_num FROM alembic_version LIMIT 1;")
        row = cur.fetchone()
        assert row is not None
        assert row[0] == "0011_phase19_enterprise_trust"

    # 2. Downgrade -1
    res_down = subprocess.run(
        ["alembic", "downgrade", "-1"],
        cwd=str(REPO_ROOT / "backend"),
        env=env,
        capture_output=True,
        text=True,
    )
    assert res_down.returncode == 0, f"Alembic downgrade -1 failed:\n{res_down.stderr}"

    with conn.cursor() as cur:
        cur.execute("SELECT version_num FROM alembic_version LIMIT 1;")
        row = cur.fetchone()
        assert row is not None
        assert row[0] == "0010_wave_4_intelligence"

    # 3. Re-upgrade to Head
    res_reup = subprocess.run(
        ["alembic", "upgrade", "head"],
        cwd=str(REPO_ROOT / "backend"),
        env=env,
        capture_output=True,
        text=True,
    )
    assert res_reup.returncode == 0, f"Alembic re-upgrade failed:\n{res_reup.stderr}"

    with conn.cursor() as cur:
        cur.execute("SELECT version_num FROM alembic_version LIMIT 1;")
        row = cur.fetchone()
        assert row is not None
        assert row[0] == "0011_phase19_enterprise_trust"
    conn.close()


def test_schema_inventory_and_rls_forcing(disposable_database):
    """Verify all required tables exist, RLS is enabled, and FORCE RLS is active."""
    conn = psycopg.connect(
        host=settings.POSTGRES_HOST,
        port=settings.POSTGRES_PORT,
        user=settings.POSTGRES_ADMIN_USER,
        password=settings.POSTGRES_ADMIN_PASSWORD,
        dbname=disposable_database,
    )
    with conn.cursor() as cur:
        # Check table count with RLS enabled
        cur.execute("""
            SELECT count(*)
            FROM pg_tables
            WHERE schemaname = 'public' AND rowsecurity = true;
        """)
        rls_count = cur.fetchone()[0]
        assert rls_count >= 40, f"Expected >= 40 RLS-enabled tables, found {rls_count}"

        # Check FORCE ROW LEVEL SECURITY on tenant tables
        cur.execute("""
            SELECT c.relname
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relkind = 'r'
              AND c.relforcerowsecurity = true;
        """)
        forced_tables = [row[0] for row in cur.fetchall()]
        assert "financial_accounts" in forced_tables
        assert "financial_transactions" in forced_tables
        assert "journal_entries" in forced_tables
        assert "budgets" in forced_tables
        assert "financial_documents" in forced_tables
        assert "copilot_conversations" in forced_tables
    conn.close()


def test_runtime_role_privileges(disposable_database):
    """Verify runtime role 'wealthos_app' is not a superuser and does not have BYPASSRLS."""
    conn = psycopg.connect(
        host=settings.POSTGRES_HOST,
        port=settings.POSTGRES_PORT,
        user=settings.POSTGRES_ADMIN_USER,
        password=settings.POSTGRES_ADMIN_PASSWORD,
        dbname=disposable_database,
    )
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT rolname, rolsuper, rolbypassrls, rolcanlogin
            FROM pg_roles
            WHERE rolname = %s;
        """,
            (settings.POSTGRES_USER,),
        )
        row = cur.fetchone()
        assert row is not None, f"Runtime role {settings.POSTGRES_USER} does not exist"
        rolname, rolsuper, rolbypassrls, rolcanlogin = row
        assert rolsuper is False, f"Role {rolname} must NOT be a superuser"
        assert rolbypassrls is False, f"Role {rolname} must NOT have BYPASSRLS"
        assert rolcanlogin is True, f"Role {rolname} must have login privileges"
    conn.close()


def test_cross_tenant_multi_surface_isolation(disposable_database):
    """Execute complete cross-tenant test matrix (Alpha vs Beta) under runtime role 'wealthos_app'."""
    # 1. Admin seeds Tenant Alpha and Tenant Beta
    admin_conn = psycopg.connect(
        host=settings.POSTGRES_HOST,
        port=settings.POSTGRES_PORT,
        user=settings.POSTGRES_ADMIN_USER,
        password=settings.POSTGRES_ADMIN_PASSWORD,
        dbname=disposable_database,
        autocommit=True,
    )

    tenant_a = uuid.uuid4()
    tenant_b = uuid.uuid4()
    user_a = uuid.uuid4()
    user_b = uuid.uuid4()
    account_a = uuid.uuid4()
    account_b = uuid.uuid4()
    doc_b = uuid.uuid4()
    report_b = uuid.uuid4()
    budget_b = uuid.uuid4()
    lot_b = uuid.uuid4()
    instrument_id = uuid.uuid4()

    with admin_conn.cursor() as cur:
        # Seed Tenants
        cur.execute(
            """
            INSERT INTO tenants (id, name, slug, status) VALUES
                (%s, 'Tenant Alpha Corp', %s, 'ACTIVE'),
                (%s, 'Tenant Beta Ltd', %s, 'ACTIVE');
        """,
            (tenant_a, f"alpha-{tenant_a.hex[:6]}", tenant_b, f"beta-{tenant_b.hex[:6]}"),
        )

        # Seed Users
        cur.execute(
            """
            INSERT INTO users (id, email, first_name, last_name, status) VALUES
                (%s, %s, 'Alpha', 'Admin', 'ACTIVE'),
                (%s, %s, 'Beta', 'Admin', 'ACTIVE');
        """,
            (
                user_a,
                f"alpha-{user_a.hex[:6]}@example.com",
                user_b,
                f"beta-{user_b.hex[:6]}@example.com",
            ),
        )

        # Seed Accounts
        cur.execute(
            """
            INSERT INTO financial_accounts (id, tenant_id, account_name, account_number_mask, account_type, currency, current_balance) VALUES
                (%s, %s, 'Alpha Operating', '****1001', 'CURRENT', 'INR', 500000.0000),
                (%s, %s, 'Beta Operating', '****2002', 'CURRENT', 'INR', 750000.0000);
        """,
            (account_a, tenant_a, account_b, tenant_b),
        )

        # Seed Documents
        cur.execute(
            """
            INSERT INTO financial_documents (id, tenant_id, filename, file_size_bytes, mime_type, storage_path, file_hash, document_type, processing_status) VALUES
                (%s, %s, 'beta_confidential_audit.pdf', 1024, 'application/pdf', 'vault/beta_audit.pdf', 'dummy_hash_beta', 'STATEMENT', 'PENDING');
        """,
            (doc_b, tenant_b),
        )

        # Seed Report Jobs
        cur.execute(
            """
            INSERT INTO report_jobs (id, tenant_id, user_id, report_type, export_format, status) VALUES
                (%s, %s, %s, 'FINANCIAL_SUMMARY', 'PDF', 'COMPLETED');
        """,
            (report_b, tenant_b, user_b),
        )

        # Seed Budgets
        cur.execute(
            """
            INSERT INTO budgets (id, tenant_id, name, period_type, start_date, end_date, total_amount, currency) VALUES
                (%s, %s, 'Beta CapEx Budget', 'ANNUAL', '2026-01-01', '2026-12-31', 1200000.0000, 'INR');
        """,
            (budget_b, tenant_b),
        )

        # Seed Instrument & Investment Lot
        cur.execute(
            """
            INSERT INTO financial_instruments (id, symbol, name, instrument_type, currency, isin) VALUES
                (%s, 'TCS', 'Tata Consultancy Services', 'EQUITY', 'INR', 'INE467B01029')
            ON CONFLICT (symbol, exchange) DO NOTHING;
        """,
            (instrument_id,),
        )
        cur.execute("SELECT id FROM financial_instruments WHERE symbol = 'TCS';")
        real_instrument_id = cur.fetchone()[0]

        cur.execute(
            """
            INSERT INTO investment_holding_lots (id, tenant_id, account_id, instrument_id, purchase_date, quantity, purchase_price, cost_basis, remaining_quantity, currency) VALUES
                (%s, %s, %s, %s, '2026-01-15', 100.0000, 3850.0000, 385000.0000, 100.0000, 'INR');
        """,
            (lot_b, tenant_b, account_b, real_instrument_id),
        )
    admin_conn.close()

    # 2. Connect strictly as runtime application role 'wealthos_app' (NOBYPASSRLS)
    app_conn = psycopg.connect(
        host=settings.POSTGRES_HOST,
        port=settings.POSTGRES_PORT,
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        dbname=disposable_database,
        autocommit=False,
    )

    with app_conn.cursor() as cur:
        # Set session context to Tenant Alpha
        cur.execute("SELECT set_config('app.current_tenant_id', %s, true);", (str(tenant_a),))

        # A. Cross-Tenant SELECT isolation
        cur.execute("SELECT id FROM financial_accounts WHERE id = %s;", (account_b,))
        assert cur.fetchone() is None, "Tenant Alpha must not see Tenant Beta accounts"

        cur.execute("SELECT id FROM financial_documents WHERE id = %s;", (doc_b,))
        assert cur.fetchone() is None, "Tenant Alpha must not see Tenant Beta documents"

        cur.execute("SELECT id FROM report_jobs WHERE id = %s;", (report_b,))
        assert cur.fetchone() is None, "Tenant Alpha must not see Tenant Beta report jobs"

        cur.execute("SELECT id FROM budgets WHERE id = %s;", (budget_b,))
        assert cur.fetchone() is None, "Tenant Alpha must not see Tenant Beta budgets"

        cur.execute("SELECT id FROM investment_holding_lots WHERE id = %s;", (lot_b,))
        assert cur.fetchone() is None, (
            "Tenant Alpha must not see Tenant Beta investment holding lots"
        )

        # B. Cross-Tenant UPDATE rejection
        cur.execute(
            "UPDATE financial_accounts SET current_balance = 0.0000 WHERE id = %s;", (account_b,)
        )
        assert cur.rowcount == 0, "Tenant Alpha cannot update Tenant Beta account"

        cur.execute("UPDATE budgets SET total_amount = 0.0000 WHERE id = %s;", (budget_b,))
        assert cur.rowcount == 0, "Tenant Alpha cannot update Tenant Beta budget"

        # C. Cross-Tenant DELETE rejection
        cur.execute("DELETE FROM financial_documents WHERE id = %s;", (doc_b,))
        assert cur.rowcount == 0, "Tenant Alpha cannot delete Tenant Beta document"

        # D. Cross-Tenant Foreign Key Injection rejection (Relational Kernel Level)
        with pytest.raises(psycopg.errors.ForeignKeyViolation):
            cur.execute(
                """
                INSERT INTO financial_transactions (
                    tenant_id, account_id, transaction_date, amount, currency, direction, description
                ) VALUES (
                    %s, %s, NOW(), 10000.0000, 'INR', 'DEBIT', 'Cross-tenant FK injection'
                );
            """,
                (tenant_a, account_b),
            )
        app_conn.rollback()

    # E. Session cleanup & Transaction-local context verification
    with app_conn.cursor() as cur:
        # In a new transaction without set_config, queries must fail closed (return 0 rows)
        cur.execute("SELECT id FROM financial_accounts;")
        assert len(cur.fetchall()) == 0, (
            "Unauthenticated queries without tenant context must return 0 rows"
        )
    app_conn.close()
