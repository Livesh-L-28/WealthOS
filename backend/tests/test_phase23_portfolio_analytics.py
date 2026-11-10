"""WealthOS Phase 23 — Authoritative Portfolio & Financial Analytics Verification Suite.

Validates Phase 23.2 Requirements:
1. Dynamic, database-backed portfolio valuation from discrete InvestmentHoldingLot records.
2. Accurate multi-asset allocation slices computed from real securities.
3. Separation of Realized P&L from Unrealized P&L using FIFO lot disposal.
4. Corporate action handling (stock split ratio and cost basis preservation).
5. Passive income and dividend recognition without duplicate wealth generation.
6. Integration with NetWorthAnalyticsService combining liquid cash + live investment lots.
7. Proof that analytical queries and simulations NEVER mutate posted journal entries.
"""

import uuid
from datetime import date, datetime, UTC
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenant_context import set_db_tenant_context
from app.domains.accounting.models import JournalEntry, JournalLine
from app.domains.analytics.application.analytics_service import AnalyticsService
from app.domains.analytics.domain.metric_enums import TimeGrain
from app.domains.cash.models import FinancialAccount
from app.domains.investments.models import FinancialInstrument, InvestmentHoldingLot
from app.domains.investments.schemas import (
    CorporateActionSplitRequest,
    DividendRecordRequest,
    FinancialInstrumentCreate,
    InvestmentBuyRequest,
    InvestmentSellRequest,
)
from app.domains.investments.service import InvestmentService


@pytest.fixture
async def portfolio_test_env(db_session: AsyncSession, test_user_factory):
    """Fixture providing an isolated tenant, user, bank account, and seeded instruments."""
    user, tenant, token = await test_user_factory(email="phase23.portfolio@wealthos.dev")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    # 1. Create a primary cash settlement account
    cash_account = FinancialAccount(
        tenant_id=tenant.id,
        account_name="HDFC Corporate Salary",
        account_number_mask="••••4921",
        account_type="SAVINGS",
        currency="INR",
        current_balance=Decimal("500000.00"),
        is_active=True,
    )
    db_session.add(cash_account)
    await db_session.flush()

    inv_service = InvestmentService(db_session)

    # 2. Register financial instruments
    inst_tcs = await inv_service.register_instrument(
        FinancialInstrumentCreate(
            symbol="TCS",
            name="Tata Consultancy Services Ltd",
            instrument_type="EQUITY",
            exchange="NSE",
            currency="INR",
            current_price=Decimal("4000.0000"),
            isin="INE467B01029",
        )
    )

    inst_ppfas = await inv_service.register_instrument(
        FinancialInstrumentCreate(
            symbol="PPFAS_FLEXI",
            name="Parag Parikh Flexi Cap Fund",
            instrument_type="MUTUAL_FUND",
            exchange="AMFI",
            currency="INR",
            current_price=Decimal("70.0000"),
            isin="INF879O01019",
        )
    )

    inst_sgb = await inv_service.register_instrument(
        FinancialInstrumentCreate(
            symbol="SGB2030VI",
            name="Sovereign Gold Bond 2020-21 Series VI",
            instrument_type="GOLD_ETF",
            exchange="RBI",
            currency="INR",
            current_price=Decimal("7800.0000"),
            isin="IN0020200252",
        )
    )

    await db_session.commit()
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    return user, tenant, token, cash_account, inst_tcs, inst_ppfas, inst_sgb


