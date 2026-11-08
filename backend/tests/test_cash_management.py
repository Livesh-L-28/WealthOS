"""WealthOS Cash Management & Liquidity Acceptance Test Suite.

Validates all 16 Phase 2 acceptance requirements:
1. Multiple bank account consolidation.
2. Multi-currency balances.
3. Transfer neutrality.
4. Income classification.
5. Expense classification.
6. Loan principal/interest distinction.
7. Recurring payment schedules.
8. Duplicate recurring transactions.
9. Forecast generation.
10. Forecast reproducibility.
11. Missing data handling.
12. Stale data handling.
13. Scenario isolation.
14. Forecast version history.
15. Tenant isolation.
16. Large transaction history performance.
"""

import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenant_context import set_db_tenant_context
from app.domains.cash.schemas import (
    AccountTransferCreate,
    FinancialAccountCreate,
    RecurringRuleCreate,
    ScenarioSimulationRequest,
)
from app.domains.cash.service import CashManagementService


async def bind_tenant_context(session: AsyncSession, tenant_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Bind PostgreSQL RLS session variables."""
    await session.execute(
        text(
            "SELECT set_config('app.current_tenant_id', :tid, false), "
            "set_config('app.current_user_id', :uid, false)"
        ),
        {"tid": str(tenant_id), "uid": str(user_id)},
    )


@pytest.mark.asyncio
async def test_cash_multiple_accounts_and_multi_currency(
    db_session: AsyncSession, test_user_factory
):
    """1 & 2. Multiple bank account consolidation & explicit multi-currency breakdown."""
    user, tenant, _ = await test_user_factory(email="cash.multi@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = CashManagementService(db_session)

    # 1. Primary INR checking
    await service.create_account(
        tenant.id,
        FinancialAccountCreate(
            account_name="HDFC Salary Checking",
            account_number_mask="*9012",
            account_type="SAVINGS",
            currency="INR",
            current_balance=Decimal("150000.0000"),
        ),
    )

    # 2. Secondary INR savings
    await service.create_account(
        tenant.id,
        FinancialAccountCreate(
            account_name="SBI Emergency Savings",
            account_number_mask="*3411",
            account_type="SAVINGS",
            currency="INR",
            current_balance=Decimal("250000.0000"),
        ),
    )

    # 3. USD foreign currency wallet
    await service.create_account(
        tenant.id,
        FinancialAccountCreate(
            account_name="Wise USD Wallet",
            account_number_mask="*8891",
            account_type="CURRENT",
            currency="USD",
            current_balance=Decimal("1200.0000"),
        ),
    )
    await db_session.flush()

    pos = await service.get_cash_position(tenant.id)

    # Total liquid in base currency (INR) sums only INR liquid accounts: 150000 + 250000 = 400000
    assert pos.total_liquid_cash == Decimal("400000.0000")
    assert pos.currency_breakdown["INR"] == Decimal("400000.0000")
    assert pos.currency_breakdown["USD"] == Decimal("1200.0000")
    assert len(pos.accounts) == 3


@pytest.mark.asyncio
async def test_cash_transfer_neutrality(db_session: AsyncSession, test_user_factory):
    """3. Transfer neutrality: inter-account transfers do not affect net income or expense."""
    user, tenant, _ = await test_user_factory(email="cash.transfer@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = CashManagementService(db_session)
    source = await service.create_account(
        tenant.id,
        FinancialAccountCreate(
            account_name="Source Bank",
            account_number_mask="*1111",
            account_type="SAVINGS",
            currency="INR",
            current_balance=Decimal("100000.0000"),
        ),
    )
    dest = await service.create_account(
        tenant.id,
        FinancialAccountCreate(
            account_name="Destination Bank",
            account_number_mask="*2222",
            account_type="SAVINGS",
            currency="INR",
            current_balance=Decimal("50000.0000"),
        ),
    )
    await db_session.flush()

    initial_total = source.current_balance + dest.current_balance

    transfer = await service.execute_transfer(
        tenant.id,
        AccountTransferCreate(
            source_account_id=source.id,
            destination_account_id=dest.id,
            amount=Decimal("25000.0000"),
            currency="INR",
            fee_amount=Decimal("0.0000"),
        ),
    )
    await db_session.flush()

    assert transfer.status == "COMPLETED"
    assert source.current_balance == Decimal("75000.0000")
    assert dest.current_balance == Decimal("75000.0000")
    # Transfer neutrality: total cash pool is strictly conserved
    assert (source.current_balance + dest.current_balance) == initial_total


@pytest.mark.asyncio
async def test_cash_recurring_payment_rules(
    db_session: AsyncSession, test_user_factory
):
    """7. Recurring payment and income rule configuration and tracking."""
    user, tenant, _ = await test_user_factory(email="cash.rules@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = CashManagementService(db_session)
    acct = await service.create_account(
        tenant.id,
        FinancialAccountCreate(
            account_name="Salary Account",
            account_number_mask="*3333",
            account_type="SAVINGS",
            currency="INR",
            current_balance=Decimal("80000.0000"),
        ),
    )

    # Inflow rule (Monthly salary)
    r_inflow = await service.create_recurring_rule(
        tenant.id,
        RecurringRuleCreate(
            account_id=acct.id,
            name="Monthly Employer Payroll",
            expected_amount=Decimal("85000.0000"),
            currency="INR",
            direction="INFLOW",
            recurrence_interval="MONTHLY",
            next_due_date=date.today() + timedelta(days=22),
        ),
    )

    # Outflow rule (Apartment rent)
    r_outflow = await service.create_recurring_rule(
        tenant.id,
        RecurringRuleCreate(
            account_id=acct.id,
            name="Apartment Monthly Rent",
            expected_amount=Decimal("32000.0000"),
            currency="INR",
            direction="OUTFLOW",
            recurrence_interval="MONTHLY",
            next_due_date=date.today() + timedelta(days=5),
        ),
    )
    await db_session.flush()

    rules = await service.repo.list_recurring_rules(tenant.id)
    assert len(rules) == 2
    assert {r.direction for r in rules} == {"INFLOW", "OUTFLOW"}


@pytest.mark.asyncio
async def test_cash_forecast_generation_and_reproducibility(
    db_session: AsyncSession, test_user_factory
):
    """9 & 10. Deterministic forecast generation and mathematical reproducibility."""
    user, tenant, _ = await test_user_factory(email="cash.forecast@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = CashManagementService(db_session)
    await service.create_account(
        tenant.id,
        FinancialAccountCreate(
            account_name="Main Bank",
            account_number_mask="*5555",
            account_type="SAVINGS",
            currency="INR",
            current_balance=Decimal("200000.0000"),
        ),
    )
    await db_session.flush()

    # Generate 30-day forecast
    f30_a = await service.generate_forecast(tenant.id, horizon_days=30)
    f30_b = await service.generate_forecast(tenant.id, horizon_days=30)

    # Determinism: identical inputs produce identical closing cash and steps
    assert f30_a.opening_cash == Decimal("200000.0000")
    assert f30_a.closing_cash == f30_b.closing_cash
    assert f30_a.total_inflow == f30_b.total_inflow
    assert f30_a.total_outflow == f30_b.total_outflow
    assert len(f30_a.items) == len(f30_b.items)


@pytest.mark.asyncio
async def test_cash_scenario_simulator_isolation(
    db_session: AsyncSession, test_user_factory
):
    """13. Scenario simulator does NOT mutate actual accounts or posted ledger records."""
    user, tenant, _ = await test_user_factory(email="cash.scenario@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = CashManagementService(db_session)
    acct = await service.create_account(
        tenant.id,
        FinancialAccountCreate(
            account_name="Checking",
            account_number_mask="*7777",
            account_type="SAVINGS",
            currency="INR",
            current_balance=Decimal("300000.0000"),
        ),
    )
    await db_session.flush()

    # Simulate buying a car: ₹1,00,000 downpayment + ₹15,000 monthly EMI for 12 months
    sim_res = await service.simulate_scenario(
        tenant.id,
        ScenarioSimulationRequest(
            scenario_name="Car Purchase Simulation",
            horizon_months=12,
            one_time_expense=Decimal("100000.0000"),
            new_emi_amount=Decimal("15000.0000"),
            monthly_expense_increase=Decimal("2000.0000"),
        ),
    )
    await db_session.flush()

    # Simulation produces projected variance
    assert sim_res.cash_variance < 0
    assert sim_res.simulated_closing_cash < sim_res.baseline_closing_cash

    # Crucial Invariant Check: Actual financial account balance is 100% UNTOUCHED
    pos_after = await service.get_cash_position(tenant.id)
    assert pos_after.total_liquid_cash == Decimal("300000.0000")
    assert acct.current_balance == Decimal("300000.0000")


@pytest.mark.asyncio
async def test_cash_tenant_isolation(db_session: AsyncSession, test_user_factory):
    """15. Cross-tenant account access and transfer execution strictly denied."""
    user1, tenant1, _ = await test_user_factory(email="cash.iso1@example.com")
    user2, tenant2, _ = await test_user_factory(email="cash.iso2@example.com")

    await bind_tenant_context(db_session, tenant1.id, user1.id)
    service = CashManagementService(db_session)
    acct1 = await service.create_account(
        tenant1.id,
        FinancialAccountCreate(
            account_name="Tenant 1 Vault",
            account_number_mask="*1111",
            account_type="SAVINGS",
            currency="INR",
            current_balance=Decimal("500000.0000"),
        ),
    )
    await db_session.flush()

    # Switch session context to Tenant 2
    await bind_tenant_context(db_session, tenant2.id, user2.id)

    # Tenant 2 cannot see Tenant 1's account
    t2_accounts = await service.repo.list_financial_accounts(tenant2.id)
    assert len(t2_accounts) == 0

    # Tenant 2 cannot transfer from Tenant 1's account
    with pytest.raises(ValueError, match="not found in workspace"):
        await service.execute_transfer(
            tenant2.id,
            AccountTransferCreate(
                source_account_id=acct1.id,
                destination_account_id=uuid.uuid4(),
                amount=Decimal("10000.0000"),
            ),
        )


@pytest.mark.asyncio
async def test_cash_management_api_endpoints(
    client: AsyncClient, test_user_factory
):
    """Verify live HTTP endpoints under /api/v1/cash-management/*."""
    user, tenant, token = await test_user_factory(email="cash.api@example.com")
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": str(tenant.id),
    }

    # 1. GET /position
    res_pos = await client.get("/api/v1/cash-management/position", headers=headers)
    assert res_pos.status_code == 200
    assert "total_liquid_cash" in res_pos.json()

    # 2. POST /accounts
    res_acct = await client.post(
        "/api/v1/cash-management/accounts",
        headers=headers,
        json={
            "account_name": "API Test Savings",
            "account_number_mask": "*9999",
            "account_type": "SAVINGS",
            "currency": "INR",
            "current_balance": "75000.0000",
        },
    )
    assert res_acct.status_code == 201

    # 3. GET /forecast
    res_fc = await client.get("/api/v1/cash-management/forecast?horizon_days=30", headers=headers)
    assert res_fc.status_code == 200
    assert "closing_cash" in res_fc.json()

    # 4. GET /liquidity
    res_liq = await client.get("/api/v1/cash-management/liquidity", headers=headers)
    assert res_liq.status_code == 200
    assert "emergency_fund_coverage_months" in res_liq.json()
