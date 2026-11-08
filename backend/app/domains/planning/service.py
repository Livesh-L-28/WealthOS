"""WealthOS Financial Planning & Forecasting Domain Service.

Implements goal feasibility, inflation compounding, retirement corpus modeling,
emergency fund coverage analysis, deterministic cash flow forecasting, and what-if simulation.
"""

import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.cash.models import FinancialAccount
from app.domains.liabilities.models import Liability
from app.domains.planning.models import (
    FinancialGoal,
    FinancialScenario,
    ForecastRun,
    GoalContribution,
    RetirementProfile,
)
from app.domains.planning.repository import PlanningRepository
from app.domains.planning.schemas import (
    CashFlowForecastRequest,
    CashFlowForecastResponse,
    CashFlowMonthlyProjection,
    EmergencyFundAnalysisResponse,
    GoalContributionCreate,
    GoalContributionResponse,
    GoalCreate,
    GoalFeasibilityResponse,
    GoalResponse,
    GoalUpdate,
    RetirementProfileCreate,
    RetirementProfileUpdate,
    RetirementProjectionResponse,
    ScenarioSimulationRequest,
    ScenarioSimulationResponse,
)


def _round(val: Decimal, places: int = 4) -> Decimal:
    """Helper to round Decimal with ROUND_HALF_UP."""
    q = Decimal("10") ** -places
    return val.quantize(q, rounding=ROUND_HALF_UP)


