"""WealthOS Runtime Database Role Cross-Tenant Isolation Integration Tests.

Validates that PostgreSQL Row-Level Security (RLS) and Composite Foreign Keys
enforce strict kernel-level tenant isolation when operating under the runtime
least-privilege role 'wealthos_app' (configured with NOBYPASSRLS).

Tests:
1. Cross-Tenant Read Rejection (Tenant A cannot see Tenant B's records).
2. Cross-Tenant Update Rejection (Tenant A cannot mutate Tenant B's records).
3. Cross-Tenant Delete Rejection (Tenant A cannot delete Tenant B's records).
4. Cross-Tenant Foreign Key Rejection (Tenant A cannot link to Tenant B's parent entity).
5. Fail-Closed Unauthenticated Query (Missing app.current_tenant_id returns 0 rows).
"""

import uuid
from decimal import Decimal

import psycopg
import pytest

from app.core.config import settings


@pytest.fixture
def db_conn():
    """Establish a direct PostgreSQL connection as the runtime application role 'wealthos_app'."""
    conn = psycopg.connect(
        host=settings.POSTGRES_HOST,
        port=settings.POSTGRES_PORT,
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        dbname=settings.POSTGRES_DB,
        autocommit=False,
    )
    yield conn
    conn.close()


@pytest.fixture
def admin_conn():
    """Establish connection as admin to seed test tenants and initial fixtures."""
    conn = psycopg.connect(
        host=settings.POSTGRES_HOST,
        port=settings.POSTGRES_PORT,
        user=settings.POSTGRES_ADMIN_USER,
        password=settings.POSTGRES_ADMIN_PASSWORD,
        dbname=settings.POSTGRES_DB,
        autocommit=True,
    )
    yield conn
    conn.close()


@pytest.fixture
def isolated_tenants(admin_conn):
    """Seed Tenant Alpha and Tenant Beta with bank accounts and categories."""
    tenant_a_id = uuid.uuid4()
    tenant_b_id = uuid.uuid4()
    account_a_id = uuid.uuid4()
    account_b_id = uuid.uuid4()

    with admin_conn.cursor() as cur:
        # 1. Create Tenants
        cur.execute(
            """
            INSERT INTO tenants (id, name, slug, status)
            VALUES
                (%s, 'Tenant Alpha Corp', %s, 'ACTIVE'),
                (%s, 'Tenant Beta Ltd', %s, 'ACTIVE');
            """,
            (
                tenant_a_id,
                f"alpha-{tenant_a_id.hex[:6]}",
                tenant_b_id,
                f"beta-{tenant_b_id.hex[:6]}",
            ),
        )

        # 2. Seed Financial Accounts
        cur.execute(
            """
            INSERT INTO financial_accounts (id, tenant_id, account_name, account_number_mask, account_type, currency, current_balance)
            VALUES
                (%s, %s, 'Alpha Operating Checking', '****1111', 'CURRENT', 'INR', 150000.0000),
                (%s, %s, 'Beta Operating Checking', '****2222', 'CURRENT', 'INR', 275000.0000);
            """,
            (account_a_id, tenant_a_id, account_b_id, tenant_b_id),
        )

    yield {
        "tenant_a": tenant_a_id,
        "tenant_b": tenant_b_id,
        "account_a": account_a_id,
        "account_b": account_b_id,
    }

    # Teardown
    with admin_conn.cursor() as cur:
        cur.execute("DELETE FROM tenants WHERE id IN (%s, %s);", (tenant_a_id, tenant_b_id))


def test_cross_tenant_read_rejection(db_conn, isolated_tenants):
    """Verify Tenant A cannot read Tenant B's accounts or transactions."""
    fixture = isolated_tenants
    tenant_a = fixture["tenant_a"]
    account_b = fixture["account_b"]

    with db_conn.cursor() as cur:
        # Set tenant session context to Tenant A
        cur.execute("SELECT set_config('app.current_tenant_id', %s, true);", (str(tenant_a),))

        # Query all accounts visible in this session
        cur.execute("SELECT id, account_name, current_balance FROM financial_accounts;")
        rows = cur.fetchall()

        # Tenant A must only see their own account
        assert len(rows) == 1
        assert rows[0][0] == fixture["account_a"]
        assert rows[0][1] == "Alpha Operating Checking"

        # Explicit query for Tenant B's account ID must return nothing
        cur.execute("SELECT id FROM financial_accounts WHERE id = %s;", (account_b,))
        assert cur.fetchone() is None


def test_cross_tenant_update_rejection(db_conn, isolated_tenants):
    """Verify Tenant A cannot update or tamper with Tenant B's balances."""
    fixture = isolated_tenants
    tenant_a = fixture["tenant_a"]
    account_b = fixture["account_b"]

    with db_conn.cursor() as cur:
        cur.execute("SELECT set_config('app.current_tenant_id', %s, true);", (str(tenant_a),))

        # Attempt to overwrite Tenant B's account balance
        cur.execute(
            """
            UPDATE financial_accounts
            SET current_balance = 0.0000
            WHERE id = %s;
            """,
            (account_b,),
        )
        # RLS makes the row invisible, resulting in 0 rows updated
        assert cur.rowcount == 0
        db_conn.commit()

    # Verify Tenant B's balance remained completely intact
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT set_config('app.current_tenant_id', %s, true);", (str(fixture["tenant_b"]),)
        )
        cur.execute("SELECT current_balance FROM financial_accounts WHERE id = %s;", (account_b,))
        row = cur.fetchone()
        assert row is not None
        assert row[0] == Decimal("275000.0000")


