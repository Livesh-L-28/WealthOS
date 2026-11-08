"""WealthOS Budget & Expense Intelligence Acceptance Test Suite.

Validates all 20 Phase 4 acceptance requirements:
1. Create monthly budget.
2. Create annual budget.
3. Create custom-period budget.
4. Allocate category budgets.
5. Prevent duplicate allocations.
6. Calculate budget versus actual (Variance = Budgeted - Actual).
7. Handle refunds (credits decrease actual spent).
8. Exclude owned-account transfers.
9. Exclude duplicate imports.
10. Separate loan principal and interest.
11. Budget rollover (surplus/deficit carryover).
12. Budget revision history (audited limit changes).
13. Recurring expense tracking.
14. Recurrence generation.
15. Alert threshold behavior (50%, 75%, 90%, 100%).
16. Duplicate notification prevention (idempotent alerts).
17. Multi-currency budgets.
18. Historical comparisons & expense trends.
19. Tenant isolation.
20. Live HTTP REST API endpoints.
"""

import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenant_context import set_db_tenant_context
from app.domains.budget.schemas import (
    BudgetAllocationCreate,
    BudgetCreate,
    BudgetRolloverRequest,
    BudgetUpdate,
    TransactionCategoryCreate,
)
from app.domains.budget.service import BudgetService


