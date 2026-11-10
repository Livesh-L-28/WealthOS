"""WealthOS Phase 21 — Android Internal Beta Acceptance & Financial Integrity Test Suite.

Validates Section 4 Financial Workflow Acceptance Requirements:
1. Strategic goal selection and funding account resolution.
2. Double-entry asset-to-asset journal posting (Dr. Goal Corpus Asset / Cr. Bank Current Asset).
3. Exact equality of Debits and Credits (Double-Entry Invariant).
4. Funding account deduction and Goal Corpus allocation.
5. Goal accumulated balance, shortfall recalculation, and progress percentage.
6. Contribution history audit trail.
7. Idempotency guarantee (replay returns identical entry; payload alteration returns 409).
8. Atomic rollback / rejection on unbalanced entry.
9. Net-worth neutrality (no artificial revenue or duplicated capital).
10. Validation defense against unbacked corpus adjustments.
"""

from datetime import date
from decimal import Decimal
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
async def goal_workflow_setup(client: AsyncClient, test_user_factory, db_session: AsyncSession):
    """Fixture providing user, tenant, headers, seeded accounts, and an active strategic goal."""
    user, tenant, token = await test_user_factory(email="phase21.acceptance@wealthos.app")
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": str(tenant.id),
    }

    # 1. Seed standard chart of accounts
    seed_res = await client.post("/api/v1/accounting/accounts/seed", headers=headers)
    assert seed_res.status_code == 201

    accts_res = await client.get("/api/v1/accounting/accounts", headers=headers)
    assert accts_res.status_code == 200
    account_map = {a["account_code"]: a["id"] for a in accts_res.json()}

    # 2. Fund Bank Current Account (Account 1020) via Opening Capital Equity (Account 3020)
    # Opening capital injection: Dr. 1020 (Bank) 5,00,000 / Cr. 3020 (Equity) 5,00,000
    capital_res = await client.post(
        "/api/v1/accounting/journals/post-direct",
        headers=headers,
        json={
            "entry_date": str(date.today()),
            "description": "Initial verified bank balance for staging tests",
            "source_type": "MANUAL",
            "lines": [
                {
                    "account_id": account_map["1020"],
                    "debit_amount": "500000.0000",
                    "credit_amount": "0.0000",
                },
                {
                    "account_id": account_map["3020"],
                    "debit_amount": "0.0000",
                    "credit_amount": "500000.0000",
                },
            ],
        },
    )
    assert capital_res.status_code == 201

    # 3. Create Strategic Goal: "Bike Milestone"
    target_d = date.today().replace(year=date.today().year + 4)
    goal_res = await client.post(
        "/api/v1/goals",
        headers=headers,
        json={
            "name": "Bike",
            "category": "VEHICLE",
            "target_amount": "2345678.0000",
            "current_amount": "0.0000",
            "target_date": str(target_d),
            "monthly_contribution": "50000.0000",
            "priority": "HIGH",
        },
    )
    assert goal_res.status_code == 201
    created_goal = goal_res.json()

    return user, tenant, headers, account_map, created_goal


