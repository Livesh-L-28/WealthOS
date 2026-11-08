"""WealthOS Cash Management Repository with RLS Enforcement."""

import uuid
from collections.abc import Sequence
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.cash.models import (
    AccountTransfer,
    FinancialAccount,
    FinancialScenario,
    ForecastRun,
    RecurringTransactionRule,
)


class CashRepository:
    """Repository handling all cash, accounts, transfers, and forecasting persistence."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_financial_accounts(
        self, tenant_id: uuid.UUID, is_active: bool = True
    ) -> Sequence[FinancialAccount]:
        """List financial accounts owned by tenant."""
        stmt = (
            select(FinancialAccount)
            .where(
                FinancialAccount.tenant_id == tenant_id,
                FinancialAccount.is_active == is_active,
            )
            .order_by(FinancialAccount.current_balance.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_financial_account(
        self, tenant_id: uuid.UUID, account_id: uuid.UUID
    ) -> FinancialAccount | None:
        """Fetch a single financial account by ID."""
        stmt = select(FinancialAccount).where(
            FinancialAccount.tenant_id == tenant_id,
            FinancialAccount.id == account_id,
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def create_financial_account(
        self, account: FinancialAccount
    ) -> FinancialAccount:
        """Persist a new financial account."""
        self.session.add(account)
        await self.session.flush()
        return account

    async def create_transfer(self, transfer: AccountTransfer) -> AccountTransfer:
        """Persist an account transfer."""
        self.session.add(transfer)
        await self.session.flush()
        return transfer

    async def list_transfers(
        self, tenant_id: uuid.UUID, limit: int = 50
    ) -> Sequence[AccountTransfer]:
        """List historical transfers."""
        stmt = (
            select(AccountTransfer)
            .where(AccountTransfer.tenant_id == tenant_id)
            .order_by(AccountTransfer.transfer_date.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def list_recurring_rules(
        self, tenant_id: uuid.UUID, is_active: bool = True
    ) -> Sequence[RecurringTransactionRule]:
        """List active recurring transaction rules."""
        stmt = (
            select(RecurringTransactionRule)
            .where(
                RecurringTransactionRule.tenant_id == tenant_id,
                RecurringTransactionRule.is_active == is_active,
            )
            .order_by(RecurringTransactionRule.next_due_date.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create_recurring_rule(
        self, rule: RecurringTransactionRule
    ) -> RecurringTransactionRule:
        """Persist a recurring rule."""
        self.session.add(rule)
        await self.session.flush()
        return rule

    async def save_forecast_run(self, run: ForecastRun) -> ForecastRun:
        """Persist a forecast run record."""
        self.session.add(run)
        await self.session.flush()
        return run

    async def save_scenario(self, scenario: FinancialScenario) -> FinancialScenario:
        """Persist a what-if scenario record."""
        self.session.add(scenario)
        await self.session.flush()
        return scenario
