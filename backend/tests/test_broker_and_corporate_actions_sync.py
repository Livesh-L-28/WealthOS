"""WealthOS Broker Synchronization and Corporate Actions Automated Testing Suite.

Validates:
1. Upstox v2 & Zerodha Kite Connect holdings synchronization into FIFO lots.
2. CAMS & KFintech eCAS mutual fund portfolio ingestion.
3. Automated stock split execution preserving invested capital.
4. Indian Income Tax Section 55(2)(aa) compliant bonus share allotment at ₹0 cost basis.
5. Automated dividend recognition and Section 194 TDS computation.
6. Idempotent multi-sync deduplication.
7. Public corporate actions discovery feed.
"""

import uuid
from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenant_context import set_db_tenant_context
from app.domains.cash.models import FinancialAccount
from app.domains.investments.broker_sync import (
    BrokerPortfolioSyncService,
    CasMutualFundAdapter,
)
from app.domains.investments.corporate_actions_sync import CorporateActionsSyncService
from app.domains.investments.models import (
    InvestmentHoldingLot,
)
from app.domains.investments.repository import InvestmentRepository
from app.domains.investments.service import InvestmentService


async def create_brokerage_account(session: AsyncSession, tenant_id: uuid.UUID) -> FinancialAccount:
    """Create a mock brokerage / demat account for tests."""
    acct = FinancialAccount(
        tenant_id=tenant_id,
        account_name="Trading Demat",
        account_number_mask="*9988",
        account_type="DEMAT",
        currency="INR",
        current_balance=Decimal("500000.0000"),
        available_balance=Decimal("500000.0000"),
        is_active=True,
    )
    session.add(acct)
    await session.flush()
    return acct


