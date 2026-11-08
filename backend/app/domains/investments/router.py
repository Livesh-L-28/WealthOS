"""WealthOS Professional Investment Accounting REST API Endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.logging import get_logger
from app.core.security import TenantContext, get_current_tenant_context
from app.domains.investments.schemas import (
    BrokerSyncRequest,
    BrokerSyncResponse,
    CorporateActionResponse,
    CorporateActionSplitRequest,
    CorporateActionSyncRequest,
    CorporateActionSyncResponse,
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
from app.domains.investments.broker_sync import (
    BrokerPortfolioSyncService,
    BrokerSyncError,
    CasMutualFundAdapter,
    UpstoxBrokerAdapter,
    ZerodhaKiteAdapter,
)
from app.domains.investments.corporate_actions_sync import CorporateActionsSyncService


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


@router.post(
    "/sync/broker",
    response_model=BrokerSyncResponse,
    status_code=status.HTTP_200_OK,
    summary="Synchronize holdings from Zerodha, Upstox, or CAMS/KFintech eCAS",
)
async def sync_broker_portfolio(
    payload: BrokerSyncRequest,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> BrokerSyncResponse:
    """Sync holdings from supported broker/RTA and capitalize into FIFO acquisition lots."""
    from app.domains.investments.repository import InvestmentRepository

    repo = InvestmentRepository(session)
    sync_service = BrokerPortfolioSyncService(repo)

    try:
        if payload.provider == "UPSTOX":
            if not payload.access_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Upstox provider requires 'access_token'.",
                )
            holdings = await UpstoxBrokerAdapter.fetch_holdings(payload.access_token)
        elif payload.provider == "ZERODHA":
            if not payload.api_key or not payload.access_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Zerodha provider requires both 'api_key' and 'access_token'.",
                )
            holdings = await ZerodhaKiteAdapter.fetch_holdings(payload.api_key, payload.access_token)
        elif payload.provider == "CAMS_KFINTECH_CAS":
            if not payload.cas_payload:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="CAMS/KFintech provider requires 'cas_payload'.",
                )
            holdings = CasMutualFundAdapter.parse_cas_payload(payload.cas_payload)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported broker provider: {payload.provider}",
            )

        res = await sync_service.sync_holdings(
            tenant_id=context.tenant.id,
            account_id=payload.account_id,
            provider=payload.provider,
            holdings_data=holdings,
        )
        await session.commit()
        return BrokerSyncResponse(**res)
    except BrokerSyncError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.post(
    "/sync/corporate-actions",
    response_model=CorporateActionSyncResponse,
    status_code=status.HTTP_200_OK,
    summary="Scan and auto-apply corporate actions (splits, bonus, dividends)",
)
async def sync_corporate_actions(
    payload: CorporateActionSyncRequest,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> CorporateActionSyncResponse:
    """Detect and execute stock splits, bonus allotments, and dividends across tenant holdings."""
    from app.domains.investments.repository import InvestmentRepository

    repo = InvestmentRepository(session)
    sync_service = CorporateActionsSyncService(repo)
    res = await sync_service.sync_and_apply_corporate_actions(
        tenant_id=context.tenant.id,
        symbols_filter=payload.symbols,
        auto_apply=payload.auto_apply,
        external_actions=payload.custom_actions,
    )
    await session.commit()
    return CorporateActionSyncResponse(**res)


@router.get(
    "/corporate-actions/public-feed",
    summary="Retrieve public corporate actions announcements for Indian equities",
)
async def get_public_corporate_actions_feed(
    symbols: str | None = Query(None, description="Comma-separated symbols, e.g. TCS,RELIANCE,INFY"),
    context: TenantContext = Depends(get_current_tenant_context),
) -> list[dict]:
    """Retrieve corporate actions from public NSE/BSE feeds with canonical reference fallback."""
    sym_list = [s.strip().upper() for s in symbols.split(",")] if symbols else None
    return await CorporateActionsSyncService.fetch_public_corporate_actions(symbols=sym_list)


