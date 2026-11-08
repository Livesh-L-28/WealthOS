"""WealthOS Cash Management & Liquidity REST API Endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.logging import get_logger
from app.core.security import TenantContext, get_current_tenant_context
from app.domains.cash.schemas import (
    AccountTransferCreate,
    AccountTransferResponse,
    CashFlowForecastResponse,
    CashPositionSummary,
    FinancialAccountCreate,
    FinancialAccountResponse,
    LiquidityAnalyticsResponse,
    RecurringRuleCreate,
    RecurringRuleResponse,
    ScenarioSimulationRequest,
    ScenarioSimulationResponse,
)
from app.domains.cash.service import CashManagementService

logger = get_logger("wealthos.cash")

router = APIRouter()


@router.get(
    "/position",
    response_model=CashPositionSummary,
    summary="Get consolidated multi-account cash position",
)
async def get_cash_position(
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> CashPositionSummary:
    """Retrieve liquid balances, multi-currency breakdown, and account status."""
    service = CashManagementService(session)
    return await service.get_cash_position(context.tenant.id)


@router.post(
    "/accounts",
    response_model=FinancialAccountResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or link a financial account",
)
async def create_financial_account(
    payload: FinancialAccountCreate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> FinancialAccountResponse:
    """Register a new bank account, card, or cash wallet."""
    service = CashManagementService(session)
    account = await service.create_account(context.tenant.id, payload)
    await session.commit()
    return FinancialAccountResponse.model_validate(account)


@router.post(
    "/transfers",
    response_model=AccountTransferResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Execute owned account transfer with transfer neutrality",
)
async def execute_transfer(
    payload: AccountTransferCreate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> AccountTransferResponse:
    """Execute transfer between owned accounts; transfer neutrality enforced (ΔNetWorth = 0)."""
    service = CashManagementService(session)
    try:
        transfer = await service.execute_transfer(context.tenant.id, payload)
        await session.commit()
        return AccountTransferResponse.model_validate(transfer)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get(
    "/transfers",
    response_model=list[AccountTransferResponse],
    summary="List historical account transfers",
)
async def list_transfers(
    limit: int = Query(50, ge=1, le=200),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> list[AccountTransferResponse]:
    """Retrieve audit history of inter-account transfers."""
    service = CashManagementService(session)
    transfers = await service.repo.list_transfers(context.tenant.id, limit=limit)
    return [AccountTransferResponse.model_validate(t) for t in transfers]


@router.post(
    "/recurring-rules",
    response_model=RecurringRuleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register recurring income or expense obligation rule",
)
async def create_recurring_rule(
    payload: RecurringRuleCreate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> RecurringRuleResponse:
    """Configure recurring transaction rule for payroll, rent, EMI, or subscriptions."""
    service = CashManagementService(session)
    try:
        rule = await service.create_recurring_rule(context.tenant.id, payload)
        await session.commit()
        return RecurringRuleResponse.model_validate(rule)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get(
    "/recurring-rules",
    response_model=list[RecurringRuleResponse],
    summary="List active recurring rules",
)
async def list_recurring_rules(
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> list[RecurringRuleResponse]:
    """Retrieve active scheduled obligations and income rules."""
    service = CashManagementService(session)
    rules = await service.repo.list_recurring_rules(context.tenant.id, is_active=True)
    return [RecurringRuleResponse.model_validate(r) for r in rules]


@router.get(
    "/forecast",
    response_model=CashFlowForecastResponse,
    summary="Generate deterministic cash flow forecast",
)
async def get_cash_forecast(
    horizon_days: int = Query(30, ge=7, le=365, description="Forecast horizon in days (30, 90, 365)"),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> CashFlowForecastResponse:
    """Generate deterministic cash flow forecast across 30-day, 90-day, or 12-month horizons."""
    service = CashManagementService(session)
    forecast = await service.generate_forecast(context.tenant.id, horizon_days=horizon_days)
    await session.commit()
    return forecast


@router.get(
    "/liquidity",
    response_model=LiquidityAnalyticsResponse,
    summary="Get liquidity and emergency fund analytics",
)
async def get_liquidity_analytics(
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> LiquidityAnalyticsResponse:
    """Compute emergency fund coverage months, monthly essential burn, and short-term surplus."""
    service = CashManagementService(session)
    return await service.get_liquidity_analytics(context.tenant.id)


@router.post(
    "/simulate-scenario",
    response_model=ScenarioSimulationResponse,
    summary="Run what-if scenario simulation",
)
async def simulate_scenario(
    payload: ScenarioSimulationRequest,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> ScenarioSimulationResponse:
    """Simulate what-if financial events (EMI, income shock, expense rise) without mutating records."""
    service = CashManagementService(session)
    result = await service.simulate_scenario(context.tenant.id, payload)
    await session.commit()
    return result