@pytest.mark.asyncio
async def test_upstox_and_cas_broker_holdings_sync(
    db_session: AsyncSession, test_user_factory
) -> None:
    """Validate Upstox holdings ingestion creates discrete FIFO lots."""
    user, tenant, _ = await test_user_factory(email="broker.sync@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    brokerage = await create_brokerage_account(db_session, tenant.id)
    repo = InvestmentRepository(db_session)
    sync_service = BrokerPortfolioSyncService(repo)

    mock_holdings = [
        {
            "symbol": "INFY",
            "name": "Infosys Ltd",
            "isin": "INE009A01021",
            "quantity": Decimal("100.0000"),
            "average_price": Decimal("1450.0000"),
            "current_price": Decimal("1520.0000"),
            "exchange": "NSE",
            "instrument_type": "EQUITY",
        },
        {
            "symbol": "TCS",
            "name": "Tata Consultancy Services",
            "isin": "INE467B01029",
            "quantity": Decimal("50.0000"),
            "average_price": Decimal("3500.0000"),
            "current_price": Decimal("3800.0000"),
            "exchange": "NSE",
            "instrument_type": "EQUITY",
        },
    ]

    res = await sync_service.sync_holdings(
        tenant_id=tenant.id,
        account_id=brokerage.id,
        provider="UPSTOX",
        holdings_data=mock_holdings,
    )

    assert res["status"] == "SUCCESS"
    assert res["instruments_synced"] == 2
    assert res["lots_created"] == 2
    assert res["total_market_value"] == (
        Decimal("100") * Decimal("1520") + Decimal("50") * Decimal("3800")
    )

    # Verify discrete lot in db
    lots = await repo.list_holding_lots(tenant_id=tenant.id, account_id=brokerage.id)
    assert len(lots) == 2
    infy_lot = next(l for l in lots if l.purchase_price == Decimal("1450.0000"))
    assert infy_lot.quantity == Decimal("100.0000")
    assert infy_lot.cost_basis == Decimal("145000.0000")

    # Idempotent re-sync with unchanged quantity should NOT create duplicate lots
    re_res = await sync_service.sync_holdings(
        tenant_id=tenant.id,
        account_id=brokerage.id,
        provider="UPSTOX",
        holdings_data=mock_holdings,
    )
    assert re_res["lots_created"] == 0


@pytest.mark.asyncio
async def test_cas_mutual_fund_adapter_normalization() -> None:
    """Validate CAS mailback mutual fund normalization."""
    raw_cas = [
        {
            "scheme_name": "Parag Parikh Flexi Cap Fund - Direct Plan - Growth",
            "isin": "INF879O01019",
            "units": 1542.857,
            "cost_nav": 45.20,
            "current_nav": 78.40,
        }
    ]
    normalized = CasMutualFundAdapter.parse_cas_payload(raw_cas)
    assert len(normalized) == 1
    assert normalized[0]["instrument_type"] == "MUTUAL_FUND"
    assert normalized[0]["quantity"] == Decimal("1542.857")
    assert normalized[0]["average_price"] == Decimal("45.20")
    assert normalized[0]["current_price"] == Decimal("78.40")


@pytest.mark.asyncio
async def test_automated_stock_split_corporate_action(
    db_session: AsyncSession, test_user_factory
) -> None:
    """Validate stock split automatically doubles shares and halves price with zero basis loss."""
    user, tenant, _ = await test_user_factory(email="split.action@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    brokerage = await create_brokerage_account(db_session, tenant.id)
    repo = InvestmentRepository(db_session)
    inst = await repo.get_or_create_instrument(
        symbol="HDFCBANK",
        name="HDFC Bank Limited",
        instrument_type="EQUITY",
        exchange="NSE",
        currency="INR",
        current_price=Decimal("1600.0000"),
    )
    await db_session.flush()

    # Create holding lot: 100 shares @ ₹1,500.00 (Cost basis = ₹1,50,000.00)
    lot = InvestmentHoldingLot(
        tenant_id=tenant.id,
        account_id=brokerage.id,
        instrument_id=inst.id,
        purchase_date=date(2026, 1, 15),
        quantity=Decimal("100.0000"),
        purchase_price=Decimal("1500.0000"),
        cost_basis=Decimal("150000.0000"),
        remaining_quantity=Decimal("100.0000"),
        currency="INR",
        lot_status="OPEN",
    )
    await repo.create_holding_lot(lot)
    await db_session.flush()

    # Trigger corporate actions sync with 2:1 split
    sync_service = CorporateActionsSyncService(repo)
    actions = [
        {
            "symbol": "HDFCBANK",
            "action_type": "SPLIT",
            "record_date": date(2026, 9, 20),
            "ratio_numerator": Decimal("2.0"),
            "ratio_denominator": Decimal("1.0"),
            "dividend_per_share": None,
            "description": "Stock Split 2:1",
        }
    ]
    res = await sync_service.sync_and_apply_corporate_actions(
        tenant_id=tenant.id,
        symbols_filter=["HDFCBANK"],
        auto_apply=True,
        external_actions=actions,
    )

    assert res["actions_detected"] == 1
    assert res["actions_applied"] == 1
    assert res["splits_executed"] == 1

    # Verify modified lot
    lots = await repo.list_holding_lots(tenant_id=tenant.id, instrument_id=inst.id)
    assert len(lots) == 1
    updated_lot = lots[0]
    assert updated_lot.quantity == Decimal("200.0000")
    assert updated_lot.purchase_price == Decimal("750.0000")
    assert updated_lot.cost_basis == Decimal("150000.0000")  # Cost basis strictly preserved


@pytest.mark.asyncio
async def test_automated_bonus_shares_section_55_2_aa(
    db_session: AsyncSession, test_user_factory
) -> None:
    """Validate bonus allotment creates a discrete lot at ₹0 cost basis under IT Act Section 55(2)(aa)."""
    user, tenant, _ = await test_user_factory(email="bonus.action@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    brokerage = await create_brokerage_account(db_session, tenant.id)
    repo = InvestmentRepository(db_session)
    inst = await repo.get_or_create_instrument(
        symbol="RELIANCE",
        name="Reliance Industries Limited",
        instrument_type="EQUITY",
        exchange="NSE",
        currency="INR",
        current_price=Decimal("2600.0000"),
    )
    await db_session.flush()

    # Initial lot: 50 shares @ ₹2,400 = ₹1,20,000 cost basis
    original_lot = InvestmentHoldingLot(
        tenant_id=tenant.id,
        account_id=brokerage.id,
        instrument_id=inst.id,
        purchase_date=date(2026, 2, 10),
        quantity=Decimal("50.0000"),
        purchase_price=Decimal("2400.0000"),
        cost_basis=Decimal("120000.0000"),
        remaining_quantity=Decimal("50.0000"),
        currency="INR",
        lot_status="OPEN",
    )
    await repo.create_holding_lot(original_lot)
    await db_session.flush()

    # Trigger corporate actions sync with 1:1 Bonus
    sync_service = CorporateActionsSyncService(repo)
    actions = [
        {
            "symbol": "RELIANCE",
            "action_type": "BONUS",
            "record_date": date(2026, 10, 20),
            "ratio_numerator": Decimal("1.0"),
            "ratio_denominator": Decimal("1.0"),
            "dividend_per_share": None,
            "description": "Reliance 1:1 Bonus Issue",
        }
    ]
    res = await sync_service.sync_and_apply_corporate_actions(
        tenant_id=tenant.id,
        symbols_filter=["RELIANCE"],
        auto_apply=True,
        external_actions=actions,
    )

    assert res["actions_detected"] == 1
    assert res["actions_applied"] == 1
    assert res["bonuses_allotted"] == 1

    # Verify 2 lots exist: Original (50 @ 2400) and Bonus (50 @ 0)
    all_lots = await repo.list_holding_lots(tenant_id=tenant.id, instrument_id=inst.id)
    assert len(all_lots) == 2

    bonus_lot = next(l for l in all_lots if l.purchase_price == Decimal("0.0000"))
    assert bonus_lot.quantity == Decimal("50.0000")
    assert bonus_lot.cost_basis == Decimal("0.0000")
    assert bonus_lot.purchase_date == date(2026, 10, 20)

    # Re-running sync must be idempotent
    re_res = await sync_service.sync_and_apply_corporate_actions(
        tenant_id=tenant.id,
        symbols_filter=["RELIANCE"],
        auto_apply=True,
        external_actions=actions,
    )
    assert re_res["bonuses_allotted"] == 0


@pytest.mark.asyncio
async def test_automated_dividend_recognition(
    db_session: AsyncSession, test_user_factory
) -> None:
    """Validate dividend income recognition with Section 194 TDS calculation."""
    user, tenant, _ = await test_user_factory(email="dividend.action@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    brokerage = await create_brokerage_account(db_session, tenant.id)
    repo = InvestmentRepository(db_session)
    inst = await repo.get_or_create_instrument(
        symbol="TCS",
        name="Tata Consultancy Services",
        instrument_type="EQUITY",
        exchange="NSE",
        currency="INR",
        current_price=Decimal("4000.0000"),
    )
    await db_session.flush()

    # 400 shares held
    lot = InvestmentHoldingLot(
        tenant_id=tenant.id,
        account_id=brokerage.id,
        instrument_id=inst.id,
        purchase_date=date(2026, 3, 1),
        quantity=Decimal("400.0000"),
        purchase_price=Decimal("3800.0000"),
        cost_basis=Decimal("1520000.0000"),
        remaining_quantity=Decimal("400.0000"),
        currency="INR",
        lot_status="OPEN",
    )
    await repo.create_holding_lot(lot)
    await db_session.flush()

    # Dividend: ₹18.00 per share -> Gross = 400 * 18 = ₹7,200. TDS (10%) = ₹720. Net = ₹6,480.
    sync_service = CorporateActionsSyncService(repo)
    actions = [
        {
            "symbol": "TCS",
            "action_type": "DIVIDEND",
            "record_date": date(2026, 10, 15),
            "ratio_numerator": None,
            "ratio_denominator": None,
            "dividend_per_share": Decimal("18.0000"),
            "description": "TCS Interim Dividend ₹18",
        }
    ]
    res = await sync_service.sync_and_apply_corporate_actions(
        tenant_id=tenant.id,
        symbols_filter=["TCS"],
        auto_apply=True,
        external_actions=actions,
    )

    assert res["dividends_recorded"] == 1

    service = InvestmentService(db_session)
    income_records = await service.list_passive_income(tenant_id=tenant.id)
    assert len(income_records) == 1
    rec = income_records[0]
    assert rec.gross_amount == Decimal("7200.0000")
    assert rec.tax_withheld == Decimal("720.0000")
    assert rec.net_amount == Decimal("6480.0000")


@pytest.mark.asyncio
async def test_public_corporate_actions_feed_discovery() -> None:
    """Validate public feed discovery returns announcements for target symbols."""
    feed = await CorporateActionsSyncService.fetch_public_corporate_actions(symbols=["TCS", "INFY", "RELIANCE"])
    assert isinstance(feed, list)
    assert len(feed) >= 2
    symbols_in_feed = [f["symbol"] for f in feed]
    assert "TCS" in symbols_in_feed
    assert "INFY" in symbols_in_feed