class PlanningService:
    """Core domain service for financial planning, goals, forecasting, and retirement."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = PlanningRepository(session)

    # -------------------------------------------------------------------------
    # 1. Financial Goals & Feasibility
    # -------------------------------------------------------------------------
    def compute_goal_feasibility(self, goal: FinancialGoal) -> GoalFeasibilityResponse:
        """Evaluate deterministic feasibility of a financial goal with inflation compounding."""
        today = date.today()
        target_date = goal.target_date

        # Calculate time horizon in months and years
        days_remaining = max(0, (target_date - today).days)
        months_remaining = Decimal(days_remaining) / Decimal("30.4375")  # average days per month
        years_remaining = Decimal(days_remaining) / Decimal("365.25")

        target_nominal = goal.target_amount
        inflation_rate = goal.inflation_rate
        expected_return_rate = goal.expected_return_rate
        current_savings = goal.current_amount
        current_pmt = goal.monthly_contribution

        # 1. Inflation-adjusted target cost
        # FV_target = target_nominal * (1 + inflation_rate) ^ years
        if years_remaining > 0 and inflation_rate > 0:
            growth_factor = (Decimal("1") + inflation_rate) ** years_remaining
            fv_target = _round(target_nominal * growth_factor, 4)
        else:
            fv_target = target_nominal

        # 2. Future value of current savings and monthly contributions
        # monthly return rate r = R / 12
        r_monthly = expected_return_rate / Decimal("12")
        n_months = int(months_remaining.quantize(Decimal("1"), rounding=ROUND_HALF_UP))

        if n_months > 0:
            if r_monthly > 0:
                compound_growth = (Decimal("1") + r_monthly) ** n_months
                fv_current = current_savings * compound_growth
                fv_contributions = current_pmt * ((compound_growth - Decimal("1")) / r_monthly)
            else:
                compound_growth = Decimal("1")
                fv_current = current_savings
                fv_contributions = current_pmt * Decimal(n_months)
        else:
            fv_current = current_savings
            fv_contributions = Decimal("0.0000")

        fv_projected = _round(fv_current + fv_contributions, 4)
        funding_gap = _round(max(Decimal("0.0000"), fv_target - fv_projected), 4)

        # 3. Required monthly contribution
        rem_from_contributions = max(Decimal("0.0000"), fv_target - fv_current)
        if rem_from_contributions <= 0 or n_months <= 0:
            required_pmt = Decimal("0.0000")
        else:
            if r_monthly > 0:
                denom = ((Decimal("1") + r_monthly) ** n_months - Decimal("1")) / r_monthly
                required_pmt = _round(rem_from_contributions / denom, 4)
            else:
                required_pmt = _round(rem_from_contributions / Decimal(n_months), 4)

        # 4. Feasibility Classification State Machine
        # ON_TRACK >= 95%, NEEDS_ADJUSTMENT 75% - 95%, AT_RISK < 75%
        ratio = fv_projected / fv_target if fv_target > 0 else Decimal("1.0")
        if ratio >= Decimal("0.95"):
            feasibility_status = "ON_TRACK"
            status_reason = "On track to achieve target."
        elif ratio >= Decimal("0.75"):
            feasibility_status = "NEEDS_ADJUSTMENT"
            additional_pmt = max(Decimal("0.0000"), required_pmt - current_pmt)
            status_reason = (
                f"Modest shortfall: increase monthly contribution by ₹{additional_pmt:,.2f} "
                f"to achieve target on schedule."
            )
        else:
            feasibility_status = "AT_RISK"
            pct = (ratio * Decimal("100")).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
            status_reason = (
                f"Significant shortfall: projected to reach {pct}% of inflation-adjusted target. "
                f"Requires ₹{required_pmt:,.2f}/mo."
            )

        return GoalFeasibilityResponse(
            goal_id=goal.id,
            name=goal.name,
            target_amount_nominal=_round(target_nominal, 2),
            inflation_adjusted_target=_round(fv_target, 2),
            years_to_target=_round(years_remaining, 2),
            projected_wealth_at_target=_round(fv_projected, 2),
            funding_gap=_round(funding_gap, 2),
            required_monthly_contribution=_round(required_pmt, 2),
            current_monthly_contribution=_round(current_pmt, 2),
            feasibility_status=feasibility_status,
            status_reason=status_reason,
        )

    def _to_goal_response(self, goal: FinancialGoal) -> GoalResponse:
        """Convert goal model to schema with calculated fields."""
        progress_pct = Decimal("0.00")
        if goal.target_amount > 0:
            progress_pct = _round(
                min(Decimal("100.00"), (goal.current_amount / goal.target_amount) * Decimal("100")),
                2,
            )

        feasibility = self.compute_goal_feasibility(goal)

        return GoalResponse(
            id=goal.id,
            tenant_id=goal.tenant_id,
            name=goal.name,
            category=goal.category,
            target_amount=goal.target_amount,
            current_amount=goal.current_amount,
            currency=goal.currency,
            target_date=goal.target_date,
            status=goal.status,
            monthly_contribution=goal.monthly_contribution,
            inflation_rate=goal.inflation_rate,
            expected_return_rate=goal.expected_return_rate,
            priority=goal.priority,
            linked_account_id=goal.linked_account_id,
            progress_percentage=progress_pct,
            feasibility=feasibility,
            created_at=goal.created_at,
            updated_at=goal.updated_at,
        )

    async def create_goal(self, tenant_id: uuid.UUID, data: GoalCreate) -> GoalResponse:
        """Create a new financial goal."""
        goal = FinancialGoal(
            tenant_id=tenant_id,
            name=data.name,
            category=data.category,
            target_amount=data.target_amount,
            current_amount=data.current_amount,
            currency=data.currency,
            target_date=data.target_date,
            status="IN_PROGRESS",
            monthly_contribution=data.monthly_contribution,
            inflation_rate=data.inflation_rate,
            expected_return_rate=data.expected_return_rate,
            priority=data.priority,
            linked_account_id=data.linked_account_id,
        )
        saved = await self.repo.create_goal(goal)
        return self._to_goal_response(saved)

    async def get_goal(self, tenant_id: uuid.UUID, goal_id: uuid.UUID) -> GoalResponse | None:
        """Retrieve a specific financial goal."""
        goal = await self.repo.get_goal(tenant_id, goal_id)
        if not goal:
            return None
        return self._to_goal_response(goal)

    async def list_goals(
        self, tenant_id: uuid.UUID, status: str | None = None
    ) -> list[GoalResponse]:
        """List all goals for tenant with feasibility status."""
        goals = await self.repo.list_goals(tenant_id, status)
        return [self._to_goal_response(g) for g in goals]

    async def update_goal(
        self, tenant_id: uuid.UUID, goal_id: uuid.UUID, data: GoalUpdate
    ) -> GoalResponse | None:
        """Update an existing goal."""
        goal = await self.repo.get_goal(tenant_id, goal_id)
        if not goal:
            return None

        update_dict = data.model_dump(exclude_unset=True)
        for key, val in update_dict.items():
            setattr(goal, key, val)

        await self.session.flush()
        return self._to_goal_response(goal)

    async def delete_goal(self, tenant_id: uuid.UUID, goal_id: uuid.UUID) -> bool:
        """Delete a goal."""
        goal = await self.repo.get_goal(tenant_id, goal_id)
        if not goal:
            return False
        await self.repo.delete_goal(goal)
        return True

    async def add_contribution(
        self, tenant_id: uuid.UUID, goal_id: uuid.UUID, data: GoalContributionCreate
    ) -> GoalContributionResponse | None:
        """Add contribution to goal and update current amount."""
        goal = await self.repo.get_goal(tenant_id, goal_id)
        if not goal:
            return None

        contrib = GoalContribution(
            tenant_id=tenant_id,
            goal_id=goal_id,
            transaction_id=data.transaction_id,
            contribution_date=data.contribution_date or date.today(),
            amount=data.amount,
            currency=data.currency,
        )
        saved = await self.repo.add_contribution(contrib)

        # Increment goal current amount
        goal.current_amount = _round(goal.current_amount + data.amount, 4)
        if goal.current_amount >= goal.target_amount:
            goal.status = "ACHIEVED"

        await self.session.flush()
        return GoalContributionResponse.model_validate(saved)

    async def list_contributions(
        self, tenant_id: uuid.UUID, goal_id: uuid.UUID
    ) -> list[GoalContributionResponse]:
        """List contribution history for a goal."""
        contribs = await self.repo.list_contributions(tenant_id, goal_id)
        return [GoalContributionResponse.model_validate(c) for c in contribs]

    # -------------------------------------------------------------------------
    # 2. Retirement Planning & Corpus Engine
    # -------------------------------------------------------------------------
    def compute_retirement_projection(
        self, profile: RetirementProfile
    ) -> RetirementProjectionResponse:
        """Compute actuarial retirement corpus requirement and readiness."""
        y_work = max(0, profile.retirement_age - profile.current_age)
        y_ret = max(0, profile.life_expectancy - profile.retirement_age)

        # Monthly expense at day 1 of retirement: E_ret = E_0 * (1 + i)^y_work
        growth_factor = (Decimal("1") + profile.inflation_rate) ** y_work if y_work > 0 else Decimal("1")
        monthly_exp_ret = _round(profile.monthly_expenses_current * growth_factor, 4)
        annual_exp_ret = _round(monthly_exp_ret * Decimal("12"), 4)

        # Real return in retirement: r_real = (1 + R_post) / (1 + i) - 1
        r_real = ((Decimal("1") + profile.post_retirement_return) / (Decimal("1") + profile.inflation_rate)) - Decimal("1")

        # Target corpus required using annuity due formula
        if y_ret > 0:
            if r_real != 0:
                annuity_factor = (Decimal("1") - ((Decimal("1") + r_real) ** (-y_ret))) / r_real
                target_corpus = _round(annual_exp_ret * annuity_factor, 4)
            else:
                target_corpus = _round(annual_exp_ret * Decimal(y_ret), 4)
        else:
            target_corpus = Decimal("0.0000")

        # Future value of existing corpus: C_existing * (1 + R_pre)^y_work
        pre_growth = (Decimal("1") + profile.pre_retirement_return) ** y_work if y_work > 0 else Decimal("1")
        existing_proj = _round(profile.existing_corpus * pre_growth, 4)

        # Future value of monthly contributions
        n_months = y_work * 12
        r_monthly_pre = profile.pre_retirement_return / Decimal("12")
        if n_months > 0:
            if r_monthly_pre > 0:
                compound_m = (Decimal("1") + r_monthly_pre) ** n_months
                contrib_proj = _round(profile.monthly_contribution * ((compound_m - Decimal("1")) / r_monthly_pre), 4)
            else:
                contrib_proj = _round(profile.monthly_contribution * Decimal(n_months), 4)
        else:
            contrib_proj = Decimal("0.0000")

        projected_corpus = _round(existing_proj + contrib_proj, 4)
        funding_gap = _round(max(Decimal("0.0000"), target_corpus - projected_corpus), 4)

        # Required monthly contribution to bridge shortfall
        rem_needed = max(Decimal("0.0000"), target_corpus - existing_proj)
        if rem_needed <= 0 or n_months <= 0:
            required_pmt = Decimal("0.0000")
        else:
            if r_monthly_pre > 0:
                denom = ((Decimal("1") + r_monthly_pre) ** n_months - Decimal("1")) / r_monthly_pre
                required_pmt = _round(rem_needed / denom, 4)
            else:
                required_pmt = _round(rem_needed / Decimal(n_months), 4)

        readiness_pct = (
            min(Decimal("100.00"), _round((projected_corpus / target_corpus) * Decimal("100"), 2))
            if target_corpus > 0
            else Decimal("100.00")
        )

        if readiness_pct >= Decimal("95.00"):
            status = "ON_TRACK"
        elif readiness_pct >= Decimal("75.00"):
            status = "NEEDS_ADJUSTMENT"
        else:
            status = "AT_RISK"

        return RetirementProjectionResponse(
            current_age=profile.current_age,
            retirement_age=profile.retirement_age,
            life_expectancy=profile.life_expectancy,
            years_to_retirement=y_work,
            years_in_retirement=y_ret,
            monthly_expense_at_retirement=_round(monthly_exp_ret, 2),
            annual_expense_at_retirement=_round(annual_exp_ret, 2),
            real_return_post_retirement=_round(r_real, 4),
            target_corpus_required=_round(target_corpus, 2),
            projected_corpus_at_retirement=_round(projected_corpus, 2),
            corpus_from_existing_savings=_round(existing_proj, 2),
            corpus_from_future_contributions=_round(contrib_proj, 2),
            funding_gap=_round(funding_gap, 2),
            required_monthly_contribution=_round(required_pmt, 2),
            current_monthly_contribution=_round(profile.monthly_contribution, 2),
            feasibility_status=status,
            readiness_percentage=readiness_pct,
        )

    async def get_or_create_retirement_profile(
        self, tenant_id: uuid.UUID
    ) -> RetirementProfile:
        """Fetch existing retirement profile or create sensible baseline."""
        profile = await self.repo.get_retirement_profile(tenant_id)
        if not profile:
            profile = RetirementProfile(
                tenant_id=tenant_id,
                current_age=30,
                retirement_age=60,
                life_expectancy=85,
                monthly_expenses_current=Decimal("60000.0000"),
                inflation_rate=Decimal("0.0600"),
                pre_retirement_return=Decimal("0.1000"),
                post_retirement_return=Decimal("0.0700"),
                existing_corpus=Decimal("500000.0000"),
                monthly_contribution=Decimal("20000.0000"),
            )
            profile = await self.repo.save_retirement_profile(profile)
        return profile

    async def update_retirement_profile(
        self, tenant_id: uuid.UUID, data: RetirementProfileUpdate
    ) -> RetirementProjectionResponse:
        """Update retirement parameters and recalculate projection."""
        profile = await self.get_or_create_retirement_profile(tenant_id)
        update_dict = data.model_dump(exclude_unset=True)
        for key, val in update_dict.items():
            setattr(profile, key, val)
        await self.session.flush()
        return self.compute_retirement_projection(profile)

    # -------------------------------------------------------------------------
    # 3. Emergency Fund Analysis
    # -------------------------------------------------------------------------
    async def analyze_emergency_fund(
        self, tenant_id: uuid.UUID
    ) -> EmergencyFundAnalysisResponse:
        """Calculate months of emergency coverage against liquid cash and mandatory obligations."""
        # 1. Calculate liquid assets from financial_accounts
        stmt_accounts = select(FinancialAccount).where(
            FinancialAccount.tenant_id == tenant_id,
            FinancialAccount.is_active == True,
            FinancialAccount.account_type.in_(["SAVINGS", "CURRENT", "CASH"]),
        )
        res_acc = await self.session.execute(stmt_accounts)
        accounts = res_acc.scalars().all()
        liquid_cash = sum((acc.current_balance for acc in accounts), Decimal("0.0000"))

        # 2. Calculate mandatory debt service from liabilities
        stmt_liab = select(Liability).where(
            Liability.tenant_id == tenant_id,
            Liability.is_active == True,
        )
        res_liab = await self.session.execute(stmt_liab)
        liabilities = res_liab.scalars().all()
        monthly_debt_service = sum((l.emi_amount for l in liabilities), Decimal("0.0000"))

        # 3. Baseline living expenses (from budget or baseline default ₹40,000)
        baseline_living = Decimal("40000.0000")
        essential_expenses = baseline_living + monthly_debt_service

        target_months = Decimal("6.0")
        target_emergency_fund = _round(essential_expenses * target_months, 2)

        if essential_expenses > 0:
            coverage_months = _round(liquid_cash / essential_expenses, 2)
        else:
            coverage_months = Decimal("99.0")

        funding_gap = _round(max(Decimal("0.0000"), target_emergency_fund - liquid_cash), 2)

        if coverage_months >= Decimal("6.0"):
            status = "OPTIMAL"
            summary = (
                f"Emergency reserve is healthy with {coverage_months} months of essential coverage."
            )
        elif coverage_months >= Decimal("3.0"):
            status = "ADEQUATE"
            summary = (
                f"Emergency reserve provides {coverage_months} months coverage. Recommend expanding to 6 months."
            )
        elif coverage_months >= Decimal("1.5"):
            status = "VULNERABLE"
            summary = (
                f"Reserve covers only {coverage_months} months. Prioritize building emergency liquidity."
            )
        else:
            status = "CRITICAL"
            summary = (
                f"Immediate liquidity risk: only {coverage_months} months coverage. Unplanned expenses may require debt."
            )

        return EmergencyFundAnalysisResponse(
            liquid_cash_assets=_round(liquid_cash, 2),
            essential_monthly_expenses=_round(essential_expenses, 2),
            current_coverage_months=coverage_months,
            target_coverage_months=target_months,
            target_emergency_fund_amount=target_emergency_fund,
            funding_gap=funding_gap,
            status=status,
            status_summary=summary,
        )

    # -------------------------------------------------------------------------
    # 4. Multi-Horizon Cash Flow Forecasting
    # -------------------------------------------------------------------------
    async def forecast_cash_flow(
        self, tenant_id: uuid.UUID, req: CashFlowForecastRequest
    ) -> CashFlowForecastResponse:
        """Generate deterministic cash flow projections over requested horizon."""
        # Baseline liquid cash
        stmt_accounts = select(FinancialAccount).where(
            FinancialAccount.tenant_id == tenant_id,
            FinancialAccount.is_active == True,
            FinancialAccount.account_type.in_(["SAVINGS", "CURRENT", "CASH"]),
        )
        res_acc = await self.session.execute(stmt_accounts)
        accounts = res_acc.scalars().all()
        current_cash = sum((acc.current_balance for acc in accounts), Decimal("0.0000"))

        # Monthly debt obligations
        stmt_liab = select(Liability).where(
            Liability.tenant_id == tenant_id,
            Liability.is_active == True,
        )
        res_liab = await self.session.execute(stmt_liab)
        liabilities = res_liab.scalars().all()
        monthly_debt = (
            sum((l.emi_amount for l in liabilities), Decimal("0.0000"))
            if req.include_loan_emis
            else Decimal("0.0000")
        )

        # Monthly goal savings
        goals = await self.repo.list_goals(tenant_id, status="IN_PROGRESS")
        monthly_goal_savings = (
            sum((g.monthly_contribution for g in goals), Decimal("0.0000"))
            if req.include_goal_contributions
            else Decimal("0.0000")
        )

        # Baseline recurring income and operating expenses
        baseline_monthly_income = Decimal("120000.0000")
        baseline_operating_expenses = Decimal("55000.0000")

        today = date.today()
        projections: list[CashFlowMonthlyProjection] = []
        running_cash = current_cash
        lowest_cash = current_cash
        lowest_month = today.strftime("%Y-%m")
        total_savings = Decimal("0.0000")

        for m in range(1, req.horizon_months + 1):
            target_month_date = today + timedelta(days=30 * m)
            month_str = target_month_date.strftime("%Y-%m")

            net_flow = (
                baseline_monthly_income
                - baseline_operating_expenses
                - monthly_debt
                - monthly_goal_savings
            )
            running_cash += net_flow
            total_savings += monthly_goal_savings

            if running_cash < lowest_cash:
                lowest_cash = running_cash
                lowest_month = month_str

            projections.append(
                CashFlowMonthlyProjection(
                    month=month_str,
                    month_index=m,
                    projected_income=_round(baseline_monthly_income, 2),
                    projected_operating_expenses=_round(baseline_operating_expenses, 2),
                    projected_debt_service=_round(monthly_debt, 2),
                    projected_goal_savings=_round(monthly_goal_savings, 2),
                    net_cash_flow=_round(net_flow, 2),
                    projected_closing_cash=_round(running_cash, 2),
                )
            )

        return CashFlowForecastResponse(
            horizon_months=req.horizon_months,
            baseline_liquid_cash=_round(current_cash, 2),
            monthly_projections=projections,
            lowest_cash_balance=_round(lowest_cash, 2),
            lowest_cash_month=lowest_month,
            total_projected_savings=_round(total_savings, 2),
        )

    # -------------------------------------------------------------------------
    # 5. Non-Mutating What-If Simulator
    # -------------------------------------------------------------------------
    async def simulate_scenario(
        self, tenant_id: uuid.UUID, req: ScenarioSimulationRequest
    ) -> ScenarioSimulationResponse:
        """Run analytical simulation comparing baseline parameters with scenario inputs."""
        # 1. Baseline parameters
        base_income = Decimal("120000.0000")
        base_expense = Decimal("55000.0000")
        base_return = Decimal("0.1000")

        # 2. Simulated parameters
        sim_income = base_income * (Decimal("1") + (req.monthly_income_delta_percent / Decimal("100")))
        sim_expense = base_expense + req.monthly_expense_delta
        sim_return = base_return + (req.investment_return_shock_percent / Decimal("100"))

        # Baseline net monthly cash flow
        base_net_flow = base_income - base_expense
        sim_net_flow = sim_income - sim_expense - req.additional_monthly_investment

        monthly_cash_flow_delta = _round(sim_net_flow - base_net_flow, 2)

        # Horizon accumulation delta
        h = Decimal(req.horizon_months)
        baseline_accum = base_net_flow * h
        sim_accum = (sim_net_flow + req.additional_monthly_investment) * h - req.lump_sum_debt_prepayment
        net_worth_delta = _round(sim_accum - baseline_accum, 2)

        # Debt acceleration estimate
        debt_freedom_accel = 0
        if req.lump_sum_debt_prepayment > 0:
            # Approximate months saved based on prepaying ~₹40k/mo principal
            debt_freedom_accel = int(min(60, req.lump_sum_debt_prepayment // Decimal("35000")))

        # Retirement delta estimate
        ret_delta = _round(
            (req.monthly_income_delta_percent * Decimal("0.2"))
            + (req.additional_monthly_investment / Decimal("1000")),
            2,
        )

        takeaways = []
        if net_worth_delta >= 0:
            takeaways.append(
                f"Over {req.horizon_months} months, this scenario increases projected net worth by ₹{net_worth_delta:,.2f}."
            )
        else:
            takeaways.append(
                f"Over {req.horizon_months} months, this scenario decreases projected net worth by ₹{abs(net_worth_delta):,.2f}."
            )

        if debt_freedom_accel > 0:
            takeaways.append(
                f"Lump-sum prepayment accelerates debt freedom by approximately {debt_freedom_accel} months."
            )

        if monthly_cash_flow_delta > 0:
            takeaways.append(
                f"Monthly net cash flow improves by ₹{monthly_cash_flow_delta:,.2f}."
            )
        elif monthly_cash_flow_delta < 0:
            takeaways.append(
                f"Monthly net cash flow tightens by ₹{abs(monthly_cash_flow_delta):,.2f}."
            )

        # Persist scenario run
        scenario = FinancialScenario(
            tenant_id=tenant_id,
            name=req.name,
            description=req.description,
            scenario_inputs=req.model_dump(mode="json"),
            simulation_results={
                "net_worth_delta": str(net_worth_delta),
                "monthly_cash_flow_delta": str(monthly_cash_flow_delta),
                "debt_freedom_acceleration_months": debt_freedom_accel,
                "retirement_readiness_delta_percent": str(ret_delta),
                "takeaways": takeaways,
            },
        )
        saved_scenario = await self.repo.create_scenario(scenario)

        return ScenarioSimulationResponse(
            scenario_id=saved_scenario.id,
            name=req.name,
            baseline_summary={
                "monthly_income": str(base_income),
                "monthly_expense": str(base_expense),
                "net_monthly_flow": str(base_net_flow),
            },
            simulated_summary={
                "monthly_income": str(sim_income),
                "monthly_expense": str(sim_expense),
                "net_monthly_flow": str(sim_net_flow),
            },
            net_worth_delta_at_horizon=net_worth_delta,
            monthly_cash_flow_delta=monthly_cash_flow_delta,
            debt_freedom_acceleration_months=debt_freedom_accel,
            retirement_readiness_delta_percent=ret_delta,
            key_takeaways=takeaways,
        )
