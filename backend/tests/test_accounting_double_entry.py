"""Comprehensive tests for Double-Entry Journal Scenarios A through G and double-entry invariants."""

from datetime import date
from decimal import Decimal

import pytest
from httpx import AsyncClient


@pytest.fixture
async def seeded_accounts(client: AsyncClient, test_user_factory):
    """Fixture providing user, tenant, token, headers, and seeded accounts mapped by code."""
    user, tenant, token = await test_user_factory(email="double.entry@example.com")
    headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(tenant.id)}

    res = await client.post("/api/v1/accounting/accounts/seed", headers=headers)
    assert res.status_code == 201

    res_list = await client.get("/api/v1/accounting/accounts", headers=headers)
    assert res_list.status_code == 200
    account_map = {a["account_code"]: a["id"] for a in res_list.json()}
    return user, tenant, headers, account_map


@pytest.mark.asyncio
async def test_scenarios_a_through_g(client: AsyncClient, seeded_accounts):
    """Test all canonical personal wealth double-entry scenarios A through G."""
    user, tenant, headers, accts = seeded_accounts

    # =========================================================================
    # SCENARIO A: Initial Capital Injection / Opening Balance (INR 1,00,000)
    # Dr. 1020 Primary Savings Account: 100000.0000
    # Cr. 3020 Opening Balance Equity:   100000.0000
    # =========================================================================
    res_a = await client.post(
        "/api/v1/accounting/journals/post-direct",
        headers=headers,
        json={
            "entry_date": str(date.today()),
            "description": "Opening capital balance",
            "source_type": "MANUAL",
            "lines": [
                {
                    "account_id": accts["1020"],
                    "debit_amount": "100000.0000",
                    "credit_amount": "0.0000",
                },
                {
                    "account_id": accts["3020"],
                    "debit_amount": "0.0000",
                    "credit_amount": "100000.0000",
                },
            ],
        },
    )
    assert res_a.status_code == 201
    entry_a = res_a.json()
    assert entry_a["status"] == "POSTED"
    assert Decimal(entry_a["total_debit"]) == Decimal("100000.0000")
    assert Decimal(entry_a["total_credit"]) == Decimal("100000.0000")

    # =========================================================================
    # SCENARIO B: Salary Receipt (INR 75,000)
    # Dr. 1020 Primary Savings Account: 75000.0000
    # Cr. 4010 Salary & Compensation:   75000.0000
    # =========================================================================
    res_b = await client.post(
        "/api/v1/accounting/journals/post-direct",
        headers=headers,
        json={
            "entry_date": str(date.today()),
            "description": "Monthly salary credited",
            "source_type": "PAYROLL",
            "lines": [
                {
                    "account_id": accts["1020"],
                    "debit_amount": "75000.0000",
                    "credit_amount": "0.0000",
                },
                {
                    "account_id": accts["4010"],
                    "debit_amount": "0.0000",
                    "credit_amount": "75000.0000",
                },
            ],
        },
    )
    assert res_b.status_code == 201
    entry_b = res_b.json()
    assert Decimal(entry_b["total_debit"]) == Decimal("75000.0000")

    # =========================================================================
    # SCENARIO C: Living Expense / Groceries (INR 4,500)
    # Dr. 5020 Groceries & Household: 4500.0000
    # Cr. 1020 Primary Savings Account: 4500.0000
    # =========================================================================
    res_c = await client.post(
        "/api/v1/accounting/journals/post-direct",
        headers=headers,
        json={
            "entry_date": str(date.today()),
            "description": "Supermarket groceries",
            "source_type": "UPI",
            "lines": [
                {
                    "account_id": accts["5020"],
                    "debit_amount": "4500.0000",
                    "credit_amount": "0.0000",
                },
                {
                    "account_id": accts["1020"],
                    "debit_amount": "0.0000",
                    "credit_amount": "4500.0000",
                },
            ],
        },
    )
    assert res_c.status_code == 201
    entry_c = res_c.json()
    assert Decimal(entry_c["total_debit"]) == Decimal("4500.0000")

    # =========================================================================
    # SCENARIO D: Inter-Account Transfer (Fixed Deposit Booking INR 50,000)
    # Dr. 1030 Fixed Deposits:           50000.0000
    # Cr. 1020 Primary Savings Account:  50000.0000
    # =========================================================================
    res_d = await client.post(
        "/api/v1/accounting/journals/post-direct",
        headers=headers,
        json={
            "entry_date": str(date.today()),
            "description": "Fixed deposit booking",
            "source_type": "INTERNAL_TRANSFER",
            "lines": [
                {
                    "account_id": accts["1030"],
                    "debit_amount": "50000.0000",
                    "credit_amount": "0.0000",
                },
                {
                    "account_id": accts["1020"],
                    "debit_amount": "0.0000",
                    "credit_amount": "50000.0000",
                },
            ],
        },
    )
    assert res_d.status_code == 201
    entry_d = res_d.json()
    assert Decimal(entry_d["total_debit"]) == Decimal("50000.0000")

    # =========================================================================
    # SCENARIO E: Loan Disbursement (Personal Loan INR 2,00,000)
    # Dr. 1020 Primary Savings Account: 200000.0000
    # Cr. 2130 Personal Loan Liability: 200000.0000
    # =========================================================================
    res_e = await client.post(
        "/api/v1/accounting/journals/post-direct",
        headers=headers,
        json={
            "entry_date": str(date.today()),
            "description": "Personal loan disbursement",
            "source_type": "LOAN",
            "lines": [
                {
                    "account_id": accts["1020"],
                    "debit_amount": "200000.0000",
                    "credit_amount": "0.0000",
                },
                {
                    "account_id": accts["2130"],
                    "debit_amount": "0.0000",
                    "credit_amount": "200000.0000",
                },
            ],
        },
    )
    assert res_e.status_code == 201
    entry_e = res_e.json()
    assert Decimal(entry_e["total_debit"]) == Decimal("200000.0000")

    # =========================================================================
    # SCENARIO F: Loan EMI Repayment (Principal INR 8,000 + Interest INR 2,000 = INR 10,000)
    # Dr. 2130 Personal Loan:           8000.0000
    # Dr. 5210 Loan Interest Expense:   2000.0000
    # Cr. 1020 Primary Savings Account: 10000.0000
    # =========================================================================
    res_f = await client.post(
        "/api/v1/accounting/journals/post-direct",
        headers=headers,
        json={
            "entry_date": str(date.today()),
            "description": "Monthly EMI payment",
            "source_type": "AUTO_DEBIT",
            "lines": [
                {
                    "account_id": accts["2130"],
                    "debit_amount": "8000.0000",
                    "credit_amount": "0.0000",
                },
                {
                    "account_id": accts["5210"],
                    "debit_amount": "2000.0000",
                    "credit_amount": "0.0000",
                },
                {
                    "account_id": accts["1020"],
                    "debit_amount": "0.0000",
                    "credit_amount": "10000.0000",
                },
            ],
        },
    )
    assert res_f.status_code == 201
    entry_f = res_f.json()
    assert Decimal(entry_f["total_debit"]) == Decimal("10000.0000")
    assert Decimal(entry_f["total_credit"]) == Decimal("10000.0000")
    assert len(entry_f["lines"]) == 3

    # =========================================================================
    # SCENARIO G: Investment Purchase (Mutual Funds INR 25,000)
    # Dr. 1120 Mutual Funds (Equity):   25000.0000
    # Cr. 1020 Primary Savings Account: 25000.0000
    # =========================================================================
    res_g = await client.post(
        "/api/v1/accounting/journals/post-direct",
        headers=headers,
        json={
            "entry_date": str(date.today()),
            "description": "SIP Mutual Fund Purchase",
            "source_type": "SIP",
            "lines": [
                {
                    "account_id": accts["1120"],
                    "debit_amount": "25000.0000",
                    "credit_amount": "0.0000",
                },
                {
                    "account_id": accts["1020"],
                    "debit_amount": "0.0000",
                    "credit_amount": "25000.0000",
                },
            ],
        },
    )
    assert res_g.status_code == 201
    entry_g = res_g.json()
    assert Decimal(entry_g["total_debit"]) == Decimal("25000.0000")

    # Verify Trial Balance remains perfectly balanced!
    res_tb = await client.get("/api/v1/accounting/reports/trial-balance", headers=headers)
    assert res_tb.status_code == 200
    tb = res_tb.json()
    assert tb["is_balanced"] is True
    assert Decimal(tb["total_debit"]) == Decimal(tb["total_credit"])


