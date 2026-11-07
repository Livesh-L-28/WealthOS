"""Integration tests for real-time balances, account ledgers, general ledger, and trial balance reports."""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient


@pytest.fixture
async def setup_accounts_and_activity(client: AsyncClient, test_user_factory):
    """Seed accounts and post multiple transactions across dates."""
    user, tenant, token = await test_user_factory(email="balance.test@example.com")
    headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(tenant.id)}

    await client.post("/api/v1/accounting/accounts/seed", headers=headers)
    res_list = await client.get("/api/v1/accounting/accounts", headers=headers)
    accts = {a["account_code"]: a["id"] for a in res_list.json()}

    t_minus_5 = date.today() - timedelta(days=5)
    t_minus_2 = date.today() - timedelta(days=2)
    today = date.today()

    # Txn 1 (t-5): Opening balance: Bank Dr 200,000, Equity Cr 200,000
    await client.post(
        "/api/v1/accounting/journals/post-direct",
        headers=headers,
        json={
            "entry_date": str(t_minus_5),
            "description": "Opening Capital",
            "lines": [
                {
                    "account_id": accts["1020"],
                    "debit_amount": "200000.0000",
                    "credit_amount": "0.0000",
                },
                {
                    "account_id": accts["3020"],
                    "debit_amount": "0.0000",
                    "credit_amount": "200000.0000",
                },
            ],
        },
    )

    # Txn 2 (t-2): Salary: Bank Dr 80,000, Salary Income Cr 80,000
    await client.post(
        "/api/v1/accounting/journals/post-direct",
        headers=headers,
        json={
            "entry_date": str(t_minus_2),
            "description": "Monthly Salary",
            "lines": [
                {
                    "account_id": accts["1020"],
                    "debit_amount": "80000.0000",
                    "credit_amount": "0.0000",
                },
                {
                    "account_id": accts["4010"],
                    "debit_amount": "0.0000",
                    "credit_amount": "80000.0000",
                },
            ],
        },
    )

    # Txn 3 (today): Groceries: Groceries Exp Dr 6,000, Bank Cr 6,000
    await client.post(
        "/api/v1/accounting/journals/post-direct",
        headers=headers,
        json={
            "entry_date": str(today),
            "description": "Groceries",
            "lines": [
                {
                    "account_id": accts["5020"],
                    "debit_amount": "6000.0000",
                    "credit_amount": "0.0000",
                },
                {
                    "account_id": accts["1020"],
                    "debit_amount": "0.0000",
                    "credit_amount": "6000.0000",
                },
            ],
        },
    )

    return user, tenant, headers, accts, t_minus_5, t_minus_2, today


@pytest.mark.asyncio
async def test_account_balances_debit_and_credit_normal(
    client: AsyncClient,
    setup_accounts_and_activity,
):
    """Verify that debit-normal and credit-normal accounts calculate positive balances appropriately."""
    user, tenant, headers, accts, _, _, _ = setup_accounts_and_activity

    # 1. Bank (1020 - ASSET - DEBIT normal)
    # Total debits = 200,000 + 80,000 = 280,000
    # Total credits = 6,000
    # Net Balance = 280,000 - 6,000 = 274,000
    res_bank = await client.get(
        f"/api/v1/accounting/accounts/{accts['1020']}/balance", headers=headers
    )
    assert res_bank.status_code == 200
    b_data = res_bank.json()
    assert Decimal(b_data["balance"]) == Decimal("274000.0000")
    assert Decimal(b_data["total_debit"]) == Decimal("280000.0000")
    assert Decimal(b_data["total_credit"]) == Decimal("6000.0000")

    # 2. Salary Income (4010 - INCOME - CREDIT normal)
    # Total credits = 80,000, debits = 0 -> Net Balance = 80,000
    res_sal = await client.get(
        f"/api/v1/accounting/accounts/{accts['4010']}/balance", headers=headers
    )
    assert res_sal.status_code == 200
    s_data = res_sal.json()
    assert Decimal(s_data["balance"]) == Decimal("80000.0000")

    # 3. Groceries Expense (5020 - EXPENSE - DEBIT normal)
    # Total debits = 6,000, credits = 0 -> Net Balance = 6,000
    res_groc = await client.get(
        f"/api/v1/accounting/accounts/{accts['5020']}/balance", headers=headers
    )
    assert res_groc.status_code == 200
    g_data = res_groc.json()
    assert Decimal(g_data["balance"]) == Decimal("6000.0000")


@pytest.mark.asyncio
async def test_account_ledger_with_running_and_opening_balances(
    client: AsyncClient,
    setup_accounts_and_activity,
):
    """Verify account ledger calculation with start_date opening balance and running balances."""
    user, tenant, headers, accts, t_minus_5, t_minus_2, today = setup_accounts_and_activity

    # Query ledger for Bank (1020) starting from t_minus_2 (excluding t_minus_5 opening balance from entries)
    res = await client.get(
        f"/api/v1/accounting/accounts/{accts['1020']}/ledger?start_date={t_minus_2}&end_date={today}",
        headers=headers,
    )
    assert res.status_code == 200
    ledger = res.json()

    # Opening balance strictly before t_minus_2 was txn 1: 200,000.0000
    assert Decimal(ledger["opening_balance"]) == Decimal("200000.0000")
    assert len(ledger["entries"]) == 2  # Txn 2 and Txn 3

    # Entry 1 (Salary): Dr 80,000 -> Running balance = 200,000 + 80,000 = 280,000
    e1 = ledger["entries"][0]
    assert Decimal(e1["debit_amount"]) == Decimal("80000.0000")
    assert Decimal(e1["running_balance"]) == Decimal("280000.0000")

    # Entry 2 (Groceries): Cr 6,000 -> Running balance = 280,000 - 6,000 = 274,000
    e2 = ledger["entries"][1]
    assert Decimal(e2["credit_amount"]) == Decimal("6000.0000")
    assert Decimal(e2["running_balance"]) == Decimal("274000.0000")

    # Closing balance
    assert Decimal(ledger["closing_balance"]) == Decimal("274000.0000")


@pytest.mark.asyncio
async def test_trial_balance_sigma_equality(
    client: AsyncClient,
    setup_accounts_and_activity,
):
    """Verify that Trial Balance satisfies Sigma(Debits) == Sigma(Credits)."""
    user, tenant, headers, _, _, _, _ = setup_accounts_and_activity

    res = await client.get("/api/v1/accounting/reports/trial-balance", headers=headers)
    assert res.status_code == 200
    tb = res.json()

    assert tb["is_balanced"] is True
    # Bank (274,000 Dr) + Groceries (6,000 Dr) = 280,000 Dr
    # Equity (200,000 Cr) + Salary (80,000 Cr) = 280,000 Cr
    assert Decimal(tb["total_debit"]) == Decimal("280000.0000")
    assert Decimal(tb["total_credit"]) == Decimal("280000.0000")
