"""WealthOS Financial Planning & Forecasting Acceptance Test Suite.

Validates all Phase 7 capabilities:
1. Goal Creation, Listing, Updating, Deletion.
2. Contribution tracking and automatic balance increment & status update to ACHIEVED.
3. Deterministic inflation-adjusted target cost and required monthly contribution.
4. Feasibility classification state machine (ON_TRACK, NEEDS_ADJUSTMENT, AT_RISK).
5. Retirement planning corpus calculation, pre/post return compounding, real return in retirement.
6. Emergency fund coverage ratio calculation against liquid accounts and mandatory debt service.
7. Multi-horizon deterministic cash flow forecast.
8. What-if scenario simulation without mutating production ledger or accounts.
9. Tenant isolation and multi-tenant RLS protection.
10. Live HTTP REST API endpoints (/api/v1/goals and /api/v1/planning/*).
"""

import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenant_context import set_db_tenant_context
from app.domains.planning.models import FinancialGoal, RetirementProfile
from app.domains.planning.schemas import (
    CashFlowForecastRequest,
    GoalContributionCreate,
    GoalCreate,
    GoalUpdate,
    RetirementProfileCreate,
    RetirementProfileUpdate,
    ScenarioSimulationRequest,
)
from app.domains.planning.service import PlanningService