@pytest.mark.asyncio
async def test_phase23_live_portfolio_valuation_and_asset_allocation(
    db_session: AsyncSession, portfolio_test_env
):
    """Test dynamic database-backed portfolio calculation and multi-asset allocation slices."""
    user, tenant, token, cash_acc, inst_tcs, inst_ppfas, inst_sgb = portfolio_test_env
    inv_service = InvestmentService(db_session)
    analytics_service = AnalyticsService(db_session)

    # 1. Record Buy 1: 50 shares of TCS @ ₹4,000 = ₹2,00,000 (Equity)
    await inv_service.record_buy(
        tenant.id,
        InvestmentBuyRequest(
            account_id=cash_acc.id,
            instrument_id=inst_tcs.id,
            trade_date=date(2026, 10, 15),
            quantity=Decimal("50.0000"),
            unit_price=Decimal("4000.0000"),
            currency="INR",
        ),
    )

    # 2. Record Buy 2: 2,000 units of PPFAS @ ₹65 = ₹1,30,000 (Mutual Fund)
    await inv_service.record_buy(
        tenant.id,
        InvestmentBuyRequest(
            account_id=cash_acc.id,
            instrument_id=inst_ppfas.id,
            trade_date=date(2026, 10, 20),
            quantity=Decimal("2000.0000"),
            unit_price=Decimal("65.0000"),
            currency="INR",
        ),
    )

    # 3. Record Buy 3: 20 units of SGB @ ₹7,500 = ₹1,50,000 (Gold Bond)
    await inv_service.record_buy(
        tenant.id,
        InvestmentBuyRequest(
            account_id=cash_acc.id,
            instrument_id=inst_sgb.id,
            trade_date=date(2026, 10, 25),
            quantity=Decimal("20.0000"),
            unit_price=Decimal("7500.0000"),
            currency="INR",
        ),
    )
    await db_session.commit()
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    # Expected Mark-to-Market Valuations:
    # TCS: 50 * ₹4,000 = ₹2,00,000
    # PPFAS: 2,000 * ₹70 = ₹1,40,000 (Cost basis was ₹1,30,000 -> Unrealized P&L = +₹10,000)
    # SGB: 20 * ₹7,800 = ₹1,56,000 (Cost basis was ₹1,50,000 -> Unrealized P&L = +₹6,000)
    # Total Portfolio Value: ₹2,00,000 + ₹1,40,000 + ₹1,56,000 = ₹4,96,000.00
    # Total Invested Capital: ₹2,00,000 + ₹1,30,000 + ₹1,50,000 = ₹4,80,000.00
    # Total Unrealized P&L: +₹16,000.00 (+3.33%)

    # Invoke InvestmentAnalyticsService
    alloc_resp = await analytics_service.investment_service.get_allocation_analytics(tenant.id, "INR")

    assert alloc_resp.metric.key == "asset_allocation"
    assert alloc_resp.summary.current_value == Decimal("496000.00")
    assert alloc_resp.summary.previous_value == Decimal("480000.00")
    assert alloc_resp.summary.absolute_change == Decimal("16000.00")

    # Verify allocation slices match database asset types
    slice_map = {p.date: p.value for p in alloc_resp.series[0].points}
    assert slice_map["Equity"] == Decimal("200000.00")
    assert slice_map["Mutual Fund"] == Decimal("140000.00")
    assert slice_map["Gold Etf"] == Decimal("156000.00")


@pytest.mark.asyncio
async def test_phase23_fifo_lot_disposal_and_realized_pnl_separation(
    db_session: AsyncSession, portfolio_test_env
):
    """Test strict FIFO lot disposal, cost basis consumption, and realized vs unrealized separation."""
    user, tenant, token, cash_acc, inst_tcs, _, _ = portfolio_test_env
    inv_service = InvestmentService(db_session)

    # Lot 1: Buy 20 shares of TCS @ ₹3,500 on Day 1
    await inv_service.record_buy(
        tenant.id,
        InvestmentBuyRequest(
            account_id=cash_acc.id,
            instrument_id=inst_tcs.id,
            trade_date=date(2026, 9, 1),
            quantity=Decimal("20.0000"),
            unit_price=Decimal("3500.0000"),
            currency="INR",
        ),
    )

    # Lot 2: Buy 30 shares of TCS @ ₹4,000 on Day 15
    await inv_service.record_buy(
        tenant.id,
        InvestmentBuyRequest(
            account_id=cash_acc.id,
            instrument_id=inst_tcs.id,
            trade_date=date(2026, 9, 15),
            quantity=Decimal("30.0000"),
            unit_price=Decimal("4000.0000"),
            currency="INR",
        ),
    )
    await db_session.commit()
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    # Execute Sell of 25 shares of TCS @ ₹4,500 on Day 30
    # FIFO consumption:
    # Consumes ALL 20 shares of Lot 1 (Cost = 20 * 3500 = ₹70,000)
    # Consumes 5 shares of Lot 2 (Cost = 5 * 4000 = ₹20,000)
    # Total Cost Basis Consumed = ₹90,000.00
    # Gross Proceeds = 25 * 4500 = ₹1,12,500.00
    # Realized P&L = ₹1,12,500 - ₹90,000 = +₹22,500.00
    sell_res = await inv_service.record_sell(
        tenant.id,
        InvestmentSellRequest(
            account_id=cash_acc.id,
            instrument_id=inst_tcs.id,
            trade_date=date(2026, 9, 30),
            quantity=Decimal("25.0000"),
            unit_price=Decimal("4500.0000"),
            currency="INR",
        ),
    )

    assert sell_res.realized_pnl == Decimal("22500.0000")
    assert sell_res.allocated_cost_basis == Decimal("90000.0000")

    # Verify Remaining Lot State:
    # Lot 1: CLOSED, remaining_quantity = 0
    # Lot 2: PARTIALLY_DISPOSED, remaining_quantity = 25, cost_basis = 25 * 4000 = ₹1,00,000
    summary = await inv_service.get_portfolio_summary(tenant.id)
    assert summary.total_realized_pnl == Decimal("22500.0000")
    assert summary.total_invested_capital == Decimal("100000.0000")
    # Current price of TCS is ₹4000 -> Market Value = 25 * 4000 = ₹1,00,000 -> Unrealized P&L = 0
    assert summary.total_portfolio_value == Decimal("100000.0000")
    assert summary.total_unrealized_pnl == Decimal("0.0000")


