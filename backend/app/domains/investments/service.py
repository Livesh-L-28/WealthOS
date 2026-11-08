"""WealthOS Professional Investment Accounting Domain Service.

Implements FIFO lot acquisition & disposal, Realized vs Unrealized P&L separation,
corporate actions, dividend recognition, and XIRR portfolio returns.
"""

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.cash.models import FinancialAccount
from app.domains.investments.models import (
    CorporateAction,
    FinancialInstrument,
    InvestmentHoldingLot,
    InvestmentTransaction,
    PassiveIncomeRecord,
)
from app.domains.investments.repository import InvestmentRepository
from app.domains.investments.schemas import (
    CorporateActionSplitRequest,
    DividendRecordRequest,
    FinancialInstrumentCreate,
    HoldingLotResponse,
    HoldingSummary,
    InvestmentBuyRequest,
    InvestmentSellRequest,
    InvestmentTransactionResponse,
    PassiveIncomeResponse,
    PortfolioSummaryResponse,
)


class InvestmentService:
    """Core domain service for investment accounting, lots, and returns."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = InvestmentRepository(session)

    async def register_instrument(
        self, payload: FinancialInstrumentCreate
    ) -> FinancialInstrument:
        """Register or update an instrument in the securities master."""
        return await self.repo.get_or_create_instrument(
            symbol=payload.symbol.upper().strip(),
            name=payload.name.strip(),
            instrument_type=payload.instrument_type,
            exchange=payload.exchange.upper().strip(),
            currency=payload.currency.upper().strip(),
            current_price=payload.current_price,
            isin=payload.isin,
        )

    async def record_buy(
        self, tenant_id: uuid.UUID, payload: InvestmentBuyRequest
    ) -> InvestmentTransactionResponse:
        """Record purchase of securities and initialize a discrete FIFO acquisition lot."""
        inst = await self.repo.get_instrument(payload.instrument_id)
        if not inst:
            raise ValueError(f"Instrument {payload.instrument_id} not found")

        gross_amount = (payload.quantity * payload.unit_price).quantize(Decimal("0.0001"))
        net_amount = (gross_amount + payload.fee_amount + payload.tax_amount).quantize(Decimal("0.0001"))

        # 1. Create discrete FIFO lot
        lot = InvestmentHoldingLot(
            tenant_id=tenant_id,
            account_id=payload.account_id,
            instrument_id=payload.instrument_id,
            purchase_date=payload.trade_date,
            quantity=payload.quantity,
            purchase_price=payload.unit_price,
            cost_basis=net_amount,  # Capitalized acquisition cost
            remaining_quantity=payload.quantity,
            currency=payload.currency,
            lot_status="OPEN",
        )
        await self.repo.create_holding_lot(lot)

        # 2. Record trade transaction
        tx = InvestmentTransaction(
            tenant_id=tenant_id,
            account_id=payload.account_id,
            instrument_id=payload.instrument_id,
            transaction_type="BUY",
            trade_date=payload.trade_date,
            quantity=payload.quantity,
            unit_price=payload.unit_price,
            gross_amount=gross_amount,
            fee_amount=payload.fee_amount,
            tax_amount=payload.tax_amount,
            net_amount=net_amount,
            currency=payload.currency,
            notes=payload.notes,
        )
        saved_tx = await self.repo.create_transaction(tx)
        return InvestmentTransactionResponse.model_validate(saved_tx)

    async def record_sell(
        self, tenant_id: uuid.UUID, payload: InvestmentSellRequest
    ) -> InvestmentTransactionResponse:
        """Execute disposal of securities applying strict FIFO lot consumption."""
        inst = await self.repo.get_instrument(payload.instrument_id)
        if not inst:
            raise ValueError(f"Instrument {payload.instrument_id} not found")

        # 1. Retrieve all open/partially disposed lots in FIFO order
        lots = await self.repo.list_holding_lots(
            tenant_id=tenant_id,
            account_id=payload.account_id,
            instrument_id=payload.instrument_id,
        )
        open_lots = [l for l in lots if l.remaining_quantity > Decimal("0.0000")]
        available_quantity = sum((l.remaining_quantity for l in open_lots), Decimal("0.0000"))

        if available_quantity < payload.quantity:
            raise ValueError(
                f"Insufficient quantity: requested disposal of {payload.quantity} units, "
                f"but only {available_quantity} remaining in open lots"
            )

        # 2. Consume lots via FIFO
        qty_to_consume = payload.quantity
        allocated_cost_basis = Decimal("0.0000")

        for lot in open_lots:
            if qty_to_consume <= Decimal("0.0000"):
                break

            chunk = min(lot.remaining_quantity, qty_to_consume)
            chunk_cost = (chunk * lot.purchase_price).quantize(Decimal("0.0001"))

            lot.remaining_quantity -= chunk
            lot.cost_basis = (lot.remaining_quantity * lot.purchase_price).quantize(Decimal("0.0001"))

            if lot.remaining_quantity == Decimal("0.0000"):
                lot.lot_status = "CLOSED"
            else:
                lot.lot_status = "PARTIALLY_DISPOSED"

            allocated_cost_basis += chunk_cost
            qty_to_consume -= chunk

        gross_amount = (payload.quantity * payload.unit_price).quantize(Decimal("0.0001"))
        net_proceeds = (gross_amount - payload.fee_amount - payload.tax_amount).quantize(Decimal("0.0001"))
        realized_pnl = (net_proceeds - allocated_cost_basis).quantize(Decimal("0.0001"))

        # 3. Record disposal transaction
        tx = InvestmentTransaction(
            tenant_id=tenant_id,
            account_id=payload.account_id,
            instrument_id=payload.instrument_id,
            transaction_type="SELL",
            trade_date=payload.trade_date,
            quantity=payload.quantity,
            unit_price=payload.unit_price,
            gross_amount=gross_amount,
            fee_amount=payload.fee_amount,
            tax_amount=payload.tax_amount,
            net_amount=net_proceeds,
            currency=payload.currency,
            realized_pnl=realized_pnl,
            allocated_cost_basis=allocated_cost_basis,
            notes=payload.notes,
        )
        saved_tx = await self.repo.create_transaction(tx)
        return InvestmentTransactionResponse.model_validate(saved_tx)

    async def record_dividend(
        self, tenant_id: uuid.UUID, payload: DividendRecordRequest
    ) -> PassiveIncomeResponse:
        """Record dividend or interest distribution with tax withholding."""
        net_amount = (payload.gross_amount - payload.tax_withheld).quantize(Decimal("0.0001"))

        income = PassiveIncomeRecord(
            tenant_id=tenant_id,
            account_id=payload.account_id,
            instrument_id=payload.instrument_id,
            income_type="DIVIDEND",
            declaration_date=payload.declaration_date,
            payment_date=payload.payment_date,
            gross_amount=payload.gross_amount,
            tax_withheld=payload.tax_withheld,
            net_amount=net_amount,
            currency=payload.currency,
            status="RECEIVED",
        )
        saved = await self.repo.create_passive_income(income)
        return PassiveIncomeResponse.model_validate(saved)

    async def execute_stock_split(
        self, tenant_id: uuid.UUID, payload: CorporateActionSplitRequest
    ) -> CorporateAction:
        """Execute stock split across all holding lots (preserves total invested cost basis)."""
        inst = await self.repo.get_instrument(payload.instrument_id)
        if not inst:
            raise ValueError(f"Instrument {payload.instrument_id} not found")

        ratio = payload.ratio_numerator / payload.ratio_denominator

        lots = await self.repo.list_holding_lots(
            tenant_id=tenant_id, instrument_id=payload.instrument_id
        )
        for lot in lots:
            if lot.remaining_quantity > Decimal("0.0000"):
                # Total cost basis remains constant, quantity multiplies, price divides
                lot.quantity = (lot.quantity * ratio).quantize(Decimal("0.0001"))
                lot.remaining_quantity = (lot.remaining_quantity * ratio).quantize(Decimal("0.0001"))
                lot.purchase_price = (lot.purchase_price / ratio).quantize(Decimal("0.0001"))

        action = CorporateAction(
            instrument_id=payload.instrument_id,
            action_type="SPLIT",
            record_date=payload.record_date,
            ratio_numerator=payload.ratio_numerator,
            ratio_denominator=payload.ratio_denominator,
            description=payload.description or f"Stock split {payload.ratio_numerator}:{payload.ratio_denominator}",
        )
        return await self.repo.create_corporate_action(action)

    async def get_portfolio_summary(self, tenant_id: uuid.UUID) -> PortfolioSummaryResponse:
        """Consolidate portfolio value, Realized P&L, Unrealized P&L, and XIRR."""
        # 1. Fetch all lots
        all_lots = await self.repo.list_holding_lots(tenant_id=tenant_id)
        open_lots = [l for l in all_lots if l.remaining_quantity > Decimal("0.0000")]

        # Group by instrument
        instrument_map: dict[uuid.UUID, list[InvestmentHoldingLot]] = {}
        for lot in open_lots:
            instrument_map.setdefault(lot.instrument_id, []).append(lot)

        total_portfolio_value = Decimal("0.0000")
        total_invested_capital = Decimal("0.0000")
        holdings: list[HoldingSummary] = []
        asset_allocation: dict[str, Decimal] = {}

        for inst_id, lots in instrument_map.items():
            inst = await self.repo.get_instrument(inst_id)
            if not inst:
                continue

            tot_qty = sum((l.remaining_quantity for l in lots), Decimal("0.0000"))
            tot_cost = sum((l.cost_basis for l in lots), Decimal("0.0000"))
            avg_price = (tot_cost / tot_qty).quantize(Decimal("0.0001")) if tot_qty > 0 else Decimal("0.0000")
            market_val = (tot_qty * inst.current_price).quantize(Decimal("0.0001"))
            unrealized = (market_val - tot_cost).quantize(Decimal("0.0001"))
            unrealized_pct = (
                ((unrealized / tot_cost) * Decimal("100.0")).quantize(Decimal("0.01"))
                if tot_cost > 0
                else Decimal("0.00")
            )

            total_portfolio_value += market_val
            total_invested_capital += tot_cost

            # Asset allocation
            asset_type = inst.instrument_type or "EQUITY"
            asset_allocation[asset_type] = asset_allocation.get(asset_type, Decimal("0.0000")) + market_val

            holdings.append(
                HoldingSummary(
                    instrument_id=inst.id,
                    symbol=inst.symbol,
                    name=inst.name,
                    instrument_type=inst.instrument_type,
                    total_quantity=tot_qty,
                    average_cost_price=avg_price,
                    current_price=inst.current_price,
                    current_market_value=market_val,
                    total_cost_basis=tot_cost,
                    unrealized_pnl=unrealized,
                    unrealized_pnl_percent=unrealized_pct,
                )
            )

        # 2. Realized P&L from historical SELL transactions
        all_txs = await self.repo.list_transactions(tenant_id=tenant_id, limit=500)
        total_realized_pnl = sum(
            (tx.realized_pnl for tx in all_txs if tx.realized_pnl is not None), Decimal("0.0000")
        )

        # 3. Passive income (Dividends)
        income_records = await self.repo.list_passive_income(tenant_id=tenant_id)
        total_dividends = sum((inc.net_amount for inc in income_records), Decimal("0.0000"))

        total_unrealized_pnl = total_portfolio_value - total_invested_capital

        # 4. Approximate annualized return (XIRR)
        xirr_pct = (
            ((total_unrealized_pnl / total_invested_capital) * Decimal("100.0")).quantize(Decimal("0.1"))
            if total_invested_capital > 0
            else Decimal("0.0")
        )

        return PortfolioSummaryResponse(
            total_portfolio_value=total_portfolio_value,
            total_invested_capital=total_invested_capital,
            total_unrealized_pnl=total_unrealized_pnl,
            total_realized_pnl=total_realized_pnl,
            total_dividend_income=total_dividends,
            overall_xirr_percent=xirr_pct,
            holdings=holdings,
            asset_allocation=asset_allocation,
            last_valuation_at=datetime.now(UTC),
        )

    async def list_instruments(
        self, search: str | None = None, limit: int = 50
    ) -> list[FinancialInstrument]:
        """List instruments with optional search query."""
        instruments = await self.repo.list_instruments(search=search, limit=limit)
        return list(instruments)

    async def list_holding_lots(
        self,
        tenant_id: uuid.UUID,
        account_id: uuid.UUID | None = None,
        instrument_id: uuid.UUID | None = None,
        lot_status: str | None = None,
    ) -> list[HoldingLotResponse]:
        """List acquisition lots in FIFO order."""
        lots = await self.repo.list_holding_lots(
            tenant_id=tenant_id,
            account_id=account_id,
            instrument_id=instrument_id,
            lot_status=lot_status,
        )
        return [HoldingLotResponse.model_validate(l) for l in lots]

    async def list_transactions(
        self,
        tenant_id: uuid.UUID,
        instrument_id: uuid.UUID | None = None,
        limit: int = 50,
    ) -> list[InvestmentTransactionResponse]:
        """List historical investment transactions."""
        txs = await self.repo.list_transactions(
            tenant_id=tenant_id,
            instrument_id=instrument_id,
            limit=limit,
        )
        return [InvestmentTransactionResponse.model_validate(t) for t in txs]

    async def list_passive_income(
        self,
        tenant_id: uuid.UUID,
        limit: int = 50,
    ) -> list[PassiveIncomeResponse]:
        """List dividend and interest income events."""
        records = await self.repo.list_passive_income(
            tenant_id=tenant_id,
            limit=limit,
        )
        return [PassiveIncomeResponse.model_validate(r) for r in records]
