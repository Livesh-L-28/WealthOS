"""Integration tests for external transaction reconciliation, matching, and discrepancies."""

from datetime import date
from decimal import Decimal

import pytest
from httpx import AsyncClient


@pytest.fixture
async def setup_accounts_and_postings(client: AsyncClient, test_user_factory):
    user, tenant, token = await test_user_factory(email="reconcile.flow@example.com")
    headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(tenant.id)}

    await client.post("/api/v1/accounting/accounts/seed", headers=headers)
    res_list = await client.get("/api/v1/accounting/accounts", headers=headers)
    accts = {a["account_code"]: a["id"] for a in res_list.json()}

    # Post an internal journal: Salary INR 70,000
    res_post = await client.post(
        "/api/v1/accounting/journals/post-direct",
        headers=headers,
        json={
            "entry_date": str(date.today()),
            "description": "Salary credited to bank",
            "lines": [
                {
                    "account_id": accts["1020"],
                    "debit_amount": "70000.0000",
                    "credit_amount": "0.0000",
                },
                {
                    "account_id": accts["4010"],
                    "debit_amount": "0.0000",
                    "credit_amount": "70000.0000",
                },
            ],
        },
    )
    assert res_post.status_code == 201
    journal = res_post.json()

    return user, tenant, headers, accts, journal


@pytest.mark.asyncio
async def test_reconciliation_lifecycle_match_and_discrepancy(
    client: AsyncClient,
    setup_accounts_and_postings,
):
    """Test ingest UNMATCHED -> match to posted journal -> MATCHED, and discrepancy reporting."""
    user, tenant, headers, accts, journal = setup_accounts_and_postings

    # 1. Ingest external bank statement line: INR 70,000 (Exact Match)
    rec1_res = await client.post(
        "/api/v1/accounting/reconciliation",
        headers=headers,
        json={
            "account_id": accts["1020"],
            "source_reference": "BANK-UTR-20261107-001",
            "expected_amount": "70000.0000",
            "currency_code": "INR",
        },
    )
    assert rec1_res.status_code == 201
    rec1 = rec1_res.json()
    assert rec1["status"] == "UNMATCHED"
    rec1_id = rec1["id"]

    # 2. Match rec1 against internal journal
    match1_res = await client.post(
        f"/api/v1/accounting/reconciliation/{rec1_id}/match",
        headers=headers,
        json={"journal_entry_id": journal["id"], "notes": "Bank statement UTR verified"},
    )
    assert match1_res.status_code == 200
    matched1 = match1_res.json()
    assert matched1["status"] == "MATCHED"
    assert matched1["journal_entry_id"] == journal["id"]
    assert Decimal(matched1["posted_amount"]) == Decimal("70000.0000")

    # 3. Ingest external statement with amount mismatch (e.g. INR 68,000)
    rec2_res = await client.post(
        "/api/v1/accounting/reconciliation",
        headers=headers,
        json={
            "account_id": accts["1020"],
            "source_reference": "BANK-UTR-20261107-002",
            "expected_amount": "68000.0000",
            "currency_code": "INR",
        },
    )
    assert rec2_res.status_code == 201
    rec2_id = rec2_res.json()["id"]

    # Match rec2 against same journal (70,000 vs 68,000)
    match2_res = await client.post(
        f"/api/v1/accounting/reconciliation/{rec2_id}/match",
        headers=headers,
        json={"journal_entry_id": journal["id"], "notes": "TDS deduction difference"},
    )
    assert match2_res.status_code == 200
    matched2 = match2_res.json()
    assert matched2["status"] == "PARTIALLY_MATCHED"
    assert "amount mismatch" in matched2["discrepancy_reason"].lower()

    # 4. Explicitly flag an external record as DISCREPANCY
    rec3_res = await client.post(
        "/api/v1/accounting/reconciliation",
        headers=headers,
        json={
            "account_id": accts["1020"],
            "source_reference": "BANK-UNKNOWN-CHARGE-99",
            "expected_amount": "1500.0000",
            "currency_code": "INR",
        },
    )
    assert rec3_res.status_code == 201
    rec3_id = rec3_res.json()["id"]

    disc_res = await client.post(
        f"/api/v1/accounting/reconciliation/{rec3_id}/discrepancy",
        headers=headers,
        json={
            "discrepancy_reason": "Unrecognized debit charge in bank statement, bank ticket #4412"
        },
    )
    assert disc_res.status_code == 200
    assert disc_res.json()["status"] == "DISCREPANCY"
