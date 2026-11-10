"""WealthOS Ledger and Trial Balance Repository."""

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.accounting.domain.accounting_rules import JournalStatus
from app.domains.accounting.domain.money import quantize_money
from app.domains.accounting.models.account import Account
from app.domains.accounting.models.journal_entry import JournalEntry
from app.domains.accounting.models.journal_line import JournalLine


class LedgerRepository:
    """Read-optimized queries for General Ledger, Account Ledgers, and Trial Balance."""

    @staticmethod
    async def get_account_totals(
        session: AsyncSession,
        account_id: uuid.UUID,
        tenant_id: uuid.UUID,
        up_to_date: date | None = None,
        strictly_before_date: date | None = None,
    ) -> tuple[Decimal, Decimal]:
        """Compute sum of posted functional debits and credits for an account.

        Returns (total_debit, total_credit).
        """
        conditions = [
            JournalLine.account_id == account_id,
            JournalLine.tenant_id == tenant_id,
            JournalEntry.status.in_([JournalStatus.POSTED.value, JournalStatus.REVERSED.value]),
        ]
        if up_to_date is not None:
            conditions.append(JournalEntry.entry_date <= up_to_date)
        if strictly_before_date is not None:
            conditions.append(JournalEntry.entry_date < strictly_before_date)

        stmt = (
            select(
                func.coalesce(func.sum(JournalLine.functional_debit_amount), Decimal("0.0000")),
                func.coalesce(func.sum(JournalLine.functional_credit_amount), Decimal("0.0000")),
            )
            .join(JournalEntry, JournalLine.journal_entry_id == JournalEntry.id)
            .where(*conditions)
        )
        result = await session.execute(stmt)
        total_debit, total_credit = result.one()
        return quantize_money(total_debit), quantize_money(total_credit)

    @staticmethod
    async def get_account_ledger_lines(
        session: AsyncSession,
        account_id: uuid.UUID,
        tenant_id: uuid.UUID,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[tuple[JournalLine, JournalEntry]]:
        """Fetch posted journal lines and their parent journal entries for an account in date range."""
        conditions = [
            JournalLine.account_id == account_id,
            JournalLine.tenant_id == tenant_id,
            JournalEntry.status.in_([JournalStatus.POSTED.value, JournalStatus.REVERSED.value]),
        ]
        if start_date is not None:
            conditions.append(JournalEntry.entry_date >= start_date)
        if end_date is not None:
            conditions.append(JournalEntry.entry_date <= end_date)

        stmt = (
            select(JournalLine, JournalEntry)
            .join(JournalEntry, JournalLine.journal_entry_id == JournalEntry.id)
            .where(*conditions)
            .order_by(
                JournalEntry.entry_date.asc(),
                JournalEntry.posted_at.asc(),
                JournalLine.line_number.asc(),
            )
        )
        result = await session.execute(stmt)
        return list(result.all())

    @staticmethod
    async def get_trial_balance_aggregates(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        up_to_date: date | None = None,
    ) -> list[dict]:
        """Aggregate debits and credits per account for trial balance."""
        join_conditions = [
            JournalLine.journal_entry_id == JournalEntry.id,
            JournalEntry.status.in_([JournalStatus.POSTED.value, JournalStatus.REVERSED.value]),
        ]
        if up_to_date is not None:
            join_conditions.append(JournalEntry.entry_date <= up_to_date)

        stmt = (
            select(
                Account.id.label("account_id"),
                Account.account_code,
                Account.account_name,
                Account.account_type,
                Account.normal_balance,
                func.coalesce(
                    func.sum(JournalLine.functional_debit_amount), Decimal("0.0000")
                ).label("total_debit"),
                func.coalesce(
                    func.sum(JournalLine.functional_credit_amount), Decimal("0.0000")
                ).label("total_credit"),
            )
            .outerjoin(JournalLine, Account.id == JournalLine.account_id)
            .outerjoin(JournalEntry, and_(*join_conditions))
            .where(Account.tenant_id == tenant_id, Account.is_active.is_(True))
            .group_by(
                Account.id,
                Account.account_code,
                Account.account_name,
                Account.account_type,
                Account.normal_balance,
            )
            .order_by(Account.account_code.asc())
        )
        result = await session.execute(stmt)
        rows = []
        for row in result.all():
            rows.append(
                {
                    "account_id": row.account_id,
                    "account_code": row.account_code,
                    "account_name": row.account_name,
                    "account_type": row.account_type,
                    "normal_balance": row.normal_balance,
                    "total_debit": quantize_money(row.total_debit),
                    "total_credit": quantize_money(row.total_credit),
                }
            )
        return rows
