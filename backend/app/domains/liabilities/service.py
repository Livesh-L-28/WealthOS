"""WealthOS Liability & Debt Management Service."""

import calendar
import uuid
from datetime import UTC, date, datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.liabilities.models import (
    CreditCardStatement,
    Liability,
    LoanPaymentSchedule,
)
from app.domains.liabilities.repository import LiabilityRepository
from app.domains.liabilities.schemas import (
    CreditCardStatementCreate,
    CreditCardStatementResponse,
    DebtStrategyComparisonResponse,
    DebtStrategyPlan,
    DebtStrategyPlanItem,
    LiabilityCreate,
    LiabilityResponse,
    LiabilitySummaryResponse,
    LiabilityUpdate,
    LoanPaymentScheduleResponse,
    PrepaymentSimulationResponse,
    RecordPaymentRequest,
)

logger = get_logger("wealthos.liabilities")

FOUR_PLACES = Decimal("0.0001")


def quantize_currency(val: Decimal) -> Decimal:
    """Quantize decimal to 4 decimal places."""
    return val.quantize(FOUR_PLACES, rounding=ROUND_HALF_UP)


def add_months(d: date, months: int) -> date:
    """Safely increment a date by a given number of months."""
    year = d.year + (d.month + months - 1) // 12
    month = (d.month + months - 1) % 12 + 1
    max_day = calendar.monthrange(year, month)[1]
    day = min(d.day, max_day)
    return date(year, month, day)