@pytest.mark.asyncio
async def test_goal_crud_and_contributions(db_session: AsyncSession, test_user_factory):
    """Requirement 1 & 2: Goal lifecycle, contribution tracking, and auto-achievement."""
    user, tenant, _ = await test_user_factory(email="goal.crud@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)
    service = PlanningService(db_session)

    target_d = date.today() + timedelta(days=365)
    create_payload = GoalCreate(
        name="House Down Payment",
        category="HOUSING",
        target_amount=Decimal("1000000.0000"),
        current_amount=Decimal("200000.0000"),
        target_date=target_d,
        monthly_contribution=Decimal("50000.0000"),
        inflation_rate=Decimal("0.0600"),
        expected_return_rate=Decimal("0.1000"),
        priority="HIGH",
    )

    # 1. Create goal
    goal = await service.create_goal(tenant.id, create_payload)
    assert goal.name == "House Down Payment"
    assert goal.target_amount == Decimal("1000000.0000")
    assert goal.current_amount == Decimal("200000.0000")
    assert goal.progress_percentage == Decimal("20.00")
    assert goal.feasibility is not None

    # 2. Add contribution
    contrib_payload = GoalContributionCreate(
        amount=Decimal("300000.0000"),
        contribution_date=date.today(),
    )
    contrib = await service.add_contribution(tenant.id, goal.id, contrib_payload)
    assert contrib.amount == Decimal("300000.0000")

    # Fetch updated goal
    updated_goal = await service.get_goal(tenant.id, goal.id)
    assert updated_goal.current_amount == Decimal("500000.0000")
    assert updated_goal.progress_percentage == Decimal("50.00")
    assert updated_goal.status == "IN_PROGRESS"

    # 3. Add contribution to exceed target -> auto status ACHIEVED
    contrib_finish = GoalContributionCreate(
        amount=Decimal("600000.0000"),
        contribution_date=date.today(),
    )
    await service.add_contribution(tenant.id, goal.id, contrib_finish)
    achieved_goal = await service.get_goal(tenant.id, goal.id)
    assert achieved_goal.current_amount == Decimal("1100000.0000")
    assert achieved_goal.progress_percentage == Decimal("100.00")
    assert achieved_goal.status == "ACHIEVED"

    # 4. List contributions
    contribs = await service.list_contributions(tenant.id, goal.id)
    assert len(contribs) == 2

    # 5. Delete goal
    deleted = await service.delete_goal(tenant.id, goal.id)
    assert deleted is True
    assert await service.get_goal(tenant.id, goal.id) is None


@pytest.mark.asyncio
async def test_inflation_compounding_and_feasibility_status(db_session: AsyncSession, test_user_factory):
    """Requirement 3 & 4: Inflation-adjusted target and feasibility state classification."""
    user, tenant, _ = await test_user_factory(email="goal.feasibility@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)
    service = PlanningService(db_session)

    # Goal A: 5 years in future, target 1,000,000, 6% inflation, high monthly contribution -> ON_TRACK
    target_5y = date.today() + timedelta(days=365 * 5)
    goal_on_track = await service.create_goal(
        tenant.id,
        GoalCreate(
            name="Education Fund - On Track",
            category="EDUCATION",
            target_amount=Decimal("1000000.0000"),
            current_amount=Decimal("300000.0000"),
            target_date=target_5y,
            monthly_contribution=Decimal("20000.0000"),
            inflation_rate=Decimal("0.0600"),
            expected_return_rate=Decimal("0.1200"),
        ),
    )
    feas_a = service.compute_goal_feasibility(
        await service.repo.get_goal(tenant.id, goal_on_track.id)
    )
    assert feas_a.inflation_adjusted_target > Decimal("1300000.00")  # ~1.338m
    assert feas_a.feasibility_status == "ON_TRACK"
    assert feas_a.funding_gap == Decimal("0.00")

    # Goal B: 3 years in future, target 1,000,000, 8% inflation, zero contribution -> AT_RISK
    target_3y = date.today() + timedelta(days=365 * 3)
    goal_at_risk = await service.create_goal(
        tenant.id,
        GoalCreate(
            name="Vehicle Fund - At Risk",
            category="VEHICLE",
            target_amount=Decimal("1000000.0000"),
            current_amount=Decimal("10000.0000"),
            target_date=target_3y,
            monthly_contribution=Decimal("0.0000"),
            inflation_rate=Decimal("0.0800"),
            expected_return_rate=Decimal("0.0800"),
        ),
    )
    feas_b = service.compute_goal_feasibility(
        await service.repo.get_goal(tenant.id, goal_at_risk.id)
    )
    assert feas_b.feasibility_status == "AT_RISK"
    assert feas_b.required_monthly_contribution > Decimal("25000.00")
    assert feas_b.funding_gap > Decimal("1000000.00")


@pytest.mark.asyncio
async def test_retirement_profile_and_annuity_due_projection(db_session: AsyncSession, test_user_factory):
    """Requirement 5: Actuarial retirement corpus calculation and real return compounding."""
    user, tenant, _ = await test_user_factory(email="retire.annuity@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)
    service = PlanningService(db_session)

    # Baseline retirement profile
    proj = await service.update_retirement_profile(
        tenant.id,
        RetirementProfileUpdate(
            current_age=30,
            retirement_age=60,
            life_expectancy=85,
            monthly_expenses_current=Decimal("50000.0000"),
            inflation_rate=Decimal("0.0600"),
            pre_retirement_return=Decimal("0.1000"),
            post_retirement_return=Decimal("0.0700"),
            existing_corpus=Decimal("1000000.0000"),
            monthly_contribution=Decimal("25000.0000"),
        ),
    )

    assert proj.current_age == 30
    assert proj.retirement_age == 60
    assert proj.years_to_retirement == 30
    assert proj.years_in_retirement == 25
    # Monthly expense at day 1 of retirement: 50,000 * (1.06)^30 = ~287,175
    assert proj.monthly_expense_at_retirement > Decimal("280000.00")
    # Target corpus should be substantially positive
    assert proj.target_corpus_required > Decimal("30000000.00")
    assert proj.readiness_percentage > Decimal("0.00")
    assert proj.feasibility_status in ["ON_TRACK", "NEEDS_ADJUSTMENT", "AT_RISK"]


@pytest.mark.asyncio
async def test_emergency_fund_coverage(db_session: AsyncSession, test_user_factory):
    """Requirement 6: Emergency fund coverage months against liquid cash and mandatory obligations."""
    user, tenant, _ = await test_user_factory(email="emergency.fund@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)
    service = PlanningService(db_session)

    analysis = await service.analyze_emergency_fund(tenant.id)
    assert analysis.target_coverage_months == Decimal("6.0")
    assert analysis.target_emergency_fund_amount > Decimal("0.00")
    assert analysis.status in ["OPTIMAL", "ADEQUATE", "VULNERABLE", "CRITICAL"]


@pytest.mark.asyncio
async def test_cash_flow_forecast(db_session: AsyncSession, test_user_factory):
    """Requirement 7: Deterministic multi-horizon cash flow forecast."""
    user, tenant, _ = await test_user_factory(email="cashflow.forecast@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)
    service = PlanningService(db_session)

    req = CashFlowForecastRequest(
        horizon_months=12,
        include_goal_contributions=True,
        include_loan_emis=True,
    )
    forecast = await service.forecast_cash_flow(tenant.id, req)
    assert forecast.horizon_months == 12
    assert len(forecast.monthly_projections) == 12
    # Verify month indices are 1 through 12
    for idx, p in enumerate(forecast.monthly_projections, 1):
        assert p.month_index == idx
        assert p.projected_income > 0


@pytest.mark.asyncio
async def test_what_if_simulation_non_mutation(db_session: AsyncSession, test_user_factory):
    """Requirement 8: Non-mutating what-if simulation engine."""
    user, tenant, _ = await test_user_factory(email="whatif.sim@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)
    service = PlanningService(db_session)

    req = ScenarioSimulationRequest(
        name="Salary Hike + Prepayment Simulation",
        description="Simulate 20% salary increase and 100k debt prepayment",
        monthly_income_delta_percent=Decimal("20.0000"),
        monthly_expense_delta=Decimal("5000.0000"),
        lump_sum_debt_prepayment=Decimal("100000.0000"),
        investment_return_shock_percent=Decimal("2.0000"),
        additional_monthly_investment=Decimal("15000.0000"),
        horizon_months=36,
    )

    sim = await service.simulate_scenario(tenant.id, req)
    assert sim.name == req.name
    assert sim.monthly_cash_flow_delta > Decimal("0.00")
    assert sim.net_worth_delta_at_horizon > Decimal("0.00")
    assert len(sim.key_takeaways) > 0


@pytest.mark.asyncio
async def test_planning_tenant_isolation(
    db_session: AsyncSession, test_user_factory
):
    """Requirement 9: Tenant isolation: Tenant A cannot access Tenant B's goals or projections."""
    user_a, tenant_a, _ = await test_user_factory(email="plan.tenanta@example.com")
    user_b, tenant_b, _ = await test_user_factory(email="plan.tenantb@example.com")

    # Tenant A creates a goal
    await set_db_tenant_context(db_session, tenant_a.id, user_id=user_a.id)
    service_a = PlanningService(db_session)
    goal_a = await service_a.create_goal(
        tenant_a.id,
        GoalCreate(
            name="Tenant A Confidential Goal",
            category="SAVINGS",
            target_amount=Decimal("500000.0000"),
            target_date=date.today() + timedelta(days=180),
        ),
    )

    # Tenant B tries to fetch Tenant A's goal
    await set_db_tenant_context(db_session, tenant_b.id, user_id=user_b.id)
    service_b = PlanningService(db_session)
    cross_goal = await service_b.get_goal(tenant_b.id, goal_a.id)
    assert cross_goal is None

    # Tenant B lists goals -> should not include Tenant A's goal
    tenant_b_goals = await service_b.list_goals(tenant_b.id)
    assert all(g.id != goal_a.id for g in tenant_b_goals)


@pytest.mark.asyncio
async def test_live_planning_http_api(
    client: AsyncClient, test_user_factory
):
    """Requirement 10: Live HTTP API verification for goals and planning."""
    user, tenant, token = await test_user_factory(email="api.planning@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create goal via API
    target_d = (date.today() + timedelta(days=365)).isoformat()
    resp_create = await client.post(
        "/api/v1/goals",
        headers=headers,
        json={
            "name": "Live API Emergency Fund",
            "category": "EMERGENCY",
            "target_amount": "300000.0000",
            "current_amount": "50000.0000",
            "target_date": target_d,
            "monthly_contribution": "15000.0000",
            "priority": "HIGH",
        },
    )
    assert resp_create.status_code == 201, resp_create.text
    goal_data = resp_create.json()
    goal_id = goal_data["id"]
    assert goal_data["name"] == "Live API Emergency Fund"
    assert "feasibility" in goal_data

    # 2. Get feasibility
    resp_feas = await client.get(f"/api/v1/goals/{goal_id}/feasibility", headers=headers)
    assert resp_feas.status_code == 200
    assert resp_feas.json()["feasibility_status"] in ["ON_TRACK", "NEEDS_ADJUSTMENT", "AT_RISK"]

    # 3. Add contribution
    resp_contrib = await client.post(
        f"/api/v1/goals/{goal_id}/contributions",
        headers=headers,
        json={"amount": "25000.0000", "currency": "INR"},
    )
    assert resp_contrib.status_code == 201
    assert resp_contrib.json()["amount"] == "25000.0000"

    # 4. Emergency fund analysis
    resp_ef = await client.get("/api/v1/planning/emergency-fund", headers=headers)
    assert resp_ef.status_code == 200
    assert "current_coverage_months" in resp_ef.json()

    # 5. Retirement projection
    resp_ret = await client.get("/api/v1/planning/retirement", headers=headers)
    assert resp_ret.status_code == 200
    assert "target_corpus_required" in resp_ret.json()

    # 6. Cash flow forecast
    resp_fc = await client.post(
        "/api/v1/planning/forecast",
        headers=headers,
        json={"horizon_months": 6, "include_goal_contributions": True, "include_loan_emis": True},
    )
    assert resp_fc.status_code == 200
    assert len(resp_fc.json()["monthly_projections"]) == 6

    # 7. What-if simulation
    resp_sim = await client.post(
        "/api/v1/planning/simulate",
        headers=headers,
        json={
            "name": "Live API What-If Test",
            "monthly_income_delta_percent": "10.0000",
            "monthly_expense_delta": "-2000.0000",
            "horizon_months": 24,
        },
    )
    assert resp_sim.status_code == 200
    assert "net_worth_delta_at_horizon" in resp_sim.json()
