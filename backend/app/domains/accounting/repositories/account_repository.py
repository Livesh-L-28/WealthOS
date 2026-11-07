"""WealthOS Chart of Accounts Repository."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.accounting.domain.accounting_rules import JournalStatus
from app.domains.accounting.models.account import Account
from app.domains.accounting.models.journal_entry import JournalEntry
from app.domains.accounting.models.journal_line import JournalLine


class AccountRepository:
    """Database query and persistence operations for Chart of Accounts."""

    @staticmethod
    async def get_by_id(
        session: AsyncSession,
        account_id: uuid.UUID,
        tenant_id: uuid.UUID | None = None,
    ) -> Account | None:
        """Fetch account by ID, optionally scoped to tenant."""
        stmt = select(Account).where(Account.id == account_id)
        if tenant_id is not None:
            stmt = stmt.where(Account.tenant_id == tenant_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_code(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        account_code: str,
    ) -> Account | None:
        """Fetch account by unique account code within a tenant."""
        stmt = select(Account).where(
            Account.tenant_id == tenant_id,
            Account.account_code == account_code.strip(),
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def list_accounts(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        account_type: str | None = None,
        is_active: bool | None = None,
    ) -> list[Account]:
        """List accounts for tenant with optional filters, ordered by account_code."""
        stmt = select(Account).where(Account.tenant_id == tenant_id)
        if account_type is not None:
            stmt = stmt.where(Account.account_type == account_type)
        if is_active is not None:
            stmt = stmt.where(Account.is_active == is_active)
        stmt = stmt.order_by(Account.account_code.asc())
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def create(session: AsyncSession, account: Account) -> Account:
        """Persist a new account."""
        session.add(account)
        await session.flush()
        return account

    @staticmethod
    async def check_circular_reference(
        session: AsyncSession,
        account_id: uuid.UUID,
        proposed_parent_id: uuid.UUID,
    ) -> bool:
        """Verify whether setting proposed_parent_id on account_id causes a cycle.

        Returns True if a circular reference is detected, False otherwise.
        """
        if account_id == proposed_parent_id:
            return True

        current_id: uuid.UUID | None = proposed_parent_id
        visited: set[uuid.UUID] = {account_id}
        max_depth = 50

        while current_id is not None and max_depth > 0:
            if current_id in visited:
                return True
            visited.add(current_id)

            stmt = select(Account.parent_account_id).where(Account.id == current_id)
            result = await session.execute(stmt)
            parent_id = result.scalar_one_or_none()
            if parent_id is None:
                break
            current_id = parent_id
            max_depth -= 1

        return False

    @staticmethod
    async def has_posted_journal_lines(session: AsyncSession, account_id: uuid.UUID) -> bool:
        """Check if any posted journal entries reference this account."""
        stmt = (
            select(func.count(JournalLine.id))
            .join(JournalEntry, JournalLine.journal_entry_id == JournalEntry.id)
            .where(
                JournalLine.account_id == account_id,
                JournalEntry.status.in_([JournalStatus.POSTED.value, JournalStatus.REVERSED.value]),
            )
        )
        result = await session.execute(stmt)
        count = result.scalar_one()
        return count > 0
