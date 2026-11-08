"""WealthOS Cash Management & Liquidity Domain Service.

Implements multi-account cash consolidation, transfer neutrality,
deterministic 30d/90d/12m cash flow forecasting, and scenario simulation.
"""

import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.cash.models import (
    AccountTransfer,
    FinancialAccount,
    FinancialScenario,
    ForecastRun,
    RecurringTransactionRule,
)
from app.domains.cash.repository import CashRepository
from app.domains.cash.schemas import (
    AccountTransferCreate,
    AccountTransferResponse,
    CashFlowForecastResponse,
    CashPositionSummary,
    FinancialAccountCreate,
    FinancialAccountResponse,
    ForecastItem,
    LiquidityAnalyticsResponse,
    RecurringRuleCreate,
    RecurringRuleResponse,
    ScenarioSimulationRequest,
    ScenarioSimulationResponse,
)


class CashManagementService:
    """Core domain service for cash, liquidity, forecasting, and transfer neutrality."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = CashRepository(session)

    async def get_cash_position(self, tenant_id: uuid.UUID) -> CashPositionSummary:
        """Consolidate cash balances across all active financial accounts."""
        accounts = await self.repo.list_financial_accounts(tenant_id)
        liquid_types = {"SAVINGS", "CURRENT", "CASH"}

        total_liquid = Decimal("0.0000")
        currency_breakdown: dict[str, Decimal] = {}

        for acct in accounts:
            curr = acct.currency or "INR"
            bal = acct.available_balance if acct.available_balance is not None else acct.current_balance

            # Track currency breakdown
            currency_breakdown[curr] = currency_breakdown.get(curr, Decimal("0.0000")) + bal

            # Total liquid reserves in base currency (INR)
            if acct.account_type in liquid_types and curr == "INR":
                total_liquid += bal

        return CashPositionSummary(
            total_liquid_cash=total_liquid,
            currency="INR",
            accounts=[FinancialAccountResponse.model_validate(a) for a in accounts],
            currency_breakdown=currency_breakdown,
            last_synced_at=datetime.now(UTC),
        )

    async def create_account(
        self, tenant_id: uuid.UUID, payload: FinancialAccountCreate
    ) -> FinancialAccount:
        """Create a new financial account."""
        account = FinancialAccount(
            tenant_id=tenant_id,
            account_name=payload.account_name,
            account_number_mask=payload.account_number_mask,
            account_type=payload.account_type,
            currency=payload.currency,
            current_balance=payload.current_balance,
            available_balance=payload.available_balance or payload.current_balance,
            institution_id=payload.institution_id,
            gl_account_id=payload.gl_account_id,
        )
        return await self.repo.create_financial_account(account)

    async def execute_transfer(
        self, tenant_id: uuid.UUID, payload: AccountTransferCreate
    ) -> AccountTransfer:
        """Execute transfer between owned accounts preserving transfer neutrality."""
        if payload.source_account_id == payload.destination_account_id:
            raise ValueError("Source and destination accounts must be distinct")

        source = await self.repo.get_financial_account(tenant_id, payload.source_account_id)
        if not source:
            raise ValueError(f"Source account {payload.source_account_id} not found in workspace")

        dest = await self.repo.get_financial_account(tenant_id, payload.destination_account_id)
        if not dest:
            raise ValueError(f"Destination account {payload.destination_account_id} not found in workspace")

        total_deduction = payload.amount + payload.fee_amount
        if source.current_balance < total_deduction:
            raise ValueError(
                f"Insufficient funds: available {source.current_balance} {source.currency}, required {total_deduction}"
            )

        # Update account balances atomically (transfer neutrality)
        source.current_balance -= total_deduction
        if source.available_balance is not None:
            source.available_balance -= total_deduction

        dest.current_balance += payload.amount
        if dest.available_balance is not None:
            dest.available_balance += payload.amount

        transfer = AccountTransfer(
            tenant_id=tenant_id,
            source_account_id=source.id,
            destination_account_id=dest.id,
            amount=payload.amount,
            currency=payload.currency,
            exchange_rate=payload.exchange_rate,
            fee_amount=payload.fee_amount,
            status="COMPLETED",
            transfer_date=payload.transfer_date,
        )
        return await self.repo.create_transfer(transfer)

    async def create_recurring_rule(
        self, tenant_id: uuid.UUID, payload: RecurringRuleCreate
    ) -> RecurringTransactionRule:
        """Register a new recurring payment or income rule."""
        acct = await self.repo.get_financial_account(tenant_id, payload.account_id)
        if not acct:
            raise ValueError(f"Account {payload.account_id} not found in workspace")

        rule = RecurringTransactionRule(
            tenant_id=tenant_id,
            account_id=acct.id,
            name=payload.name,
            expected_amount=payload.expected_amount,
            currency=payload.currency,
            direction=payload.direction,
            recurrence_interval=payload.recurrence_interval,
            next_due_date=payload.next_due_date,
            is_active=True,
        )
        return await self.repo.create_recurring_rule(rule)

    async def generate_forecast(
        self, tenant_id: uuid.UUID, horizon_days: int = 30
    ) -> CashFlowForecastResponse:
        """Generate deterministic multi-horizon cash flow projection."""
        position = await self.get_cash_position(tenant_id)
        opening_cash = position.total_liquid_cash
        rules = await self.repo.list_recurring_rules(tenant_id, is_active=True)

        today = date.today()
        step_days = 1 if horizon_days <= 30 else (7 if horizon_days <= 90 else 30)
        num_steps = max(1, horizon_days // step_days)

        current_cash = opening_cash
        total_inflow = Decimal("0.0000")
        total_outflow = Decimal("0.0000")
        min_cash = current_cash

        items: list[ForecastItem] = []

        # Default monthly assumptions if no rules present
        monthly_inflow = sum(
            (r.expected_amount for r in rules if r.direction == "INFLOW"), Decimal("0.0000")
        )
        monthly_outflow = sum(
            (r.expected_amount for r in rules if r.direction == "OUTFLOW"), Decimal("0.0000")
        )

        if monthly_inflow == Decimal("0.0000"):
            monthly_inflow = Decimal("85000.0000")  # Baseline salary estimate
        if monthly_outflow == Decimal("0.0000"):
            monthly_outflow = Decimal("45000.0000")  # Baseline burn estimate

        for step in range(1, num_steps + 1):
            target_date = today + timedelta(days=step * step_days)
            date_label = target_date.strftime("%d %b %Y" if horizon_days <= 90 else "%b %Y")

            # Proportionate period amounts
            ratio = Decimal(step_days) / Decimal(30)
            period_inflow = (monthly_inflow * ratio).quantize(Decimal("0.0001"))
            period_outflow = (monthly_outflow * ratio).quantize(Decimal("0.0001"))
            net_change = period_inflow - period_outflow

            current_cash += net_change
            if current_cash < min_cash:
                min_cash = current_cash

            total_inflow += period_inflow
            total_outflow += period_outflow

            classification = "CONFIRMED" if step <= 2 and horizon_days <= 30 else (
                "SCHEDULED" if step <= 4 else "EXPECTED"
            )

            items.append(
                ForecastItem(
                    date_label=date_label,
                    inflow=period_inflow,
                    outflow=period_outflow,
                    net_cash_flow=net_change,
                    closing_cash=current_cash,
                    classification=classification,
                )
            )

        net_change = total_inflow - total_outflow
        closing_cash = current_cash

        assumptions = {
            "horizon_days": horizon_days,
            "step_interval_days": step_days,
            "monthly_inflow_assumed": str(monthly_inflow),
            "monthly_outflow_assumed": str(monthly_outflow),
            "rules_applied_count": len(rules),
            "transfer_neutrality_enforced": True,
        }

        # Persist forecast run
        run_record = ForecastRun(
            tenant_id=tenant_id,
            run_name=f"{horizon_days}D Deterministic Cash Projection",
            horizon_months=max(1, horizon_days // 30),
            baseline_date=today,
            assumptions=assumptions,
            projection_data={"closing_cash": str(closing_cash), "items_count": len(items)},
        )
        await self.repo.save_forecast_run(run_record)

        return CashFlowForecastResponse(
            horizon_days=horizon_days,
            baseline_date=today,
            opening_cash=opening_cash,
            total_inflow=total_inflow,
            total_outflow=total_outflow,
            net_change=net_change,
            closing_cash=closing_cash,
            minimum_projected_cash=min_cash,
            assumptions=assumptions,
            items=items,
        )

    async def get_liquidity_analytics(self, tenant_id: uuid.UUID) -> LiquidityAnalyticsResponse:
        """Calculate liquidity coverage and safety margins."""
        position = await self.get_cash_position(tenant_id)
        liquid_reserves = position.total_liquid_cash

        rules = await self.repo.list_recurring_rules(tenant_id, is_active=True)
        monthly_essential = sum(
            (r.expected_amount for r in rules if r.direction == "OUTFLOW"), Decimal("0.0000")
        )
        if monthly_essential == Decimal("0.0000"):
            monthly_essential = Decimal("45000.0000")  # Default conservative burn

        coverage_months = (
            (liquid_reserves / monthly_essential).quantize(Decimal("0.1"))
            if monthly_essential > 0
            else Decimal("99.9")
        )

        upcoming_30d = monthly_essential
        surplus = liquid_reserves - upcoming_30d
        safety_threshold = monthly_essential * Decimal("3.0")  # 3 months emergency buffer

        return LiquidityAnalyticsResponse(
            total_liquid_reserves=liquid_reserves,
            monthly_essential_burn=monthly_essential,
            emergency_fund_coverage_months=coverage_months,
            upcoming_obligations_30d=upcoming_30d,
            short_term_surplus=surplus,
            minimum_safety_threshold=safety_threshold,
            is_liquidity_sufficient=(liquid_reserves >= safety_threshold),
        )

    async def simulate_scenario(
        self, tenant_id: uuid.UUID, request: ScenarioSimulationRequest
    ) -> ScenarioSimulationResponse:
        """Simulate what-if cash scenario without modifying actual financial records."""
        baseline = await self.generate_forecast(tenant_id, horizon_days=request.horizon_months * 30)

        # Apply simulation parameters deterministically
        simulated_items: list[ForecastItem] = []
        sim_cash = baseline.opening_cash - request.one_time_expense
        min_sim_cash = sim_cash

        for item in baseline.items:
            # Adjust inflow by percentage
            inflow_adj = item.inflow * (Decimal("1.0") + (request.income_change_percent / Decimal("100.0")))
            # Adjust outflow by monthly expense increase and EMI
            outflow_adj = item.outflow + request.monthly_expense_increase + request.new_emi_amount

            net = inflow_adj - outflow_adj
            sim_cash += net
            if sim_cash < min_sim_cash:
                min_sim_cash = sim_cash

            simulated_items.append(
                ForecastItem(
                    date_label=item.date_label,
                    inflow=inflow_adj.quantize(Decimal("0.0001")),
                    outflow=outflow_adj.quantize(Decimal("0.0001")),
                    net_cash_flow=net.quantize(Decimal("0.0001")),
                    closing_cash=sim_cash.quantize(Decimal("0.0001")),
                    classification="ESTIMATED",
                )
            )

        variance = sim_cash - baseline.closing_cash

        scenario_record = FinancialScenario(
            tenant_id=tenant_id,
            name=request.scenario_name,
            description="User-configured liquidity simulation",
            scenario_inputs={
                "income_change_percent": str(request.income_change_percent),
                "monthly_expense_increase": str(request.monthly_expense_increase),
                "one_time_expense": str(request.one_time_expense),
                "new_emi_amount": str(request.new_emi_amount),
            },
            simulation_results={
                "baseline_closing": str(baseline.closing_cash),
                "simulated_closing": str(sim_cash),
                "variance": str(variance),
            },
        )
        await self.repo.save_scenario(scenario_record)

        return ScenarioSimulationResponse(
            scenario_name=request.scenario_name,
            baseline_closing_cash=baseline.closing_cash,
            simulated_closing_cash=sim_cash,
            cash_variance=variance,
            minimum_simulated_cash=min_sim_cash,
            emergency_coverage_impact_months=(variance / Decimal("45000.0000")).quantize(Decimal("0.1")),
            baseline_trajectory=baseline.items,
            simulated_trajectory=simulated_items,
        )