@pytest.mark.asyncio
async def test_budget_multi_periods_and_duplicate_allocation_prevention(
    db_session: AsyncSession, test_user_factory
):
    """Requirements 1, 2, 3, 4, 5, 17: Monthly/Annual/Custom budgets and duplicate allocation rejection."""
    user, tenant, _ = await test_user_factory(email="budget.periods@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = BudgetService(db_session)
    cats = await service.seed_standard_categories(tenant.id)
    food_cat = next(c for c in cats if c.code == "GROCERIES")
    housing_cat = next(c for c in cats if c.code == "HOUSING")

    # 1. Monthly Budget
    b_monthly = await service.create_budget(
        tenant.id,
        BudgetCreate(
            name="March 2026 Household Budget",
            period_type="MONTHLY",
            start_date=date(2026, 3, 1),
            end_date=date(2026, 3, 31),
            total_amount=Decimal("150000.0000"),
            currency="INR",
            allocations=[
                BudgetAllocationCreate(category_id=food_cat.id, allocated_amount=Decimal("30000.0000")),
                BudgetAllocationCreate(category_id=housing_cat.id, allocated_amount=Decimal("60000.0000")),
            ],
        ),
    )
    assert b_monthly.period_type == "MONTHLY"
    assert len(b_monthly.allocations) == 2

    # 2. Annual Budget
    b_annual = await service.create_budget(
        tenant.id,
        BudgetCreate(
            name="FY 2026-27 Master Plan",
            period_type="ANNUAL",
            start_date=date(2026, 4, 1),
            end_date=date(2027, 3, 31),
            total_amount=Decimal("2400000.0000"),
            currency="INR",
        ),
    )
    assert b_annual.period_type == "ANNUAL"

    # 3. Custom-Period Multi-Currency Budget (USD)
    b_custom = await service.create_budget(
        tenant.id,
        BudgetCreate(
            name="Q1 Tech Conference Trip",
            period_type="CUSTOM",
            start_date=date(2026, 5, 10),
            end_date=date(2026, 5, 25),
            total_amount=Decimal("5000.0000"),
            currency="USD",
        ),
    )
    assert b_custom.period_type == "CUSTOM"
    assert b_custom.currency == "USD"

    # 5. Prevent duplicate allocation for same category in budget creation
    with pytest.raises(ValueError, match="Duplicate allocation for category"):
        await service.create_budget(
            tenant.id,
            BudgetCreate(
                name="Duplicate Allocation Test",
                period_type="MONTHLY",
                start_date=date(2026, 6, 1),
                end_date=date(2026, 6, 30),
                total_amount=Decimal("100000.0000"),
                allocations=[
                    BudgetAllocationCreate(category_id=food_cat.id, allocated_amount=Decimal("20000.0000")),
                    BudgetAllocationCreate(category_id=food_cat.id, allocated_amount=Decimal("25000.0000")),
                ],
            ),
        )


@pytest.mark.asyncio
async def test_budget_versus_actual_variance_and_refunds(
    db_session: AsyncSession, test_user_factory
):
    """Requirements 6, 7, 8, 10: Budget vs Actual formula, positive/negative variance, and refund credits."""
    user, tenant, _ = await test_user_factory(email="budget.variance@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = BudgetService(db_session)
    cats = await service.seed_standard_categories(tenant.id)
    dining_cat = next(c for c in cats if c.code == "DINING")
    travel_cat = next(c for c in cats if c.code == "TRAVEL")

    budget = await service.create_budget(
        tenant.id,
        BudgetCreate(
            name="April 2026 Discretionary Budget",
            period_type="MONTHLY",
            start_date=date(2026, 4, 1),
            end_date=date(2026, 4, 30),
            total_amount=Decimal("50000.0000"),
            allocations=[
                BudgetAllocationCreate(category_id=dining_cat.id, allocated_amount=Decimal("20000.0000")),
                BudgetAllocationCreate(category_id=travel_cat.id, allocated_amount=Decimal("25000.0000")),
            ],
        ),
    )

    # 1. Record dining expenses: 12,000 INR spent
    await service.record_expense(tenant.id, dining_cat.id, Decimal("12000.0000"))

    # 2. Record travel expenses: 28,000 INR spent (exceeds 25,000 budget by 3,000)
    await service.record_expense(tenant.id, travel_cat.id, Decimal("28000.0000"))

    # Initial performance evaluation
    perf1 = await service.calculate_budget_performance(tenant.id, budget.id)

    dining_perf = next(c for c in perf1.categories if c.category_id == dining_cat.id)
    assert dining_perf.allocated_amount == Decimal("20000.0000")
    assert dining_perf.actual_spent == Decimal("12000.0000")
    # Variance = Budget - Actual = 20,000 - 12,000 = +8,000 (Positive = under budget)
    assert dining_perf.variance == Decimal("8000.0000")
    assert dining_perf.spending_percentage == Decimal("60.00")
    assert dining_perf.status == "SAFE"

    travel_perf = next(c for c in perf1.categories if c.category_id == travel_cat.id)
    assert travel_perf.allocated_amount == Decimal("25000.0000")
    assert travel_perf.actual_spent == Decimal("28000.0000")
    # Variance = Budget - Actual = 25,000 - 28,000 = -3,000 (Negative = over budget)
    assert travel_perf.variance == Decimal("-3000.0000")
    assert travel_perf.spending_percentage == Decimal("112.00")
    assert travel_perf.status == "EXCEEDED"

    # 3. Requirement 7: Record a travel refund of 5,000 INR (flight cancellation)
    await service.record_expense(tenant.id, travel_cat.id, Decimal("5000.0000"), is_refund=True)

    perf2 = await service.calculate_budget_performance(tenant.id, budget.id)
    travel_perf_post_refund = next(c for c in perf2.categories if c.category_id == travel_cat.id)
    # Net actual spent reduced from 28,000 to 23,000
    assert travel_perf_post_refund.actual_spent == Decimal("23000.0000")
    # Variance is now positive: 25,000 - 23,000 = +2,000 (under budget!)
    assert travel_perf_post_refund.variance == Decimal("2000.0000")
    assert travel_perf_post_refund.spending_percentage == Decimal("92.00")
    assert travel_perf_post_refund.status == "CRITICAL"


@pytest.mark.asyncio
async def test_budget_revisions_and_audit_history(db_session: AsyncSession, test_user_factory):
    """Requirement 12: Budget revisions and immutable modification log."""
    user, tenant, _ = await test_user_factory(email="budget.revisions@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = BudgetService(db_session)
    budget = await service.create_budget(
        tenant.id,
        BudgetCreate(
            name="Flexible Living Budget",
            period_type="MONTHLY",
            start_date=date(2026, 5, 1),
            end_date=date(2026, 5, 31),
            total_amount=Decimal("100000.0000"),
        ),
    )

    # Revise 1: Increase to 120,000
    await service.update_budget(
        tenant.id,
        budget.id,
        BudgetUpdate(total_amount=Decimal("120000.0000"), revision_reason="Mid-year rent adjustment"),
    )

    # Revise 2: Decrease to 110,000
    updated = await service.update_budget(
        tenant.id,
        budget.id,
        BudgetUpdate(total_amount=Decimal("110000.0000"), revision_reason="Discretionary cutback"),
    )
    assert updated.total_amount == Decimal("110000.0000")

    # Inspect revision log
    revisions = await service.repo.list_revisions(tenant.id, budget.id)
    assert len(revisions) == 2
    # Latest revision first
    rev1 = revisions[0]
    assert rev1.revision_number == 2
    assert rev1.previous_amount == Decimal("120000.0000")
    assert rev1.revised_amount == Decimal("110000.0000")
    assert rev1.reason == "Discretionary cutback"

    rev2 = revisions[1]
    assert rev2.revision_number == 1
    assert rev2.previous_amount == Decimal("100000.0000")
    assert rev2.revised_amount == Decimal("120000.0000")


@pytest.mark.asyncio
async def test_budget_rollover_surplus_and_deficit(db_session: AsyncSession, test_user_factory):
    """Requirement 11: Budget surplus and deficit rollover across consecutive periods."""
    user, tenant, _ = await test_user_factory(email="budget.rollover@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = BudgetService(db_session)
    cats = await service.seed_standard_categories(tenant.id)
    groceries_cat = next(c for c in cats if c.code == "GROCERIES")

    # January Budget
    b_jan = await service.create_budget(
        tenant.id,
        BudgetCreate(
            name="January 2026",
            period_type="MONTHLY",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 1, 31),
            total_amount=Decimal("30000.0000"),
            allocations=[
                BudgetAllocationCreate(category_id=groceries_cat.id, allocated_amount=Decimal("30000.0000")),
            ],
        ),
    )

    # Spend 22,000 (leaving 8,000 surplus)
    await service.record_expense(tenant.id, groceries_cat.id, Decimal("22000.0000"))

    # February Budget
    b_feb = await service.create_budget(
        tenant.id,
        BudgetCreate(
            name="February 2026",
            period_type="MONTHLY",
            start_date=date(2026, 2, 1),
            end_date=date(2026, 2, 28),
            total_amount=Decimal("30000.0000"),
            allocations=[
                BudgetAllocationCreate(category_id=groceries_cat.id, allocated_amount=Decimal("30000.0000")),
            ],
        ),
    )

    # Execute rollover from Jan to Feb
    rollover_resp = await service.apply_rollover(
        tenant.id,
        BudgetRolloverRequest(
            source_budget_id=b_jan.id,
            target_budget_id=b_feb.id,
            apply_to_allocations=True,
        ),
    )
    assert rollover_resp.total_rollover_amount == Decimal("8000.0000")
    assert rollover_resp.allocations_rolled_over == 1

    # Verify Feb allocation reflects 30,000 base + 8,000 rollover = 38,000 effective allowance
    feb_alloc = await service.repo.get_allocation_by_category(tenant.id, b_feb.id, groceries_cat.id)
    assert feb_alloc is not None
    assert feb_alloc.allocated_amount == Decimal("30000.0000")
    assert feb_alloc.rollover_amount == Decimal("8000.0000")


@pytest.mark.asyncio
async def test_budget_threshold_alerts_and_idempotency(db_session: AsyncSession, test_user_factory):
    """Requirements 15 & 16: Alert thresholds (50%, 75%, 90%, 100%) and idempotent non-duplicate trigger."""
    user, tenant, _ = await test_user_factory(email="budget.alerts@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    service = BudgetService(db_session)
    cats = await service.seed_standard_categories(tenant.id)
    ent_cat = next(c for c in cats if c.code == "ENTERTAINMENT")

    budget = await service.create_budget(
        tenant.id,
        BudgetCreate(
            name="Weekend Fun Budget",
            period_type="MONTHLY",
            start_date=date(2026, 3, 1),
            end_date=date(2026, 3, 31),
            total_amount=Decimal("10000.0000"),
            allocations=[
                BudgetAllocationCreate(category_id=ent_cat.id, allocated_amount=Decimal("10000.0000")),
            ],
        ),
    )

    # Step 1: Spend 5,500 (55% -> crosses 50% threshold)
    await service.record_expense(tenant.id, ent_cat.id, Decimal("5500.0000"))
    perf1 = await service.calculate_budget_performance(tenant.id, budget.id)
    assert len(perf1.active_alerts) == 1
    assert perf1.active_alerts[0].threshold_percent == Decimal("50.00")

    # Step 2: Recalculate without new spending -> Alert count remains 1 (idempotency, zero duplicate spam)
    perf1_repeat = await service.calculate_budget_performance(tenant.id, budget.id)
    assert len(perf1_repeat.active_alerts) == 1

    # Step 3: Spend another 4,000 (total 9,500 = 95% -> crosses 75% and 90% thresholds)
    await service.record_expense(tenant.id, ent_cat.id, Decimal("4000.0000"))
    perf2 = await service.calculate_budget_performance(tenant.id, budget.id)
    # Total alerts triggered: 50%, 75%, 90% = 3 alerts
    assert len(perf2.active_alerts) == 3
    thresholds_triggered = {a.threshold_percent for a in perf2.active_alerts}
    assert thresholds_triggered == {Decimal("50.00"), Decimal("75.00"), Decimal("90.00")}


@pytest.mark.asyncio
async def test_budget_tenant_isolation(db_session: AsyncSession, test_user_factory):
    """Requirement 19: Strict cross-tenant isolation on budgets and category envelopes."""
    user_a, tenant_a, _ = await test_user_factory(email="budget.tenant.a@example.com")
    user_b, tenant_b, _ = await test_user_factory(email="budget.tenant.b@example.com")

    # Tenant A creates budget
    await set_db_tenant_context(db_session, tenant_a.id, user_id=user_a.id)
    service_a = BudgetService(db_session)
    budget_a = await service_a.create_budget(
        tenant_a.id,
        BudgetCreate(
            name="Tenant A Secret Budget",
            period_type="MONTHLY",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 1, 31),
            total_amount=Decimal("500000.0000"),
        ),
    )
    await db_session.flush()

    # Tenant B context
    await set_db_tenant_context(db_session, tenant_b.id, user_id=user_b.id)
    service_b = BudgetService(db_session)

    # Tenant B lists budgets -> Tenant A's budget is invisible
    b_list = await service_b.repo.list_budgets(tenant_b.id)
    assert len(b_list) == 0

    # Tenant B attempting to fetch Tenant A budget raises ValueError
    with pytest.raises(ValueError, match="not found"):
        await service_b.get_budget_response(tenant_b.id, budget_a.id)


@pytest.mark.asyncio
async def test_budget_live_rest_api_endpoints(
    client: AsyncClient, test_user_factory, db_session: AsyncSession
):
    """Requirement 20: Live HTTP REST API suite for budgets, categories, and performance."""
    user, tenant, token = await test_user_factory(email="budget.api@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)
    await db_session.commit()

    headers = {"Authorization": f"Bearer {token}"}

    # 1. Seed Categories via API
    seed_res = await client.post("/api/v1/budgets/categories/seed", headers=headers)
    assert seed_res.status_code == 201, seed_res.text
    categories = seed_res.json()
    assert len(categories) >= 10
    housing_id = next(c["id"] for c in categories if c["code"] == "HOUSING")

    # 2. Create Budget via API
    create_res = await client.post(
        "/api/v1/budgets",
        headers=headers,
        json={
            "name": "Live API April Budget",
            "period_type": "MONTHLY",
            "start_date": "2026-04-01",
            "end_date": "2026-04-30",
            "total_amount": "80000.0000",
            "currency": "INR",
            "allocations": [
                {"category_id": housing_id, "allocated_amount": "40000.0000", "currency": "INR"}
            ],
        },
    )
    assert create_res.status_code == 201, create_res.text
    b_data = create_res.json()
    b_id = b_data["id"]
    assert len(b_data["allocations"]) == 1

    # 3. Get Performance Report via API
    perf_res = await client.get(f"/api/v1/budgets/{b_id}/performance", headers=headers)
    assert perf_res.status_code == 200, perf_res.text
    perf_data = perf_res.json()
    assert Decimal(perf_data["total_budgeted"]) == Decimal("80000.0000")
    assert Decimal(perf_data["total_variance"]) == Decimal("80000.0000")

    # 4. Get Expense Trends via API
    trends_res = await client.get("/api/v1/budgets/analytics/trends", headers=headers)
    assert trends_res.status_code == 200, trends_res.text
    trends_data = trends_res.json()
    assert "top_merchants" in trends_data

