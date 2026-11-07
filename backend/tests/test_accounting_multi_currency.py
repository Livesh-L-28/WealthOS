"""Integration tests for multi-currency transactions and functional currency conversions."""

from datetime import date
from decimal import Decimal

import pytest
from httpx import AsyncClient


@pytest.fixture
async def setup_accounts(client: AsyncClient, test_user_factory):
    user, tenant, token = await test_user_factory(email="multicurrency@example.com")
    headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(tenant.id)}

    await client.post("/api/v1/accounting/accounts/seed", headers=headers)
    res_list = await client.get("/api/v1/accounting/accounts", headers=headers)
    accts = {a["account_code"]: a["id"] for a in res_list.json()}
    return user, tenant, headers, accts


@pytest.mark.asyncio
async def test_usd_transaction_conversion_to_inr_functional(
    client: AsyncClient,
    setup_accounts,
):
    """Test purchase of US equities in USD converted to INR functional currency."""
    user, tenant, headers, accts = setup_accounts

    # Buy USD 1,000 of US Equities at USD/INR = 83.50000000
    # Dr. 1140 US Equities: USD 1000 @ 83.5 = INR 83500.0000
    # Cr. 1020 Savings Bank: INR 83500.0000 @ 1.0 = INR 83500.0000
    res = await client.post(
        "/api/v1/accounting/journals/post-direct",
        headers=headers,
        json={
            "entry_date": str(date.today()),
            "description": "US Stock Portfolio Purchase",
            "functional_currency": "INR",
            "lines": [
                {
                    "account_id": accts["1140"],
                    "debit_amount": "1000.0000",
                    "credit_amount": "0.0000",
                    "transaction_currency": "USD",
                    "transaction_amount": "1000.0000",
                    "exchange_rate": "83.50000000",
                },
                {
                    "account_id": accts["1020"],
                    "debit_amount": "0.0000",
                    "credit_amount": "83500.0000",
                    "transaction_currency": "INR",
                    "transaction_amount": "83500.0000",
                    "exchange_rate": "1.00000000",
                },
            ],
        },
    )
    assert res.status_code == 201
    entry = res.json()
    assert Decimal(entry["total_debit"]) == Decimal("83500.0000")
    assert Decimal(entry["total_credit"]) == Decimal("83500.0000")

    # Inspect line items
    usd_line = next(
        line_item for line_item in entry["lines"] if line_item["transaction_currency"] == "USD"
    )
    assert Decimal(usd_line["transaction_amount"]) == Decimal("1000.0000")
    assert Decimal(usd_line["exchange_rate"]) == Decimal("83.50000000")
    assert Decimal(usd_line["functional_debit_amount"]) == Decimal("83500.0000")

    inr_line = next(
        line_item for line_item in entry["lines"] if line_item["transaction_currency"] == "INR"
    )
    assert Decimal(inr_line["functional_credit_amount"]) == Decimal("83500.0000")