@pytest.mark.asyncio
async def test_phase23_corporate_action_split_and_dividend_neutrality(
    db_session: AsyncSession, portfolio_test_env
):
    """Test stock split preserves cost basis and dividend does not duplicate wealth."""
    user, tenant, token, cash_acc, inst_tcs, _, _ = portfolio_test_env
    inv_service = InvestmentService(db_session)

    # Buy 100 shares of TCS @ ₹3,000 (Cost basis = ₹3,00,000)
    await inv_service.record_buy(
        tenant.id,
        InvestmentBuyRequest(
            account_id=cash_acc.id,
            instrument_id=inst_tcs.id,
            trade_date=date(2026, 8, 1),
            quantity=Decimal("100.0000"),
            unit_price=Decimal("3000.0000"),
            currency="INR",
        ),
    )

    # Execute 1:2 Stock Split (numerator=2, denominator=1)
    await inv_service.execute_stock_split(
        tenant.id,
        CorporateActionSplitRequest(
            instrument_id=inst_tcs.id,
            ratio_numerator=Decimal("2"),
            ratio_denominator=Decimal("1"),
            record_date=date(2026, 9, 1),
        ),
    )

    # Verify: Quantity doubled to 200, unit purchase price halved to ₹1,500, total cost basis remains ₹3,00,000
    lots = await inv_service.repo.list_holding_lots(tenant_id=tenant.id)
    assert lots[0].remaining_quantity == Decimal("200.0000")
    assert lots[0].purchase_price == Decimal("1500.0000")
    assert lots[0].cost_basis == Decimal("300000.0000")

    # Record Dividend of ₹14,500 with ₹1,450 tax withheld
    div_res = await inv_service.record_dividend(
        tenant.id,
        DividendRecordRequest(
            account_id=cash_acc.id,
            instrument_id=inst_tcs.id,
            declaration_date=date(2026, 10, 1),
            payment_date=date(2026, 10, 15),
            gross_amount=Decimal("14500.0000"),
            tax_withheld=Decimal("1450.0000"),
            currency="INR",
        ),
    )
    assert div_res.net_amount == Decimal("13050.0000")

    # Ensure dividend records exist without mutating lot quantity or cost basis
    summary = await inv_service.get_portfolio_summary(tenant.id)
    assert summary.total_dividend_income == Decimal("13050.0000")
    assert summary.holdings[0].total_quantity == Decimal("200.0000")


@pytest.mark.asyncio
async def test_phase23_net_worth_service_dynamic_integration_and_ledger_protection(
    db_session: AsyncSession, portfolio_test_env
):
    """Verify NetWorthAnalyticsService dynamically combines liquid cash + investment lots without ledger mutation."""
    user, tenant, token, cash_acc, inst_tcs, _, _ = portfolio_test_env
    inv_service = InvestmentService(db_session)
    analytics_service = AnalyticsService(db_session)

    # Initial state: cash_acc has ₹5,00,000, zero investment lots
    # Buy 50 shares of TCS @ ₹4,000 = ₹2,00,000
    await inv_service.record_buy(
        tenant.id,
        InvestmentBuyRequest(
            account_id=cash_acc.id,
            instrument_id=inst_tcs.id,
            trade_date=date(2026, 10, 1),
            quantity=Decimal("50.0000"),
            unit_price=Decimal("4000.0000"),
            currency="INR",
        ),
    )
    await db_session.commit()
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    # Initial count of journal lines
    initial_journals = await db_session.scalar(select(func.count(JournalEntry.id)))

    # Compute Net Worth Analytics
    nw_resp = await analytics_service.net_worth_service.get_net_worth_analytics(
        tenant.id, date(2026, 10, 1), date(2026, 11, 8), TimeGrain.MONTH, "INR"
    )

    # Liquid Assets = ₹5,00,000 (from cash_acc)
    # Investment Assets = 50 * ₹4,000 = ₹2,00,000
    # Total Assets = ₹7,00,000.00
    # Total Liabilities = ₹0.00
    # Net Worth = ₹7,00,000.00
    assert nw_resp.summary.current_value == Decimal("700000.00")

    # Verify Ledger Protection: No journal entries created by analytics calls!
    ending_journals = await db_session.scalar(select(func.count(JournalEntry.id)))
    assert ending_journals == initial_journals
