"""WealthOS Liability & Debt Management REST API Endpoints."""

import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.logging import get_logger
from app.core.security import TenantContext, get_current_tenant_context
from app.domains.liabilities.schemas import (
    CreditCardStatementCreate,
    CreditCardStatementResponse,
    DebtStrategyComparisonRequest,
    DebtStrategyComparisonResponse,
    LiabilityCreate,
    LiabilityResponse,
    LiabilitySummaryResponse,
    LiabilityUpdate,
    LoanPaymentScheduleResponse,
    PrepaymentSimulationRequest,
    PrepaymentSimulationResponse,
    RecordPaymentRequest,
)
from app.domains.liabilities.service import LiabilityService

logger = get_logger("wealthos.liabilities")

router = APIRouter()


@router.get(
    "/summary",
    response_model=LiabilitySummaryResponse,
    summary="Get debt portfolio aggregate summary",
)
async def get_portfolio_summary(
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> LiabilitySummaryResponse:
    """Retrieve portfolio metrics, total EMI obligations, and upcoming installments."""
    service = LiabilityService(session)
    return await service.get_portfolio_summary(context.tenant.id)


@router.post(
    "/strategies/compare",
    response_model=DebtStrategyComparisonResponse,
    summary="Compare Debt Avalanche vs Debt Snowball strategies",
)
async def compare_debt_strategies(
    payload: DebtStrategyComparisonRequest,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> DebtStrategyComparisonResponse:
    """Simulate debt freedom timelines under Avalanche, Snowball, and Minimum Payments."""
    service = LiabilityService(session)
    return await service.compare_debt_strategies(
        context.tenant.id, payload.extra_monthly_budget
    )


@router.get(
    "",
    response_model=list[LiabilityResponse],
    summary="List all liabilities",
)
async def list_liabilities(
    is_active: bool | None = Query(None, description="Filter active vs closed liabilities"),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> list[LiabilityResponse]:
    """Retrieve all debt obligations and credit facilities for the current tenant."""
    service = LiabilityService(session)
    liabilities = await service.list_liabilities(context.tenant.id, is_active=is_active)
    return [LiabilityResponse.model_validate(l) for l in liabilities]


@router.post(
    "",
    response_model=LiabilityResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new liability obligation",
)
async def create_liability(
    payload: LiabilityCreate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> LiabilityResponse:
    """Create a loan or debt facility and automatically generate amortization schedules."""
    service = LiabilityService(session)
    liability = await service.create_liability(context.tenant.id, payload)
    return LiabilityResponse.model_validate(liability)


@router.get(
    "/{liability_id}",
    response_model=LiabilityResponse,
    summary="Get liability details",
)
async def get_liability(
    liability_id: uuid.UUID,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> LiabilityResponse:
    """Fetch details of a specific liability obligation."""
    service = LiabilityService(session)
    liability = await service.get_liability(context.tenant.id, liability_id)
    if not liability:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Liability not found")
    return LiabilityResponse.model_validate(liability)


@router.patch(
    "/{liability_id}",
    response_model=LiabilityResponse,
    summary="Update liability details",
)
async def update_liability(
    liability_id: uuid.UUID,
    payload: LiabilityUpdate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> LiabilityResponse:
    """Update fields on an existing liability."""
    service = LiabilityService(session)
    try:
        updated = await service.update_liability(context.tenant.id, liability_id, payload)
        return LiabilityResponse.model_validate(updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete(
    "/{liability_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a liability obligation",
)
async def delete_liability(
    liability_id: uuid.UUID,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    """Remove a liability and all linked schedules."""
    service = LiabilityService(session)
    try:
        await service.delete_liability(context.tenant.id, liability_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/{liability_id}/schedules",
    response_model=list[LoanPaymentScheduleResponse],
    summary="Get loan amortization schedule",
)
async def get_loan_schedules(
    liability_id: uuid.UUID,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> list[LoanPaymentScheduleResponse]:
    """Retrieve full month-by-month repayment breakdown with principal/interest split."""
    service = LiabilityService(session)
    schedules = await service.get_schedules(context.tenant.id, liability_id)
    return [LoanPaymentScheduleResponse.model_validate(s) for s in schedules]


@router.post(
    "/{liability_id}/schedules/{schedule_id}/pay",
    response_model=LoanPaymentScheduleResponse,
    summary="Record loan installment payment",
)
async def record_loan_payment(
    liability_id: uuid.UUID,
    schedule_id: uuid.UUID,
    payload: RecordPaymentRequest,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> LoanPaymentScheduleResponse:
    """Record an installment payment and reduce outstanding liability balance."""
    service = LiabilityService(session)
    try:
        sched = await service.record_payment(
            context.tenant.id, liability_id, schedule_id, payload
        )
        return LoanPaymentScheduleResponse.model_validate(sched)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/{liability_id}/simulate-prepayment",
    response_model=PrepaymentSimulationResponse,
    summary="Simulate early loan prepayment",
)
async def simulate_prepayment(
    liability_id: uuid.UUID,
    payload: PrepaymentSimulationRequest,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> PrepaymentSimulationResponse:
    """Calculate tenure reduction and interest savings under early repayment."""
    service = LiabilityService(session)
    liability = await service.get_liability(context.tenant.id, liability_id)
    if not liability:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Liability not found")

    return service.simulate_prepayment(
        liability=liability,
        extra_monthly_payment=payload.extra_monthly_payment,
        lump_sum_amount=payload.lump_sum_amount,
        lump_sum_month=payload.lump_sum_month,
    )


@router.post(
    "/credit-cards/statements",
    response_model=CreditCardStatementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register credit card statement",
)
async def create_credit_card_statement(
    payload: CreditCardStatementCreate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> CreditCardStatementResponse:
    """Register billing statement and track utilization."""
    service = LiabilityService(session)
    try:
        stmt = await service.create_credit_card_statement(context.tenant.id, payload)
        util_pct = (
            (stmt.statement_balance / stmt.credit_limit * Decimal("100.00")).quantize(
                Decimal("0.01")
            )
            if stmt.credit_limit > Decimal("0")
            else Decimal("0.00")
        )
        resp = CreditCardStatementResponse(
            id=stmt.id,
            tenant_id=stmt.tenant_id,
            liability_id=stmt.liability_id,
            statement_date=stmt.statement_date,
            due_date=stmt.due_date,
            statement_balance=stmt.statement_balance,
            minimum_due=stmt.minimum_due,
            credit_limit=stmt.credit_limit,
            available_credit=stmt.available_credit,
            finance_charges=stmt.finance_charges,
            status=stmt.status,
            utilization_percentage=util_pct,
            created_at=stmt.created_at,
        )
        return resp
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/{liability_id}/statements",
    response_model=list[CreditCardStatementResponse],
    summary="List credit card statements",
)
async def list_credit_card_statements(
    liability_id: uuid.UUID,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> list[CreditCardStatementResponse]:
    """Retrieve billing statements for a credit card."""
    service = LiabilityService(session)
    stmts = await service.list_credit_card_statements(context.tenant.id, liability_id)
    results: list[CreditCardStatementResponse] = []
    for s in stmts:
        util_pct = (
            (s.statement_balance / s.credit_limit * Decimal("100.00")).quantize(
                Decimal("0.01")
            )
            if s.credit_limit > Decimal("0")
            else Decimal("0.00")
        )
        results.append(
            CreditCardStatementResponse(
                id=s.id,
                tenant_id=s.tenant_id,
                liability_id=s.liability_id,
                statement_date=s.statement_date,
                due_date=s.due_date,
                statement_balance=s.statement_balance,
                minimum_due=s.minimum_due,
                credit_limit=s.credit_limit,
                available_credit=s.available_credit,
                finance_charges=s.finance_charges,
                status=s.status,
                utilization_percentage=util_pct,
                created_at=s.created_at,
            )
        )
    return results