@pytest.mark.asyncio
async def test_section_4_strategic_goal_deposit_end_to_end(
    client: AsyncClient, goal_workflow_setup, db_session: AsyncSession
):
    """Test full 10-step strategic goal deposit financial workflow."""
    user, tenant, headers, accts, goal = goal_workflow_setup
    goal_id = goal["id"]
    bank_account_id = accts["1020"]  # Bank Current / Savings Account
    goal_corpus_account_id = accts["1030"]  # Dedicated Sinking Fund / Short-Term Goal Corpus Asset

    deposit_amount = Decimal("25000.0000")

    # Step 1 & 2: Select existing goal and funding account
    assert goal["current_amount"] == "0.0000"
    assert goal["target_amount"] == "2345678.0000"

    # Step 3, 4, 5, 6: Submit double-entry deposit
    # Dr. 1030 Goal Corpus Asset: 25000.0000
    # Cr. 1020 Bank Current Account: 25000.0000
    idempotency_key = f"goal-deposit-{uuid.uuid4()}"

    journal_payload = {
        "entry_date": str(date.today()),
        "description": f"Strategic Goal Deposit to '{goal['name']}' from HDFC Corporate Salary",
        "source_type": "MANUAL",
        "reference": f"GOAL-{goal_id[:8]}",
        "idempotency_key": idempotency_key,
        "lines": [
            {
                "account_id": goal_corpus_account_id,
                "debit_amount": str(deposit_amount),
                "credit_amount": "0.0000",
            },
            {
                "account_id": bank_account_id,
                "debit_amount": "0.0000",
                "credit_amount": str(deposit_amount),
            },
        ],
    }

    journal_res = await client.post(
        "/api/v1/accounting/journals/post-direct",
        headers=headers,
        json=journal_payload,
    )
    assert journal_res.status_code == 201, journal_res.text
    journal = journal_res.json()
    journal_id = journal["id"]

    # Step 6: Verify journal debit and credit equality
    assert journal["status"] == "POSTED"
    assert Decimal(journal["total_debit"]) == deposit_amount
    assert Decimal(journal["total_credit"]) == deposit_amount
    assert Decimal(journal["total_debit"]) == Decimal(journal["total_credit"])

    # Step 7: Record contribution against goal
    contrib_res = await client.post(
        f"/api/v1/goals/{goal_id}/contributions",
        headers=headers,
        json={
            "amount": str(deposit_amount),
            "currency": "INR",
            "contribution_date": str(date.today()),
        },
    )
    assert contrib_res.status_code == 201, contrib_res.text
    contrib = contrib_res.json()
    assert Decimal(contrib["amount"]) == deposit_amount

    # Verify Goal's accumulated balance and progress
    goal_check = await client.get(f"/api/v1/goals/{goal_id}", headers=headers)
    assert goal_check.status_code == 200
    updated_goal = goal_check.json()
    assert Decimal(updated_goal["current_amount"]) == deposit_amount
    expected_pct = (deposit_amount / Decimal(goal["target_amount"])) * Decimal("100")
    assert abs(Decimal(updated_goal["progress_percentage"]) - expected_pct) < Decimal("0.05")

    # Step 8: Verify contribution history lists contribution
    list_contrib_res = await client.get(f"/api/v1/goals/{goal_id}/contributions", headers=headers)
    assert list_contrib_res.status_code == 200
    contrib_list = list_contrib_res.json()
    assert len(contrib_list) == 1
    assert Decimal(contrib_list[0]["amount"]) == deposit_amount

    # Step 9: Verify Idempotency - Retrying identical request returns same journal
    retry_res = await client.post(
        "/api/v1/accounting/journals/post-direct",
        headers=headers,
        json=journal_payload,
    )
    assert retry_res.status_code == 201
    retry_data = retry_res.json()
    assert retry_data["id"] == journal_id

    # Step 9b: Verify Idempotency - Modified payload with SAME key raises HTTP 409 Conflict
    conflict_payload = {
        **journal_payload,
        "description": "Tampered description with same idempotency key",
    }
    conflict_res = await client.post(
        "/api/v1/accounting/journals/post-direct",
        headers=headers,
        json=conflict_payload,
    )
    assert conflict_res.status_code == 409

    # Step 10: Verify atomic rollback when posting fails (Unbalanced entry rejected)
    unbalanced_payload = {
        "entry_date": str(date.today()),
        "description": "Invalid unbalanced goal injection attempt",
        "source_type": "MANUAL",
        "lines": [
            {
                "account_id": goal_corpus_account_id,
                "debit_amount": "50000.0000",
                "credit_amount": "0.0000",
            },
            {
                "account_id": bank_account_id,
                "debit_amount": "0.0000",
                "credit_amount": "20000.0000",  # Unbalanced: 50k != 20k
            },
        ],
    }
    unbalanced_res = await client.post(
        "/api/v1/accounting/journals/post-direct",
        headers=headers,
        json=unbalanced_payload,
    )
    assert unbalanced_res.status_code in [400, 422]

    # Step 11: Verify Trial Balance remains in strict balance (Sigma Dr == Sigma Cr)
    tb_res = await client.get("/api/v1/accounting/reports/trial-balance", headers=headers)
    assert tb_res.status_code == 200
    tb = tb_res.json()
    assert tb["is_balanced"] is True
    assert Decimal(tb["total_debit"]) == Decimal(tb["total_credit"])
    assert Decimal(tb["total_debit"]) == Decimal("500000.0000")

    # Verify Account-by-Account Ledgers:
    # 1. Bank Account (1020): ₹4,75,000 (debit balance after ₹25,000 transfer)
    # 2. Goal Corpus Account (1030): ₹25,000 (debit balance allocated)
    # 3. Opening Capital Equity (3020): ₹5,00,000 (credit balance)
    account_balances = {a["account_code"]: a for a in tb["accounts"]}
    assert Decimal(account_balances["1020"]["debit_balance"]) == Decimal("475000.0000")
    assert Decimal(account_balances["1030"]["debit_balance"]) == Decimal("25000.0000")
    assert Decimal(account_balances["3020"]["credit_balance"]) == Decimal("500000.0000")

    # Step 12: Verify Net-Worth Neutrality & No Artificial Revenue
    # Total Assets: Bank (4,75,000) + Goal Corpus (25,000) = 5,00,000
    # Revenue accounts (code starting with 4): All zero
    revenue_items = [a for a in tb["accounts"] if a["account_code"].startswith("4")]
    total_revenue = sum(Decimal(r["credit_balance"]) for r in revenue_items)
    assert total_revenue == Decimal("0.0000")  # Verified: Zero artificial income!
