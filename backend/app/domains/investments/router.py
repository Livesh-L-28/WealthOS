"""WealthOS Professional Investment Accounting REST API Endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.logging import get_logger
from app.core.security import TenantContext, get_current_tenant_context
from app.domains.investments.schemas import (
    CorporateActionResponse,
    CorporateActionSplitRequest,
    DividendRecordRequest,
    FinancialInstrumentCreate,
    FinancialInstrumentResponse,
    HoldingLotResponse,
    InvestmentBuyRequest,
    InvestmentSellRequest,
    InvestmentTransactionResponse,
    PassiveIncomeResponse,
    PortfolioSummaryResponse,
)
from app.domains.investments.service import InvestmentService

logger = get_logger("wealthos.investments")

router = APIRouter()


@router.get(
    "/portfolio",
    response_model=PortfolioSummaryResponse,
    summary="Get executive investment portfolio summary",
)
async def get_portfolio_summary(
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> PortfolioSummaryResponse:
    """Consolidate portfolio market value, Realized P&L, Unrealized P&L, and XIRR."""
    service = InvestmentService(session)
    return await service.get_portfolio_summary(context.tenant.id)


@router.get(
    "/instruments",
    response_model=list[FinancialInstrumentResponse],
    summary="List securities master instruments",
)
async def list_instruments(
    search: str | None = Query(None, description="Search by symbol or name"),
    limit: int = Query(50, ge=1, le=200),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> list[FinancialInstrumentResponse]:
    """List available instruments for trading and valuation."""
    service = InvestmentService(session)
    insts = await service.list_instruments(search=search, limit=limit)
    return [FinancialInstrumentResponse.model_validate(i) for i in insts]


@router.post(
    "/instruments",
    response_model=FinancialInstrumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register instrument in securities master",
)
async def register_instrument(
    payload: FinancialInstrumentCreate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> FinancialInstrumentResponse:
    """Create or update an instrument with its latest market price."""
    service = InvestmentService(session)
    inst = await service.register_instrument(payload)
    await session.commit()
    return FinancialInstrumentResponse.model_validate(inst)


@router.get(
    "/lots",
    response_model=list[HoldingLotResponse],
    summary="List discrete holding acquisition lots",
)
async def list_holding_lots(
    account_id: uuid.UUID | None = Query(None),
    instrument_id: uuid.UUID | None = Query(None),
    lot_status: str | None = Query(None, description="OPEN, PARTIALLY_DISPOSED, CLOSED"),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> list[HoldingLotResponse]:
    """Retrieve FIFO acquisition lots for cost basis and tax lot tracking."""
    service = InvestmentService(session)
    return await service.list_holding_lots(
        tenant_id=context.tenant.id,
        account_id=account_id,
        instrument_id=instrument_id,
        lot_status=lot_status,
    )


@router.post(
    "/transactions/buy",
    response_model=InvestmentTransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record acquisition trade (initializes FIFO lot)",
)
async def record_buy_trade(
    payload: InvestmentBuyRequest,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> InvestmentTransactionResponse:
    """Record purchase of securities, capitalizes cost basis into a new lot."""
    service = InvestmentService(session)
    try:
        tx = await service.record_buy(context.tenant.id, payload)
        await session.commit()
        return tx
    except ValueError as e:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/transactions/sell",
    response_model=InvestmentTransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record disposal trade (consumes FIFO lots)",
)
async def record_sell_trade(
    payload: InvestmentSellRequest,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> InvestmentTransactionResponse:
    """Record disposal of securities, allocating cost basis strictly via FIFO."""
    service = InvestmentService(session)
    try:
        tx = await service.record_sell(context.tenant.id, payload)
        await session.commit()
        return tx
    except ValueError as e:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/transactions",
    response_model=list[InvestmentTransactionResponse],
    summary="List investment transaction history",
)
async def list_transactions(
    instrument_id: uuid.UUID | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> list[InvestmentTransactionResponse]:
    """Retrieve audited trades and disposals with Realized P&L."""
    service = InvestmentService(session)
    return await service.list_transactions(
        tenant_id=context.tenant.id,
        instrument_id=instrument_id,
        limit=limit,
    )


@router.post(
    "/corporate-actions/split",
    response_model=CorporateActionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Execute stock split across holding lots",
)
async def execute_stock_split(
    payload: CorporateActionSplitRequest,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> CorporateActionResponse:
    """Execute split corporate action adjusting units and purchase price while preserving cost basis."""
    service = InvestmentService(session)
    try:
        action = await service.execute_stock_split(context.tenant.id, payload)
        await session.commit()
        return CorporateActionResponse.model_validate(action)
    except ValueError as e:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/income/dividend",
    response_model=PassiveIncomeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record dividend or distribution income",
)
async def record_dividend(
    payload: DividendRecordRequest,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> PassiveIncomeResponse:
    """Record dividend distribution received with tax withholding."""
    service = InvestmentService(session)
    income = await service.record_dividend(context.tenant.id, payload)
    await session.commit()
    return income


@router.get(
    "/income",
    response_model=list[PassiveIncomeResponse],
    summary="List passive income distributions",
)
async def list_passive_income(
    limit: int = Query(50, ge=1, le=200),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> list[PassiveIncomeResponse]:
    """Retrieve dividends and distributions."""
    service = InvestmentService(session)
    return await service.list_passive_income(tenant_id=context.tenant.id, limit=limit)

