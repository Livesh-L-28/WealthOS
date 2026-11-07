"""Integration tests verifying database-level immutability triggers on posted journals and lines."""

from datetime import date

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenant_context import set_db_tenant_context


@pytest.fixture
async def posted_journal_and_lines(client: AsyncClient, test_user_factory):
    """Seed accounts and create a POSTED double-entry journal entry."""
    user, tenant, token = await test_user_factory(email="immutable.ledger@example.com")
    headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(tenant.id)}

    await client.post("/api/v1/accounting/accounts/seed", headers=headers)
    res_list = await client.get("/api/v1/accounting/accounts", headers=headers)
    accts = {a["account_code"]: a["id"] for a in res_list.json()}

    post_res = await client.post(
        "/api/v1/accounting/journals/post-direct",
        headers=headers,
        json={
            "entry_date": str(date.today()),
            "description": "Original tamper-proof entry",
            "lines": [
                {
                    "account_id": accts["1020"],
                    "debit_amount": "12000.0000",
                    "credit_amount": "0.0000",
                },
                {
                    "account_id": accts["4010"],
                    "debit_amount": "0.0000",
                    "credit_amount": "12000.0000",
                },
            ],
        },
    )
    assert post_res.status_code == 201
    journal_data = post_res.json()
    return user, tenant, journal_data


@pytest.mark.asyncio
async def test_database_trigger_blocks_update_on_posted_journal_entry(
    db_session: AsyncSession,
    posted_journal_and_lines,
):
    """Verify that PostgreSQL trigger trg_journal_entries_immutable blocks UPDATE on posted entry."""
    user, tenant, journal = posted_journal_and_lines
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    with pytest.raises(
        DBAPIError, match="Posted or reversed journal entries are immutable and cannot be modified"
    ):
        await db_session.execute(
            text("UPDATE journal_entries SET description = 'tampered' WHERE id = :id"),
            {"id": journal["id"]},
        )


@pytest.mark.asyncio
async def test_database_trigger_blocks_delete_on_posted_journal_entry(
    db_session: AsyncSession,
    posted_journal_and_lines,
):
    """Verify that PostgreSQL trigger trg_journal_entries_immutable blocks DELETE on posted entry."""
    user, tenant, journal = posted_journal_and_lines
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    with pytest.raises(
        DBAPIError, match="Posted or reversed journal entries are immutable and cannot be deleted"
    ):
        await db_session.execute(
            text("DELETE FROM journal_entries WHERE id = :id"),
            {"id": journal["id"]},
        )


@pytest.mark.asyncio
async def test_database_trigger_blocks_line_modification_on_posted_journal(
    db_session: AsyncSession,
    posted_journal_and_lines,
):
    """Verify that PostgreSQL trigger trg_journal_lines_immutable blocks UPDATE and DELETE on lines."""
    user, tenant, journal = posted_journal_and_lines
    tenant_id = tenant.id
    user_id = user.id
    await set_db_tenant_context(db_session, tenant_id, user_id=user_id)
    line_id = journal["lines"][0]["id"]

    # Attempt UPDATE on line
    with pytest.raises(
        DBAPIError, match="Cannot insert or modify journal lines for a posted or reversed entry"
    ):
        await db_session.execute(
            text("UPDATE journal_lines SET debit_amount = 99999.0000 WHERE id = :id"),
            {"id": line_id},
        )

    # Rollback the aborted transaction so we can test DELETE
    await db_session.rollback()
    await set_db_tenant_context(db_session, tenant_id, user_id=user_id)

    # Attempt DELETE on line
    with pytest.raises(
        DBAPIError, match="Cannot delete journal lines belonging to a posted or reversed entry"
    ):
        await db_session.execute(
            text("DELETE FROM journal_lines WHERE id = :id"),
            {"id": line_id},
        )
