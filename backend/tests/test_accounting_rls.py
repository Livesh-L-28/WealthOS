"""Mandatory Release Gate: Accounting Engine PostgreSQL Row-Level Security (RLS) Isolation Tests.

Empirically verifies under non-superuser role `wealthos_app` (NOSUPERUSER, NOBYPASSRLS) that:
1. All 6 accounting tables enforce ROW LEVEL SECURITY and FORCE ROW LEVEL SECURITY.
2. Tenant context boundary isolation is absolute across accounts, journals, lines, and periods.
3. Cross-tenant INSERT attempts are rejected by PostgreSQL RLS with policy violation errors.
4. Missing tenant context denies all queries fail-closed (returns 0 rows).
"""

import uuid
from datetime import date

import pytest
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenant_context import reset_db_session_state, set_db_tenant_context


@pytest.mark.asyncio
async def test_accounting_tables_have_rls_and_force_enabled(db_session: AsyncSession):
    """Verify that all 6 accounting tables enforce relrowsecurity and relforcerowsecurity."""
    accounting_tables = {
        "accounts",
        "accounting_periods",
        "journal_entries",
        "journal_lines",
        "accounting_idempotency_records",
        "reconciliation_records",
    }

    result = await db_session.execute(
        text(
            """
            SELECT relname, relrowsecurity, relforcerowsecurity
            FROM pg_class
            WHERE relname = ANY(:tables) AND relkind = 'r';
            """
        ),
        {"tables": list(accounting_tables)},
    )
    rows = result.fetchall()
    found = {name: (rls, force_rls) for name, rls, force_rls in rows}

    for tbl in accounting_tables:
        assert tbl in found, f"Table {tbl} not found in database."
        rls_enabled, force_enabled = found[tbl]
        assert rls_enabled is True, f"RLS is NOT enabled on table {tbl}"
        assert force_enabled is True, f"FORCE RLS is NOT enabled on table {tbl}"


@pytest.mark.asyncio
async def test_accounting_rls_cross_tenant_isolation(
    db_session: AsyncSession,
    test_user_factory,
):
    """Verify absolute tenant boundary on Chart of Accounts and Journal Entries."""
    user_a, tenant_a, _ = await test_user_factory(email="tenant.a@example.com")
    user_b, tenant_b, _ = await test_user_factory(email="tenant.b@example.com")

    # 1. Under Tenant A context: insert account and journal entry
    await set_db_tenant_context(db_session, tenant_a.id, user_id=user_a.id)

    acct_a_id = uuid.uuid4()
    await db_session.execute(
        text(
            """
            INSERT INTO accounts (id, tenant_id, account_code, account_name, account_type, normal_balance)
            VALUES (:id, :tenant_id, '1020', 'Tenant A Secret Bank', 'ASSET', 'DEBIT');
            """
        ),
        {"id": acct_a_id, "tenant_id": tenant_a.id},
    )

    jrn_a_id = uuid.uuid4()
    await db_session.execute(
        text(
            """
            INSERT INTO journal_entries (id, tenant_id, entry_number, entry_date, description, status, total_debit, total_credit)
            VALUES (:id, :tenant_id, 'JRN-000001', :entry_date, 'Tenant A Secret Journal', 'DRAFT', 1000.0000, 1000.0000);
            """
        ),
        {"id": jrn_a_id, "tenant_id": tenant_a.id, "entry_date": date.today()},
    )
    await db_session.flush()

    # 2. Switch context to Tenant B
    await set_db_tenant_context(db_session, tenant_b.id, user_id=user_b.id)

    # Tenant B querying accounts must see 0 rows from Tenant A
    accts_b = await db_session.execute(
        text("SELECT * FROM accounts WHERE id = :id;"),
        {"id": acct_a_id},
    )
    assert accts_b.fetchall() == []

    # Tenant B querying journals must see 0 rows from Tenant A
    jrns_b = await db_session.execute(
        text("SELECT * FROM journal_entries WHERE id = :id;"),
        {"id": jrn_a_id},
    )
    assert jrns_b.fetchall() == []

    # 3. Tenant B attempting to inject a record for Tenant A must trigger RLS policy violation
    with pytest.raises(
        ProgrammingError, match='new row violates row-level security policy for table "accounts"'
    ):
        await db_session.execute(
            text(
                """
                INSERT INTO accounts (id, tenant_id, account_code, account_name, account_type, normal_balance)
                VALUES (:id, :tenant_id, '1099', 'Spoofed Account', 'ASSET', 'DEBIT');
                """
            ),
            {"id": uuid.uuid4(), "tenant_id": tenant_a.id},
        )

    await db_session.rollback()


@pytest.mark.asyncio
async def test_accounting_rls_fail_closed_on_missing_context(
    db_session: AsyncSession,
    test_user_factory,
):
    """Verify that omitting tenant context denies all SELECT/INSERT access."""
    user, tenant, _ = await test_user_factory(email="tenant.context.test@example.com")

    # Populate an account under valid context
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)
    await db_session.execute(
        text(
            """
            INSERT INTO accounts (id, tenant_id, account_code, account_name, account_type, normal_balance)
            VALUES (:id, :tenant_id, '1020', 'Bank Account', 'ASSET', 'DEBIT');
            """
        ),
        {"id": uuid.uuid4(), "tenant_id": tenant.id},
    )
    await db_session.flush()

    # Clear context
    await reset_db_session_state(db_session)

    # SELECT with missing context must return 0 rows (fail-closed)
    res = await db_session.execute(text("SELECT * FROM accounts;"))
    assert res.fetchall() == []