class LiabilityService:
    """Core domain service for loans, credit cards, amortization schedules, and debt payoff strategies."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = LiabilityRepository(session)

    @staticmethod
    def calculate_emi(
        principal: Decimal,
        annual_interest_rate_percent: Decimal,
        tenure_months: int,
    ) -> Decimal:
        """Calculate monthly installment using reducing balance amortization formula.

        EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
        """
        if tenure_months <= 0 or principal <= Decimal("0"):
            return Decimal("0.0000")

        if annual_interest_rate_percent <= Decimal("0"):
            return quantize_currency(principal / Decimal(tenure_months))

        monthly_rate = annual_interest_rate_percent / Decimal("1200")  # (R / 100) / 12
        one_plus_r = Decimal(1) + monthly_rate
        compound_factor = one_plus_r ** tenure_months

        numerator = principal * monthly_rate * compound_factor
        denominator = compound_factor - Decimal(1)

        if denominator == Decimal("0"):
            return quantize_currency(principal / Decimal(tenure_months))

        emi = numerator / denominator
        return quantize_currency(emi)

    def generate_schedules_for_liability(
        self, liability: Liability
    ) -> list[LoanPaymentSchedule]:
        """Generate complete month-by-month loan payment schedule."""
        schedules: list[LoanPaymentSchedule] = []
        remaining = quantize_currency(liability.initial_principal)
        monthly_rate = liability.interest_rate / Decimal("1200")
        today = date.today()

        for k in range(1, liability.tenure_months + 1):
            due_d = add_months(liability.start_date, k)
            interest_comp = quantize_currency(remaining * monthly_rate)

            if k == liability.tenure_months or remaining <= liability.emi_amount:
                # Final adjustment to ensure exact zero remaining balance
                principal_comp = remaining
                expected_pmt = quantize_currency(principal_comp + interest_comp)
                remaining = Decimal("0.0000")
            else:
                principal_comp = quantize_currency(liability.emi_amount - interest_comp)
                if principal_comp > remaining:
                    principal_comp = remaining
                expected_pmt = quantize_currency(principal_comp + interest_comp)
                remaining = quantize_currency(remaining - principal_comp)

            # Determine initial status
            if due_d < today:
                status = "OVERDUE"
            elif due_d == today:
                status = "DUE"
            else:
                status = "UPCOMING"

            sched = LoanPaymentSchedule(
                id=uuid.uuid4(),
                tenant_id=liability.tenant_id,
                liability_id=liability.id,
                installment_number=k,
                due_date=due_d,
                expected_payment=expected_pmt,
                principal_component=principal_comp,
                interest_component=interest_comp,
                fee_component=Decimal("0.0000"),
                remaining_principal=remaining,
                payment_status=status,
                created_at=datetime.now(UTC),
            )
            schedules.append(sched)

        return schedules

    async def create_liability(
        self, tenant_id: uuid.UUID, payload: LiabilityCreate
    ) -> Liability:
        """Create a new liability, compute EMI if needed, and generate amortization schedule."""
        emi = payload.emi_amount
        if emi is None or emi <= Decimal("0"):
            emi = self.calculate_emi(
                principal=payload.initial_principal,
                annual_interest_rate_percent=payload.interest_rate,
                tenure_months=payload.tenure_months,
            )

        maturity_d = payload.maturity_date
        if maturity_d is None:
            maturity_d = add_months(payload.start_date, payload.tenure_months)

        cur_principal = payload.current_principal
        if cur_principal is None:
            cur_principal = payload.initial_principal

        liability = Liability(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            name=payload.name,
            liability_type=payload.liability_type,
            lender_name=payload.lender_name,
            initial_principal=quantize_currency(payload.initial_principal),
            current_principal=quantize_currency(cur_principal),
            interest_rate=payload.interest_rate,
            tenure_months=payload.tenure_months,
            emi_amount=quantize_currency(emi),
            start_date=payload.start_date,
            maturity_date=maturity_d,
            currency=payload.currency,
            gl_account_id=payload.gl_account_id,
            is_active=payload.is_active,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

        liability = await self.repo.create_liability(liability)

        # Generate amortization schedules for non-credit card loans
        if payload.liability_type != "CREDIT_CARD":
            schedules = self.generate_schedules_for_liability(liability)
            await self.repo.create_schedules(schedules)

        return liability

    async def get_liability(
        self, tenant_id: uuid.UUID, liability_id: uuid.UUID
    ) -> Liability | None:
        """Fetch liability by ID."""
        return await self.repo.get_liability(tenant_id, liability_id)

    async def list_liabilities(
        self, tenant_id: uuid.UUID, is_active: bool | None = None
    ) -> Sequence[Liability]:
        """Fetch all liabilities for a tenant."""
        return await self.repo.list_liabilities(tenant_id, is_active)

    async def update_liability(
        self, tenant_id: uuid.UUID, liability_id: uuid.UUID, payload: LiabilityUpdate
    ) -> Liability:
        """Update an existing liability."""
        liability = await self.repo.get_liability(tenant_id, liability_id)
        if not liability:
            raise ValueError("Liability not found")

        update_dict = payload.model_dump(exclude_unset=True)
        for key, val in update_dict.items():
            if hasattr(liability, key) and val is not None:
                if key in ["current_principal", "emi_amount"] and isinstance(val, Decimal):
                    val = quantize_currency(val)
                setattr(liability, key, val)

        liability.updated_at = datetime.now(UTC)
        return await self.repo.update_liability(liability)

    async def delete_liability(self, tenant_id: uuid.UUID, liability_id: uuid.UUID) -> None:
        """Delete a liability."""
        liability = await self.repo.get_liability(tenant_id, liability_id)
        if not liability:
            raise ValueError("Liability not found")
        await self.repo.delete_liability(liability)

    async def get_schedules(
        self, tenant_id: uuid.UUID, liability_id: uuid.UUID
    ) -> Sequence[LoanPaymentSchedule]:
        """Retrieve all schedule installments for a liability."""
        return await self.repo.get_schedules(tenant_id, liability_id)

    async def record_payment(
        self,
        tenant_id: uuid.UUID,
        liability_id: uuid.UUID,
        schedule_id: uuid.UUID,
        payload: RecordPaymentRequest,
    ) -> LoanPaymentSchedule:
        """Record an installment payment and reduce liability principal."""
        sched = await self.repo.get_schedule_by_id(tenant_id, schedule_id)
        if not sched or sched.liability_id != liability_id:
            raise ValueError("Loan payment schedule installment not found")

        liability = await self.repo.get_liability(tenant_id, liability_id)
        if not liability:
            raise ValueError("Liability not found")

        sched.payment_status = "PAID"
        sched.paid_date = payload.paid_date
        sched.actual_paid_amount = quantize_currency(payload.actual_paid_amount)
        if payload.transaction_id:
            sched.transaction_id = payload.transaction_id

        # Update liability current principal
        new_principal = max(
            Decimal("0.0000"),
            quantize_currency(liability.current_principal - sched.principal_component),
        )
        liability.current_principal = new_principal
        if new_principal == Decimal("0.0000"):
            liability.is_active = False

        await self.repo.update_schedule(sched)
        await self.repo.update_liability(liability)

        return sched

    def simulate_prepayment(
        self,
        liability: Liability,
        extra_monthly_payment: Decimal,
        lump_sum_amount: Decimal,
        lump_sum_month: int,
    ) -> PrepaymentSimulationResponse:
        """Simulate debt prepayment showing interest savings and months saved."""
        monthly_rate = liability.interest_rate / Decimal("1200")
        base_emi = liability.emi_amount
        cur_principal = quantize_currency(liability.current_principal)

        # 1. Baseline calculation (Original)
        orig_rem = cur_principal
        orig_total_int = Decimal("0.0000")
        orig_months = 0
        while orig_rem > Decimal("0.0001") and orig_months < 600:
            orig_months += 1
            i_comp = quantize_currency(orig_rem * monthly_rate)
            p_comp = min(orig_rem, max(Decimal("0.0000"), base_emi - i_comp))
            orig_total_int += i_comp
            orig_rem -= p_comp

        # 2. Prepayment simulation
        sim_rem = cur_principal
        sim_total_int = Decimal("0.0000")
        sim_months = 0

        while sim_rem > Decimal("0.0001") and sim_months < 600:
            sim_months += 1
            i_comp = quantize_currency(sim_rem * monthly_rate)
            p_comp = min(sim_rem, max(Decimal("0.0000"), base_emi - i_comp))
            sim_rem -= p_comp

            # Apply extra monthly payment
            if extra_monthly_payment > Decimal("0.0000") and sim_rem > Decimal("0.0000"):
                extra_p = min(sim_rem, extra_monthly_payment)
                sim_rem -= extra_p

            # Apply lump sum
            if sim_months == lump_sum_month and lump_sum_amount > Decimal("0.0000") and sim_rem > Decimal("0.0000"):
                lump_p = min(sim_rem, lump_sum_amount)
                sim_rem -= lump_p

            sim_total_int += i_comp

        months_saved = max(0, orig_months - sim_months)
        interest_saved = max(Decimal("0.0000"), orig_total_int - sim_total_int)
        new_payoff_d = add_months(date.today(), sim_months)

        return PrepaymentSimulationResponse(
            original_tenure_months=orig_months,
            original_total_interest=quantize_currency(orig_total_int),
            original_total_payment=quantize_currency(cur_principal + orig_total_int),
            new_tenure_months=sim_months,
            months_saved=months_saved,
            new_total_interest=quantize_currency(sim_total_int),
            interest_saved=quantize_currency(interest_saved),
            new_payoff_date=new_payoff_d,
        )

    async def compare_debt_strategies(
        self, tenant_id: uuid.UUID, extra_monthly_budget: Decimal
    ) -> DebtStrategyComparisonResponse:
        """Compare Debt Avalanche (highest APR first) vs Debt Snowball (lowest balance first)."""
        liabilities = await self.repo.list_liabilities(tenant_id, is_active=True)
        active_debts = [d for d in liabilities if d.current_principal > Decimal("0.0001")]

        if not active_debts:
            empty_plan = DebtStrategyPlan(
                strategy="NONE",
                total_interest_paid=Decimal("0.0000"),
                total_principal_paid=Decimal("0.0000"),
                total_cost=Decimal("0.0000"),
                months_to_debt_free=0,
                debt_free_date=date.today(),
                debts=[],
            )
            return DebtStrategyComparisonResponse(
                extra_monthly_budget=extra_monthly_budget,
                minimum_only=empty_plan,
                avalanche=empty_plan,
                snowball=empty_plan,
                avalanche_interest_savings=Decimal("0.0000"),
                snowball_interest_savings=Decimal("0.0000"),
                recommended_strategy="NONE",
            )

        def run_strategy_simulation(
            strategy_name: str,
            extra_budget: Decimal,
            sort_fn,
        ) -> DebtStrategyPlan:
            # Create working debt state dict
            debts_state = {
                d.id: {
                    "id": d.id,
                    "name": d.name,
                    "balance": quantize_currency(d.current_principal),
                    "initial_balance": quantize_currency(d.current_principal),
                    "rate": d.interest_rate,
                    "monthly_rate": d.interest_rate / Decimal("1200"),
                    "emi": d.emi_amount,
                    "payoff_month": 0,
                    "total_interest": Decimal("0.0000"),
                }
                for d in active_debts
            }

            month = 0
            freed_up_emi = Decimal("0.0000")

            while any(v["balance"] > Decimal("0.0001") for v in debts_state.values()) and month < 600:
                month += 1
                newly_paid_off_this_month = []

                # 1. Base monthly interest and minimum payment on all active debts
                for d_id, state in debts_state.items():
                    if state["balance"] <= Decimal("0.0001"):
                        continue

                    m_rate = state["monthly_rate"]
                    interest = quantize_currency(state["balance"] * m_rate)
                    state["total_interest"] += interest

                    min_p = min(state["balance"], max(Decimal("0.0000"), state["emi"] - interest))
                    state["balance"] = quantize_currency(state["balance"] - min_p)

                    if state["balance"] <= Decimal("0.0001"):
                        state["payoff_month"] = month
                        newly_paid_off_this_month.append(d_id)

                # 2. Apply extra budget + freed-up minimum payments to priority debt
                available_extra = extra_budget + freed_up_emi

                if available_extra > Decimal("0.0000") and strategy_name != "MINIMUM_ONLY":
                    # Filter active debts and sort according to strategy
                    active_candidates = [
                        state for state in debts_state.values() if state["balance"] > Decimal("0.0001")
                    ]
                    active_candidates.sort(key=sort_fn)

                    rem_extra = available_extra
                    for candidate in active_candidates:
                        if rem_extra <= Decimal("0.0000"):
                            break
                        extra_p = min(candidate["balance"], rem_extra)
                        candidate["balance"] = quantize_currency(candidate["balance"] - extra_p)
                        rem_extra -= extra_p

                        if candidate["balance"] <= Decimal("0.0001") and candidate["payoff_month"] == 0:
                            candidate["payoff_month"] = month
                            newly_paid_off_this_month.append(candidate["id"])

                # Add EMI of debts paid off this month to the snowball/avalanche snowball pool
                for d_id in newly_paid_off_this_month:
                    freed_up_emi += debts_state[d_id]["emi"]

            # Construct plan
            total_principal = sum(v["initial_balance"] for v in debts_state.values())
            total_interest = sum(v["total_interest"] for v in debts_state.values())
            total_cost = total_principal + total_interest

            plan_items = [
                DebtStrategyPlanItem(
                    liability_id=state["id"],
                    liability_name=state["name"],
                    current_balance=state["initial_balance"],
                    interest_rate=state["rate"],
                    payoff_month=state["payoff_month"] if state["payoff_month"] > 0 else month,
                    payoff_date=add_months(date.today(), state["payoff_month"] if state["payoff_month"] > 0 else month),
                    total_interest_paid=quantize_currency(state["total_interest"]),
                )
                for state in debts_state.values()
            ]

            return DebtStrategyPlan(
                strategy=strategy_name,
                total_interest_paid=quantize_currency(total_interest),
                total_principal_paid=quantize_currency(total_principal),
                total_cost=quantize_currency(total_cost),
                months_to_debt_free=month,
                debt_free_date=add_months(date.today(), month),
                debts=plan_items,
            )

        # Baseline: Minimum payments only
        min_plan = run_strategy_simulation(
            "MINIMUM_ONLY",
            Decimal("0.0000"),
            lambda s: 0,
        )

        # Avalanche: Highest APR first (rate descending)
        avalanche_plan = run_strategy_simulation(
            "AVALANCHE",
            extra_monthly_budget,
            lambda s: -s["rate"],
        )

        # Snowball: Lowest balance first (balance ascending)
        snowball_plan = run_strategy_simulation(
            "SNOWBALL",
            extra_monthly_budget,
            lambda s: s["balance"],
        )

        avalanche_savings = max(
            Decimal("0.0000"),
            min_plan.total_interest_paid - avalanche_plan.total_interest_paid,
        )
        snowball_savings = max(
            Decimal("0.0000"),
            min_plan.total_interest_paid - snowball_plan.total_interest_paid,
        )

        rec = "AVALANCHE" if avalanche_savings >= snowball_savings else "SNOWBALL"

        return DebtStrategyComparisonResponse(
            extra_monthly_budget=quantize_currency(extra_monthly_budget),
            minimum_only=min_plan,
            avalanche=avalanche_plan,
            snowball=snowball_plan,
            avalanche_interest_savings=quantize_currency(avalanche_savings),
            snowball_interest_savings=quantize_currency(snowball_savings),
            recommended_strategy=rec,
        )

    async def create_credit_card_statement(
        self, tenant_id: uuid.UUID, payload: CreditCardStatementCreate
    ) -> CreditCardStatement:
        """Register a credit card statement and calculate utilization."""
        liability = await self.repo.get_liability(tenant_id, payload.liability_id)
        if not liability:
            raise ValueError("Liability not found")

        avail_credit = payload.available_credit
        if avail_credit is None:
            avail_credit = max(
                Decimal("0.0000"),
                payload.credit_limit - payload.statement_balance,
            )

        stmt = CreditCardStatement(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            liability_id=payload.liability_id,
            statement_date=payload.statement_date,
            due_date=payload.due_date,
            statement_balance=quantize_currency(payload.statement_balance),
            minimum_due=quantize_currency(payload.minimum_due),
            credit_limit=quantize_currency(payload.credit_limit),
            available_credit=quantize_currency(avail_credit),
            finance_charges=quantize_currency(payload.finance_charges),
            status=payload.status,
            created_at=datetime.now(UTC),
        )

        # Update current principal on liability with latest statement balance
        liability.current_principal = quantize_currency(payload.statement_balance)
        await self.repo.update_liability(liability)

        return await self.repo.create_credit_card_statement(stmt)

    async def list_credit_card_statements(
        self, tenant_id: uuid.UUID, liability_id: uuid.UUID
    ) -> Sequence[CreditCardStatement]:
        """Fetch all billing statements for a credit card."""
        return await self.repo.list_credit_card_statements(tenant_id, liability_id)

    async def get_portfolio_summary(
        self, tenant_id: uuid.UUID
    ) -> LiabilitySummaryResponse:
        """Provide aggregate metrics on debt portfolio."""
        liabilities = await self.repo.list_liabilities(tenant_id, is_active=True)
        total_count = len(liabilities)
        total_principal = Decimal("0.0000")
        total_emi = Decimal("0.0000")
        weighted_rate_sum = Decimal("0.0000")

        for l in liabilities:
            total_principal += l.current_principal
            total_emi += l.emi_amount
            weighted_rate_sum += l.current_principal * l.interest_rate

        weighted_avg_rate = Decimal("0.0000")
        if total_principal > Decimal("0.0000"):
            weighted_avg_rate = (weighted_rate_sum / total_principal).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )

        upcoming_schedules = await self.repo.get_upcoming_schedules(tenant_id, limit=10)

        return LiabilitySummaryResponse(
            total_liabilities=total_count,
            total_outstanding_principal=quantize_currency(total_principal),
            total_monthly_emi=quantize_currency(total_emi),
            weighted_average_interest_rate=weighted_avg_rate,
            upcoming_installments=[
                LoanPaymentScheduleResponse.model_validate(s) for s in upcoming_schedules
            ],
        )

