"""WealthOS Professional Investment Accounting Repository with RLS Enforcement."""

import uuid
from collections.abc import Sequence
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.investments.models import (
    CorporateAction,
    FinancialInstrument,
    InvestmentHoldingLot,
    InvestmentTransaction,
    PassiveIncomeRecord,
)


class InvestmentRepository:
    """Repository handling securities, FIFO acquisition lots, trades, and passive income."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_or_create_instrument(
        self,
        symbol: str,
        name: str,
        instrument_type: str = "EQUITY",
        exchange: str = "NSE",
        currency: str = "INR",
        current_price: Decimal = Decimal("0.0000"),
        isin: str | None = None,
    ) -> FinancialInstrument:
        """Fetch existing instrument or create a new entry in securities master."""
        stmt = select(FinancialInstrument).where(
            FinancialInstrument.symbol == symbol,
            FinancialInstrument.exchange == exchange,
        )
        result = await self.session.execute(stmt)
        inst = result.scalars().first()
        if inst:
            if current_price > Decimal("0.0000") and current_price != inst.current_price:
                inst.current_price = current_price
            return inst

        inst = FinancialInstrument(
            symbol=symbol,
            name=name,
            isin=isin,
            instrument_type=instrument_type,
            exchange=exchange,
            currency=currency,
            current_price=current_price,
        )
        self.session.add(inst)
        await self.session.flush()
        return inst

    async def get_instrument(self, instrument_id: uuid.UUID) -> FinancialInstrument | None:
        """Fetch instrument by ID."""
        stmt = select(FinancialInstrument).where(FinancialInstrument.id == instrument_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def list_instruments(
        self, search: str | None = None, limit: int = 50
    ) -> Sequence[FinancialInstrument]:
        """List instruments with optional name/symbol search."""
        stmt = select(FinancialInstrument).order_by(FinancialInstrument.symbol.asc())
        if search:
            pattern = f"%{search.strip()}%"
            stmt = stmt.where(
                (FinancialInstrument.symbol.ilike(pattern))
                | (FinancialInstrument.name.ilike(pattern))
            )
        stmt = stmt.limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create_holding_lot(self, lot: InvestmentHoldingLot) -> InvestmentHoldingLot:
        """Persist a new acquisition lot."""
        self.session.add(lot)
        await self.session.flush()
        return lot

    async def list_holding_lots(
        self,
        tenant_id: uuid.UUID,
        account_id: uuid.UUID | None = None,
        instrument_id: uuid.UUID | None = None,
        lot_status: str | None = None,
    ) -> Sequence[InvestmentHoldingLot]:
        """List acquisition lots ordered by purchase date ASC (FIFO ordering)."""
        stmt = (
            select(InvestmentHoldingLot)
            .where(InvestmentHoldingLot.tenant_id == tenant_id)
            .order_by(InvestmentHoldingLot.purchase_date.asc(), InvestmentHoldingLot.created_at.asc())
        )
        if account_id:
            stmt = stmt.where(InvestmentHoldingLot.account_id == account_id)
        if instrument_id:
            stmt = stmt.where(InvestmentHoldingLot.instrument_id == instrument_id)
        if lot_status:
            stmt = stmt.where(InvestmentHoldingLot.lot_status == lot_status)

        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create_transaction(
        self, tx: InvestmentTransaction
    ) -> InvestmentTransaction:
        """Persist an investment transaction."""
        self.session.add(tx)
        await self.session.flush()
        return tx

    async def list_transactions(
        self,
        tenant_id: uuid.UUID,
        instrument_id: uuid.UUID | None = None,
        limit: int = 50,
    ) -> Sequence[InvestmentTransaction]:
        """List historical investment transactions."""
        stmt = (
            select(InvestmentTransaction)
            .where(InvestmentTransaction.tenant_id == tenant_id)
            .order_by(InvestmentTransaction.trade_date.desc(), InvestmentTransaction.created_at.desc())
        )
        if instrument_id:
            stmt = stmt.where(InvestmentTransaction.instrument_id == instrument_id)
        stmt = stmt.limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create_passive_income(
        self, income: PassiveIncomeRecord
    ) -> PassiveIncomeRecord:
        """Persist a dividend or interest income record."""
        self.session.add(income)
        await self.session.flush()
        return income

    async def list_passive_income(
        self, tenant_id: uuid.UUID, limit: int = 50
    ) -> Sequence[PassiveIncomeRecord]:
        """List dividend and interest records."""
        stmt = (
            select(PassiveIncomeRecord)
            .where(PassiveIncomeRecord.tenant_id == tenant_id)
            .order_by(PassiveIncomeRecord.payment_date.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create_corporate_action(
        self, action: CorporateAction
    ) -> CorporateAction:
        """Persist corporate action event."""
        self.session.add(action)
        await self.session.flush()
        return action

