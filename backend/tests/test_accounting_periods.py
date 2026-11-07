"""Integration tests for accounting period closures, out-of-period blocking, and administrative reopening."""

from datetime import date

import pytest
from httpx import AsyncClient


@pytest.fixture
async def setup_accounts_and_periods(client: AsyncClient, test_user_factory):
    user, tenant, token = await test_user_factory(email="period.control@example.com")
    headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(tenant.id)}

    await client.post("/api/v1/accounting/accounts/seed", headers=headers)
    res_list = await client.get("/api/v1/accounting/accounts", headers=headers)
    accts = {a["account_code"]: a["id"] for a in res_list.json()}
    return user, tenant, headers, accts


@pytest.mark.asyncio
async def test_closed_period_blocks_postings_and_reopen_allows(
    client: AsyncClient,
    setup_accounts_and_periods,
):
    """Verify that a closed accounting period blocks backdated postings until reopened."""
    user, tenant, headers, accts = setup_accounts_and_periods

    period_start = date(2025, 1, 1)
    period_end = date(2025, 1, 31)
    target_date = date(2025, 1, 15)

    # 1. Create period for January 2025
    create_p_res = await client.post(
        "/api/v1/accounting/periods",
        headers=headers,
        json={
            "period_name": "FY2025-01-JAN",
            "start_date": str(period_start),
            "end_date": str(period_end),
        },
    )
    assert create_p_res.status_code == 201
    period = create_p_res.json()
    period_id = period["id"]
    assert period["status"] == "OPEN"

    # 2. Close the period
    close_res = await client.post(
        f"/api/v1/accounting/periods/{period_id}/close",
        headers=headers,
        json={"reason": "Monthly audit closure completed"},
    )
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "CLOSED"

    # 3. Attempt to post a journal entry with date inside the closed period
    txn_payload = {
        "entry_date": str(target_date),
        "description": "Late expense submission",
        "lines": [
            {"account_id": accts["5010"], "debit_amount": "15000.0000", "credit_amount": "0.0000"},
            {"account_id": accts["1020"], "debit_amount": "0.0000", "credit_amount": "15000.0000"},
        ],
    }
    block_res = await client.post(
        "/api/v1/accounting/journals/post-direct", headers=headers, json=txn_payload
    )
    assert block_res.status_code == 400
    msg = block_res.json().get("error", {}).get("message", "") or block_res.json().get("detail", "")
    assert "period is closed" in msg.lower() or "closed accounting period" in msg.lower()

    # 4. Reopen the period with mandatory justification
    reopen_res = await client.post(
        f"/api/v1/accounting/periods/{period_id}/reopen",
        headers=headers,
        json={"reason": "Authorized adjustment by financial controller"},
    )
    assert reopen_res.status_code == 200
    assert reopen_res.json()["status"] == "OPEN"

    # 5. Retry posting: now succeeds!
    success_res = await client.post(
        "/api/v1/accounting/journals/post-direct", headers=headers, json=txn_payload
    )
    assert success_res.status_code == 201
    assert success_res.json()["status"] == "POSTED"
