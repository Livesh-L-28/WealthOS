"""Integration tests for double-entry journal reversal mechanics, mirror entries, and audit trail."""

from datetime import date
from decimal import Decimal

import pytest
from httpx import AsyncClient


@pytest.fixture
async def setup_accounts_and_post(client: AsyncClient, test_user_factory):
    user, tenant, token = await test_user_factory(email="reversal.flow@example.com")
    headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(tenant.id)}

    await client.post("/api/v1/accounting/accounts/seed", headers=headers)
    res_list = await client.get("/api/v1/accounting/accounts", headers=headers)
    accts = {a["account_code"]: a["id"] for a in res_list.json()}

    # Post an original entry: Rent payment INR 35,000
    res_post = await client.post(
        "/api/v1/accounting/journals/post-direct",
        headers=headers,
        json={
            "entry_date": str(date.today()),
            "description": "Monthly rent payment",
            "lines": [
                {
                    "account_id": accts["5010"],
                    "debit_amount": "35000.0000",
                    "credit_amount": "0.0000",
                },
                {
                    "account_id": accts["1020"],
                    "debit_amount": "0.0000",
                    "credit_amount": "35000.0000",
                },
            ],
        },
    )
    assert res_post.status_code == 201
    return user, tenant, headers, accts, res_post.json()


@pytest.mark.asyncio
async def test_reversal_mirror_and_bidirectional_links(
    client: AsyncClient, setup_accounts_and_post
):
    """Verify that reversing a journal creates an exact mirrored entry with bidirectional links."""
    user, tenant, headers, accts, original = setup_accounts_and_post
    orig_id = original["id"]

    # 1. Reverse the journal entry
    rev_res = await client.post(
        f"/api/v1/accounting/journals/{orig_id}/reverse",
        headers=headers,
        json={"reason": "Incorrect payment destination account"},
    )
    assert rev_res.status_code == 200
    reversal = rev_res.json()
    rev_id = reversal["id"]

    # 2. Check reversal properties
    assert reversal["status"] == "POSTED"
    assert reversal["reversal_of_entry_id"] == orig_id
    assert reversal["reversed_by_entry_id"] is None
    assert Decimal(reversal["total_debit"]) == Decimal(original["total_credit"])
    assert Decimal(reversal["total_credit"]) == Decimal(original["total_debit"])

    # 3. Check mirrored lines
    orig_lines = {line_item["account_id"]: line_item for line_item in original["lines"]}
    rev_lines = {line_item["account_id"]: line_item for line_item in reversal["lines"]}

    # In original: 5010 was debit 35000, 1020 was credit 35000
    # In reversal: 5010 must be credit 35000, 1020 must be debit 35000
    rent_orig = orig_lines[accts["5010"]]
    rent_rev = rev_lines[accts["5010"]]
    assert Decimal(rent_orig["debit_amount"]) == Decimal("35000.0000")
    assert Decimal(rent_rev["credit_amount"]) == Decimal("35000.0000")
    assert Decimal(rent_rev["debit_amount"]) == Decimal("0.0000")

    bank_orig = orig_lines[accts["1020"]]
    bank_rev = rev_lines[accts["1020"]]
    assert Decimal(bank_orig["credit_amount"]) == Decimal("35000.0000")
    assert Decimal(bank_rev["debit_amount"]) == Decimal("35000.0000")
    assert Decimal(bank_rev["credit_amount"]) == Decimal("0.0000")

    # 4. Check original journal entry status and link
    get_orig = await client.get(f"/api/v1/accounting/journals/{orig_id}", headers=headers)
    assert get_orig.status_code == 200
    orig_updated = get_orig.json()
    assert orig_updated["status"] == "REVERSED"
    assert orig_updated["reversed_by_entry_id"] == rev_id

    # 5. Attempt duplicate reversal on original entry (must be rejected)
    dup_res = await client.post(
        f"/api/v1/accounting/journals/{orig_id}/reverse",
        headers=headers,
        json={"reason": "Second reversal attempt"},
    )
    assert dup_res.status_code == 400
    dup_msg = dup_res.json().get("error", {}).get("message", "") or dup_res.json().get("detail", "")
    assert "already been reversed" in dup_msg.lower()

    # 6. Attempt to reverse the reversal entry itself (must be rejected)
    rev_dup = await client.post(
        f"/api/v1/accounting/journals/{rev_id}/reverse",
        headers=headers,
        json={"reason": "Attempting to reverse a reversal"},
    )
    assert rev_dup.status_code == 400
    rev_dup_msg = rev_dup.json().get("error", {}).get("message", "") or rev_dup.json().get(
        "detail", ""
    )
    assert "is itself a reversal" in rev_dup_msg.lower()

    # 7. Check account balances: rent expense net balance should be 0.0000!
    bal_res = await client.get(
        f"/api/v1/accounting/accounts/{accts['5010']}/balance", headers=headers
    )
    assert bal_res.status_code == 200
    rent_balance = bal_res.json()
    assert Decimal(rent_balance["balance"]) == Decimal("0.0000")