@pytest.mark.asyncio
async def test_unbalanced_journal_rejected(client: AsyncClient, seeded_accounts):
    """Verify that any journal where total debit != total credit is rejected with HTTP 400."""
    _, _, headers, accts = seeded_accounts

    res = await client.post(
        "/api/v1/accounting/journals",
        headers=headers,
        json={
            "entry_date": str(date.today()),
            "description": "Unbalanced journal attempt",
            "lines": [
                {
                    "account_id": accts["1020"],
                    "debit_amount": "5000.0000",
                    "credit_amount": "0.0000",
                },
                {
                    "account_id": accts["5010"],
                    "debit_amount": "0.0000",
                    "credit_amount": "4000.0000",
                },
            ],
        },
    )
    assert res.status_code == 400
    msg = res.json().get("error", {}).get("message", "") or res.json().get("detail", "")
    assert "unbalanced" in msg.lower()


@pytest.mark.asyncio
async def test_single_sided_amount_constraint(client: AsyncClient, seeded_accounts):
    """Verify that a line cannot have both debit and credit or neither."""
    _, _, headers, accts = seeded_accounts

    # Both debit and credit
    res1 = await client.post(
        "/api/v1/accounting/journals",
        headers=headers,
        json={
            "entry_date": str(date.today()),
            "description": "Dual sided line",
            "lines": [
                {
                    "account_id": accts["1020"],
                    "debit_amount": "1000.0000",
                    "credit_amount": "1000.0000",
                },
                {
                    "account_id": accts["5010"],
                    "debit_amount": "0.0000",
                    "credit_amount": "1000.0000",
                },
            ],
        },
    )
    assert res1.status_code == 400
    msg1 = res1.json().get("error", {}).get("message", "") or res1.json().get("detail", "")
    assert "cannot have both debit" in msg1.lower()

    # Zero amount on both sides
    res2 = await client.post(
        "/api/v1/accounting/journals",
        headers=headers,
        json={
            "entry_date": str(date.today()),
            "description": "Zero line",
            "lines": [
                {"account_id": accts["1020"], "debit_amount": "0.0000", "credit_amount": "0.0000"},
                {"account_id": accts["5010"], "debit_amount": "0.0000", "credit_amount": "0.0000"},
            ],
        },
    )
    assert res2.status_code == 400
    msg2 = res2.json().get("error", {}).get("message", "") or res2.json().get("detail", "")
    assert "positive debit or credit" in msg2.lower()
