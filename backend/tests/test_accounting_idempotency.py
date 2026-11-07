"""Integration tests for durable idempotency keys and payload conflict protection."""

from datetime import date

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenant_context import set_db_tenant_context
from app.domains.accounting.models.journal_entry import JournalEntry


@pytest.fixture
async def setup_accounts(client: AsyncClient, test_user_factory):
    user, tenant, token = await test_user_factory(email="idempotent.flow@example.com")
    headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(tenant.id)}

    await client.post("/api/v1/accounting/accounts/seed", headers=headers)
    res_list = await client.get("/api/v1/accounting/accounts", headers=headers)
    accts = {a["account_code"]: a["id"] for a in res_list.json()}
    return user, tenant, headers, accts


@pytest.mark.asyncio
async def test_idempotent_replay_and_mismatch_conflict(
    client: AsyncClient,
    db_session: AsyncSession,
    setup_accounts,
):
    """Test idempotent replay returns same entry without duplication; mismatched payload returns HTTP 409."""
    user, tenant, headers, accts = setup_accounts
    idempotency_key = "TXN-IDEMP-TEST-999"

    payload1 = {
        "entry_date": str(date.today()),
        "description": "Salary transaction",
        "idempotency_key": idempotency_key,
        "lines": [
            {"account_id": accts["1020"], "debit_amount": "90000.0000", "credit_amount": "0.0000"},
            {"account_id": accts["4010"], "debit_amount": "0.0000", "credit_amount": "90000.0000"},
        ],
    }

    # 1. First execution
    res1 = await client.post(
        "/api/v1/accounting/journals/post-direct", headers=headers, json=payload1
    )
    assert res1.status_code == 201
    entry1 = res1.json()
    entry1_id = entry1["id"]

    # 2. Replay with identical payload and key (must return same entry)
    res2 = await client.post(
        "/api/v1/accounting/journals/post-direct", headers=headers, json=payload1
    )
    assert res2.status_code == 201
    entry2 = res2.json()
    assert entry2["id"] == entry1_id

    # 3. Verify exactly 1 journal entry exists in database
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)
    count_stmt = select(func.count(JournalEntry.id)).where(JournalEntry.tenant_id == tenant.id)
    count_res = await db_session.execute(count_stmt)
    assert count_res.scalar_one() == 1

    # 4. Attempt replay with SAME key but ALTERED amount (must return HTTP 409 Conflict)
    payload_mismatch = {
        "entry_date": str(date.today()),
        "description": "Salary transaction altered",
        "idempotency_key": idempotency_key,
        "lines": [
            {"account_id": accts["1020"], "debit_amount": "95000.0000", "credit_amount": "0.0000"},
            {"account_id": accts["4010"], "debit_amount": "0.0000", "credit_amount": "95000.0000"},
        ],
    }
    res3 = await client.post(
        "/api/v1/accounting/journals/post-direct", headers=headers, json=payload_mismatch
    )
    assert res3.status_code == 409
    msg3 = res3.json().get("error", {}).get("message", "") or res3.json().get("detail", "")
    assert "already used with different" in msg3.lower() or "already used" in msg3.lower()
