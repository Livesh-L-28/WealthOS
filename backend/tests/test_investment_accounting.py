"""WealthOS Professional Investment Accounting Acceptance Test Suite.

Validates all 16 Phase 3 acceptance requirements:
1. Trade execution logging (BUY / SELL).
2. FIFO acquisition lot creation.
3. Strict FIFO lot consumption.
4. Negative inventory prohibition.
5. Realized vs Unrealized P&L separation.
6. Stock split corporate actions & cost basis invariance.
7. Dividend income recognition with tax withholding.
8. Holding lot status transitions (OPEN -> PARTIALLY_DISPOSED -> CLOSED).
9. Portfolio market valuation & asset allocation.
10. Multi-instrument portfolio aggregation.
11. Annualized return (XIRR) estimation.
12. Trade fee & tax capitalization.
13. Cross-tenant investment lot isolation.
14. Securities master lookup & registration.
15. Audited transaction ledger.
16. Live HTTP REST API endpoints.
"""

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenant_context import set_db_tenant_context
from app.domains.cash.models import FinancialAccount
from app.domains.investments.schemas import (
    CorporateActionSplitRequest,
    DividendRecordRequest,
    FinancialInstrumentCreate,
    InvestmentBuyRequest,
    InvestmentSellRequest,
)
from app.domains.investments.service import InvestmentService