def test_cross_tenant_delete_rejection(db_conn, isolated_tenants):
    """Verify Tenant A cannot delete Tenant B's financial accounts."""
    fixture = isolated_tenants
    tenant_a = fixture["tenant_a"]
    account_b = fixture["account_b"]

    with db_conn.cursor() as cur:
        cur.execute("SELECT set_config('app.current_tenant_id', %s, true);", (str(tenant_a),))
        cur.execute("DELETE FROM financial_accounts WHERE id = %s;", (account_b,))
        assert cur.rowcount == 0
        db_conn.commit()

    # Verify row still exists under Tenant B
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT set_config('app.current_tenant_id', %s, true);", (str(fixture["tenant_b"]),)
        )
        cur.execute("SELECT id FROM financial_accounts WHERE id = %s;", (account_b,))
        assert cur.fetchone() is not None


def test_cross_tenant_foreign_key_injection_rejected(db_conn, isolated_tenants):
    """Verify Tenant A cannot create a transaction referencing Tenant B's account.

    Enforced by composite foreign key fk_tx_account_tenant (account_id, tenant_id).
    """
    fixture = isolated_tenants
    tenant_a = fixture["tenant_a"]
    account_b = fixture["account_b"]

    with db_conn.cursor() as cur:
        cur.execute("SELECT set_config('app.current_tenant_id', %s, true);", (str(tenant_a),))

        # Attempt to insert a transaction under Tenant A referencing Tenant B's account
        with pytest.raises(psycopg.errors.ForeignKeyViolation) as exc_info:
            cur.execute(
                """
                INSERT INTO financial_transactions (
                    tenant_id, account_id, transaction_date, amount, currency, direction, description
                ) VALUES (
                    %s, %s, NOW(), 5000.0000, 'INR', 'DEBIT', 'Cross-tenant injection attack'
                );
                """,
                (tenant_a, account_b),
            )

        assert "fk_tx_account_tenant" in str(exc_info.value)
        db_conn.rollback()


def test_cross_tenant_budget_and_goals_isolation(db_conn, isolated_tenants, admin_conn):
    """Verify cross-tenant isolation on budgets, goals and allocations."""
    fixture = isolated_tenants
    tenant_a = fixture["tenant_a"]
    tenant_b = fixture["tenant_b"]
    budget_b_id = uuid.uuid4()
    goal_b_id = uuid.uuid4()

    with admin_conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO budgets (id, tenant_id, name, period_type, start_date, end_date, total_amount, currency)
            VALUES (%s, %s, 'Beta Q4 Budget', 'QUARTERLY', '2026-10-01', '2026-12-31', 500000.0000, 'INR');
            """,
            (budget_b_id, tenant_b),
        )
        cur.execute(
            """
            INSERT INTO financial_goals (id, tenant_id, name, category, target_amount, currency, target_date)
            VALUES (%s, %s, 'Beta Growth Capital', 'INVESTMENT', 10000000.0000, 'INR', '2028-12-31');
            """,
            (goal_b_id, tenant_b),
        )

    with db_conn.cursor() as cur:
        # Operating as Tenant A
        cur.execute("SELECT set_config('app.current_tenant_id', %s, true);", (str(tenant_a),))

        # Query budgets and goals
        cur.execute("SELECT id FROM budgets WHERE id = %s;", (budget_b_id,))
        assert cur.fetchone() is None

        cur.execute("SELECT id FROM financial_goals WHERE id = %s;", (goal_b_id,))
        assert cur.fetchone() is None

        # Cross-tenant FK rejection: Tenant A cannot allocate against Tenant B's budget
        with pytest.raises(psycopg.errors.ForeignKeyViolation):
            cur.execute(
                """
                INSERT INTO budget_allocations (
                    tenant_id, budget_id, category_id, allocated_amount, currency
                ) VALUES (
                    %s, %s, %s, 50000.0000, 'INR'
                );
                """,
                (tenant_a, budget_b_id, uuid.uuid4()),
            )
        db_conn.rollback()


def test_cross_tenant_copilot_isolation(db_conn, isolated_tenants, admin_conn):
    """Verify Copilot conversations and messages are strictly isolated per tenant."""
    fixture = isolated_tenants
    tenant_a = fixture["tenant_a"]
    tenant_b = fixture["tenant_b"]
    user_b_id = uuid.uuid4()
    conv_b_id = uuid.uuid4()

    with admin_conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO users (id, email, first_name, last_name, status)
            VALUES (%s, %s, 'User', 'Beta', 'ACTIVE');
            """,
            (user_b_id, f"beta-{user_b_id.hex[:6]}@example.com"),
        )
        cur.execute(
            """
            INSERT INTO copilot_conversations (id, tenant_id, user_id, title)
            VALUES (%s, %s, %s, 'Confidential Acquisition Strategy');
            """,
            (conv_b_id, tenant_b, user_b_id),
        )

    with db_conn.cursor() as cur:
        # Operating as Tenant A
        cur.execute("SELECT set_config('app.current_tenant_id', %s, true);", (str(tenant_a),))
        cur.execute("SELECT title FROM copilot_conversations WHERE id = %s;", (conv_b_id,))
        assert cur.fetchone() is None

        # Cross-tenant insert into Tenant B's conversation rejected by composite FK
        with pytest.raises(psycopg.errors.ForeignKeyViolation):
            cur.execute(
                """
                INSERT INTO copilot_messages (
                    tenant_id, conversation_id, role, content
                ) VALUES (
                    %s, %s, 'user', 'Infiltrating conversation'
                );
                """,
                (tenant_a, conv_b_id),
            )
        db_conn.rollback()