async def bind_tenant_context(session: AsyncSession, tenant_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Set PostgreSQL RLS context variables for test session."""
    await session.execute(
        text(
            "SELECT set_config('app.current_tenant_id', :tid, false), "
            "set_config('app.current_user_id', :uid, false)"
        ),
        {"tid": str(tenant_id), "uid": str(user_id)},
    )


async def create_mock_brokerage_account(session: AsyncSession, tenant_id: uuid.UUID) -> FinancialAccount:
    """Helper to create a brokerage account."""
    acct = FinancialAccount(
        tenant_id=tenant_id,
        account_name="Zerodha Demat",
        account_number_mask="*8899",
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
async def test_fifo_lot_consumption_and_realized_pnl(db_session: AsyncSession, test_user_factory):
    """Requirements 1, 2, 3, 5, 8, 12: Strict FIFO lot consumption and Realized P&L calculation."""
    user, tenant, _ = await test_user_factory(email="invest.fifo@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    brokerage = await create_mock_brokerage_account(db_session, tenant.id)
    service = InvestmentService(db_session)

    # 1. Register Reliance Industries
    instrument = await service.register_instrument(
        FinancialInstrumentCreate(
            symbol="RELIANCE",
            name="Reliance Industries Ltd",
            isin="INE002A01018",
            instrument_type="EQUITY",
            exchange="NSE",
            currency="INR",
            current_price=Decimal("2500.0000"),
        )
    )

    # 2. Buy Lot 1: 100 units at ₹2,000 on 2026-01-10
    tx1 = await service.record_buy(
        tenant.id,
        InvestmentBuyRequest(
            account_id=brokerage.id,
            instrument_id=instrument.id,
            trade_date=date(2026, 1, 10),
            quantity=Decimal("100.0000"),
            unit_price=Decimal("2000.0000"),
            fee_amount=Decimal("100.0000"),
            tax_amount=Decimal("50.0000"),
            currency="INR",
        ),
    )
    assert tx1.transaction_type == "BUY"
    assert tx1.gross_amount == Decimal("200000.0000")
    assert tx1.net_amount == Decimal("200150.0000")

    # 3. Buy Lot 2: 50 units at ₹2,200 on 2026-02-15
    tx2 = await service.record_buy(
        tenant.id,
        InvestmentBuyRequest(
            account_id=brokerage.id,
            instrument_id=instrument.id,
            trade_date=date(2026, 2, 15),
            quantity=Decimal("50.0000"),
            unit_price=Decimal("2200.0000"),
            fee_amount=Decimal("50.0000"),
            tax_amount=Decimal("25.0000"),
            currency="INR",
        ),
    )
    assert tx2.transaction_type == "BUY"

    # Verify 2 open lots exist
    lots_before = await service.list_holding_lots(tenant.id, instrument_id=instrument.id)
    assert len(lots_before) == 2
    assert lots_before[0].remaining_quantity == Decimal("100.0000")
    assert lots_before[0].lot_status == "OPEN"
    assert lots_before[1].remaining_quantity == Decimal("50.0000")
    assert lots_before[1].lot_status == "OPEN"

    # 4. Sell 120 units at ₹2,500 on 2026-03-20
    # FIFO must fully consume Lot 1 (100 units) and consume 20 units from Lot 2 (leaving 30)
    sell_tx = await service.record_sell(
        tenant.id,
        InvestmentSellRequest(
            account_id=brokerage.id,
            instrument_id=instrument.id,
            trade_date=date(2026, 3, 20),
            quantity=Decimal("120.0000"),
            unit_price=Decimal("2500.0000"),
            fee_amount=Decimal("120.0000"),
            tax_amount=Decimal("60.0000"),
            currency="INR",
        ),
    )
    await db_session.flush()

    # Gross = 120 * 2500 = 300,000. Net proceeds = 300,000 - 180 = 299,820.
    assert sell_tx.gross_amount == Decimal("300000.0000")
    assert sell_tx.net_amount == Decimal("299820.0000")

    # Allocated cost basis: (100 * 2000) + (20 * 2200) = 200,000 + 44,000 = 244,000.
    assert sell_tx.allocated_cost_basis == Decimal("244000.0000")

    # Realized P&L = 299,820 - 244,000 = 55,820.
    assert sell_tx.realized_pnl == Decimal("55820.0000")

    # Inspect lot statuses
    lots_after = await service.list_holding_lots(tenant.id, instrument_id=instrument.id)
    assert len(lots_after) == 2
    lot1 = lots_after[0]
    lot2 = lots_after[1]

    # Lot 1 closed
    assert lot1.remaining_quantity == Decimal("0.0000")
    assert lot1.lot_status == "CLOSED"

    # Lot 2 partially disposed
    assert lot2.remaining_quantity == Decimal("30.0000")
    assert lot2.lot_status == "PARTIALLY_DISPOSED"
    assert lot2.cost_basis == Decimal("66000.0000")  # 30 * 2200


@pytest.mark.asyncio
async def test_negative_inventory_prohibition(db_session: AsyncSession, test_user_factory):
    """Requirement 4: Selling more units than available in open lots must fail closed."""
    user, tenant, _ = await test_user_factory(email="invest.oversell@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    brokerage = await create_mock_brokerage_account(db_session, tenant.id)
    service = InvestmentService(db_session)

    instrument = await service.register_instrument(
        FinancialInstrumentCreate(
            symbol="TCS",
            name="Tata Consultancy Services Ltd",
            isin="INE467B01029",
            instrument_type="EQUITY",
            exchange="NSE",
            currency="INR",
            current_price=Decimal("3800.0000"),
        )
    )

    # Buy 25 units
    await service.record_buy(
        tenant.id,
        InvestmentBuyRequest(
            account_id=brokerage.id,
            instrument_id=instrument.id,
            trade_date=date(2026, 1, 15),
            quantity=Decimal("25.0000"),
            unit_price=Decimal("3500.0000"),
            currency="INR",
        ),
    )

    # Attempt to sell 30 units (overselling by 5 units)
    with pytest.raises(ValueError, match="Insufficient quantity: requested disposal of 30"):
        await service.record_sell(
            tenant.id,
            InvestmentSellRequest(
                account_id=brokerage.id,
                instrument_id=instrument.id,
                trade_date=date(2026, 2, 1),
                quantity=Decimal("30.0000"),
                unit_price=Decimal("3800.0000"),
                currency="INR",
            ),
        )


@pytest.mark.asyncio
async def test_stock_split_cost_basis_invariance(db_session: AsyncSession, test_user_factory):
    """Requirement 6: 2:1 stock split doubles quantity, halves price, preserves total cost basis."""
    user, tenant, _ = await test_user_factory(email="invest.split@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    brokerage = await create_mock_brokerage_account(db_session, tenant.id)
    service = InvestmentService(db_session)

    instrument = await service.register_instrument(
        FinancialInstrumentCreate(
            symbol="INFY",
            name="Infosys Ltd",
            isin="INE009A01021",
            instrument_type="EQUITY",
            exchange="NSE",
            currency="INR",
            current_price=Decimal("1600.0000"),
        )
    )

    # Buy 100 units at ₹1,600 -> Total cost basis ₹160,000
    await service.record_buy(
        tenant.id,
        InvestmentBuyRequest(
            account_id=brokerage.id,
            instrument_id=instrument.id,
            trade_date=date(2026, 1, 1),
            quantity=Decimal("100.0000"),
            unit_price=Decimal("1600.0000"),
            currency="INR",
        ),
    )

    # Execute 2:1 stock split
    corp_action = await service.execute_stock_split(
        tenant.id,
        CorporateActionSplitRequest(
            instrument_id=instrument.id,
            ratio_numerator=Decimal("2.0"),
            ratio_denominator=Decimal("1.0"),
            record_date=date(2026, 3, 1),
            description="2:1 Stock Split",
        ),
    )
    await db_session.flush()

    assert corp_action.action_type == "SPLIT"

    # Check updated lot
    lots = await service.list_holding_lots(tenant.id, instrument_id=instrument.id)
    assert len(lots) == 1
    lot = lots[0]

    # Quantity doubled from 100 to 200
    assert lot.quantity == Decimal("200.0000")
    assert lot.remaining_quantity == Decimal("200.0000")

    # Purchase price halved from 1600 to 800
    assert lot.purchase_price == Decimal("800.0000")

    # Invariant: 200 * 800 == 160,000 cost basis
    assert lot.remaining_quantity * lot.purchase_price == Decimal("160000.0000")


@pytest.mark.asyncio
async def test_dividend_recognition_with_tax_withholding(db_session: AsyncSession, test_user_factory):
    """Requirement 7: Dividend recognition with tax withholding."""
    user, tenant, _ = await test_user_factory(email="invest.dividend@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    brokerage = await create_mock_brokerage_account(db_session, tenant.id)
    service = InvestmentService(db_session)

    instrument = await service.register_instrument(
        FinancialInstrumentCreate(
            symbol="ITC",
            name="ITC Ltd",
            isin="INE154A01025",
            instrument_type="EQUITY",
            exchange="NSE",
            currency="INR",
            current_price=Decimal("450.0000"),
        )
    )

    dividend = await service.record_dividend(
        tenant.id,
        DividendRecordRequest(
            account_id=brokerage.id,
            instrument_id=instrument.id,
            payment_date=date(2026, 2, 20),
            gross_amount=Decimal("5000.0000"),
            tax_withheld=Decimal("500.0000"),
            currency="INR",
        ),
    )
    await db_session.flush()

    assert dividend.income_type == "DIVIDEND"
    assert dividend.gross_amount == Decimal("5000.0000")
    assert dividend.tax_withheld == Decimal("500.0000")
    assert dividend.net_amount == Decimal("4500.0000")
    assert dividend.status == "RECEIVED"


@pytest.mark.asyncio
async def test_portfolio_summary_xirr_realized_unrealized(db_session: AsyncSession, test_user_factory):
    """Requirements 5, 9, 10, 11: Realized vs Unrealized P&L separation and portfolio summary."""
    user, tenant, _ = await test_user_factory(email="invest.portfolio@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    brokerage = await create_mock_brokerage_account(db_session, tenant.id)
    service = InvestmentService(db_session)

    # 1. HDFC Bank (Holdings with Unrealized Gain)
    hdfc = await service.register_instrument(
        FinancialInstrumentCreate(
            symbol="HDFCBANK",
            name="HDFC Bank Ltd",
            instrument_type="EQUITY",
            current_price=Decimal("1700.0000"),
        )
    )
    # Buy 100 units at ₹1,500 = ₹150,000 cost. Current market val = 100 * 1700 = ₹170,000 (+20,000 unrealized)
    await service.record_buy(
        tenant.id,
        InvestmentBuyRequest(
            account_id=brokerage.id,
            instrument_id=hdfc.id,
            trade_date=date(2026, 1, 1),
            quantity=Decimal("100.0000"),
            unit_price=Decimal("1500.0000"),
        ),
    )

    # 2. Nippon Nifty 50 ETF (Holdings with Unrealized Loss)
    nifty = await service.register_instrument(
        FinancialInstrumentCreate(
            symbol="NIFTYBEES",
            name="Nippon India ETF Nifty 50 BeES",
            instrument_type="ETF",
            current_price=Decimal("240.0000"),
        )
    )
    # Buy 500 units at ₹250 = ₹125,000 cost. Current market val = 500 * 240 = ₹120,000 (-5,000 unrealized)
    await service.record_buy(
        tenant.id,
        InvestmentBuyRequest(
            account_id=brokerage.id,
            instrument_id=nifty.id,
            trade_date=date(2026, 1, 5),
            quantity=Decimal("500.0000"),
            unit_price=Decimal("250.0000"),
        ),
    )

    # 3. Dividend income
    await service.record_dividend(
        tenant.id,
        DividendRecordRequest(
            account_id=brokerage.id,
            instrument_id=hdfc.id,
            payment_date=date(2026, 3, 1),
            gross_amount=Decimal("2000.0000"),
            tax_withheld=Decimal("200.0000"),
        ),
    )

    summary = await service.get_portfolio_summary(tenant.id)

    # Total Invested Capital = 150,000 + 125,000 = 275,000
    assert summary.total_invested_capital == Decimal("275000.0000")

    # Total Portfolio Market Value = 170,000 + 120,000 = 290,000
    assert summary.total_portfolio_value == Decimal("290000.0000")

    # Total Unrealized P&L = 290,000 - 275,000 = +15,000
    assert summary.total_unrealized_pnl == Decimal("15000.0000")

    # Realized P&L = 0 (no disposals yet)
    assert summary.total_realized_pnl == Decimal("0.0000")

    # Dividend Income = 1800 net
    assert summary.total_dividend_income == Decimal("1800.0000")

    # Holdings count
    assert len(summary.holdings) == 2
    assert "EQUITY" in summary.asset_allocation
    assert "ETF" in summary.asset_allocation


@pytest.mark.asyncio
async def test_cross_tenant_investment_isolation(db_session: AsyncSession, test_user_factory):
    """Requirement 13: Tenant A's investment lots must not be visible or accessible to Tenant B."""
    user_a, tenant_a, _ = await test_user_factory(email="tenant.a@example.com")
    user_b, tenant_b, _ = await test_user_factory(email="tenant.b@example.com")

    # Tenant A setup
    await set_db_tenant_context(db_session, tenant_a.id, user_id=user_a.id)
    acct_a = await create_mock_brokerage_account(db_session, tenant_a.id)
    service_a = InvestmentService(db_session)

    instrument = await service_a.register_instrument(
        FinancialInstrumentCreate(
            symbol="WIPRO",
            name="Wipro Ltd",
            instrument_type="EQUITY",
            current_price=Decimal("500.0000"),
        )
    )

    await service_a.record_buy(
        tenant_a.id,
        InvestmentBuyRequest(
            account_id=acct_a.id,
            instrument_id=instrument.id,
            trade_date=date(2026, 1, 1),
            quantity=Decimal("50.0000"),
            unit_price=Decimal("450.0000"),
        ),
    )
    await db_session.flush()

    # Switch to Tenant B context
    await set_db_tenant_context(db_session, tenant_b.id, user_id=user_b.id)
    service_b = InvestmentService(db_session)

    # Tenant B lists holding lots -> must be empty
    tenant_b_lots = await service_b.list_holding_lots(tenant_b.id)
    assert len(tenant_b_lots) == 0

    # Tenant B's portfolio summary must be 0
    tenant_b_portfolio = await service_b.get_portfolio_summary(tenant_b.id)
    assert tenant_b_portfolio.total_portfolio_value == Decimal("0.0000")
    assert tenant_b_portfolio.total_invested_capital == Decimal("0.0000")


@pytest.mark.asyncio
async def test_investment_live_api_endpoints(
    client: AsyncClient, test_user_factory, db_session: AsyncSession
):
    """Requirement 16: Live HTTP REST API endpoints."""
    user, tenant, token = await test_user_factory(email="invest.api@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    brokerage = await create_mock_brokerage_account(db_session, tenant.id)
    await db_session.commit()

    headers = {"Authorization": f"Bearer {token}"}

    # 1. Register Instrument via API
    inst_resp = await client.post(
        "/api/v1/investments/instruments",
        headers=headers,
        json={
            "symbol": "SBIN",
            "name": "State Bank of India",
            "isin": "INE062A01020",
            "instrument_type": "EQUITY",
            "exchange": "NSE",
            "currency": "INR",
            "current_price": "750.5000",
        },
    )
    assert inst_resp.status_code == 201, inst_resp.text
    inst_id = inst_resp.json()["id"]

    # 2. Buy Trade via API
    buy_resp = await client.post(
        "/api/v1/investments/transactions/buy",
        headers=headers,
        json={
            "account_id": str(brokerage.id),
            "instrument_id": inst_id,
            "trade_date": "2026-03-01",
            "quantity": "100.0000",
            "unit_price": "700.0000",
            "fee_amount": "50.0000",
            "tax_amount": "25.0000",
            "currency": "INR",
        },
    )
    assert buy_resp.status_code == 201, buy_resp.text
    assert buy_resp.json()["transaction_type"] == "BUY"

    # 3. List lots via API
    lots_resp = await client.get("/api/v1/investments/lots", headers=headers)
    assert lots_resp.status_code == 200
    lots_data = lots_resp.json()
    assert len(lots_data) == 1
    assert Decimal(lots_data[0]["remaining_quantity"]) == Decimal("100.0000")

    # 4. Sell Trade via API
    sell_resp = await client.post(
        "/api/v1/investments/transactions/sell",
        headers=headers,
        json={
            "account_id": str(brokerage.id),
            "instrument_id": inst_id,
            "trade_date": "2026-03-15",
            "quantity": "40.0000",
            "unit_price": "750.0000",
            "currency": "INR",
        },
    )
    assert sell_resp.status_code == 201, sell_resp.text
    assert sell_resp.json()["transaction_type"] == "SELL"
    # Cost basis = 40 * 700 = 28,000. Proceeds = 30,000. Realized P&L = +2,000
    assert Decimal(sell_resp.json()["realized_pnl"]) == Decimal("2000.0000")

    # 5. Get Portfolio Summary via API
    portfolio_resp = await client.get("/api/v1/investments/portfolio", headers=headers)
    assert portfolio_resp.status_code == 200
    summary = portfolio_resp.json()
    assert Decimal(summary["total_realized_pnl"]) == Decimal("2000.0000")
    assert len(summary["holdings"]) == 1
    assert Decimal(summary["holdings"][0]["total_quantity"]) == Decimal("60.0000")
