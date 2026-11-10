"""WealthOS Journal Entry Application Service.

Manages creation, inspection, and modification of draft journal entries.
"""

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.accounting.domain.accounting_rules import JournalStatus
from app.domains.accounting.domain.exceptions import (
    AccountNotFoundError,
    ImmutableLedgerError,
    JournalEntryNotFoundError,
)
from app.domains.accounting.domain.money import (
    quantize_money,
    quantize_rate,
    validate_currency_code,
)
from app.domains.accounting.domain.validation import validate_journal_lines_balance
from app.domains.accounting.models.journal_entry import JournalEntry
from app.domains.accounting.models.journal_line import JournalLine
from app.domains.accounting.repositories.account_repository import AccountRepository
from app.domains.accounting.repositories.journal_repository import JournalRepository
from app.domains.accounting.schemas.journal_entry import (
    CreateJournalEntryRequest,
)

logger = get_logger("wealthos.accounting.journal")


class JournalService:
    """Service handling lifecycle of journal drafts and queries."""

    @staticmethod
    async def create_draft(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        payload: CreateJournalEntryRequest,
        created_by: uuid.UUID | None = None,
    ) -> JournalEntry:
        """Create a new DRAFT double-entry journal entry."""
        # Validate lines balance and money invariants
        tot_deb, tot_cred = validate_journal_lines_balance(
            lines=payload.lines,
            functional_currency=payload.functional_currency,
        )

        # Validate accounts exist and belong to tenant
        account_ids = {line.account_id for line in payload.lines}
        for aid in account_ids:
            act = await AccountRepository.get_by_id(session, aid, tenant_id)
            if not act:
                raise AccountNotFoundError(f"Account '{aid}' does not exist in this tenant.")
            if not act.is_active:
                raise ValueError(f"Account '{act.account_code}' ({act.account_name}) is inactive.")

        entry_number = await JournalRepository.generate_entry_number(session, tenant_id)

        journal_entry = JournalEntry(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            entry_number=entry_number,
            entry_date=payload.entry_date,
            posting_date=None,
            description=payload.description.strip(),
            reference=payload.reference.strip() if payload.reference else None,
            source_type=payload.source_type.strip(),
            source_id=payload.source_id.strip() if payload.source_id else None,
            status=JournalStatus.DRAFT.value,
            functional_currency=payload.functional_currency,
            total_debit=tot_deb,
            total_credit=tot_cred,
            idempotency_key=payload.idempotency_key,
            created_by=created_by,
            posted_by=None,
            posted_at=None,
            lines=[],
        )

        func_curr = payload.functional_currency
        for idx, line_req in enumerate(payload.lines, start=1):
            debit = quantize_money(line_req.debit_amount)
            credit = quantize_money(line_req.credit_amount)
            rate = quantize_rate(line_req.exchange_rate)
            tx_curr = validate_currency_code(line_req.transaction_currency)
            tx_amount = line_req.transaction_amount
            if tx_amount is None or tx_amount <= 0:
                tx_amount = debit if debit > 0 else credit
            tx_amount = quantize_money(tx_amount)

            if debit > 0:
                f_deb = quantize_money(debit * rate) if tx_curr != func_curr else debit
                f_cred = Decimal("0.0000")
            else:
                f_deb = Decimal("0.0000")
                f_cred = quantize_money(credit * rate) if tx_curr != func_curr else credit

            line = JournalLine(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                journal_entry_id=journal_entry.id,
                account_id=line_req.account_id,
                line_number=idx,
                description=line_req.description.strip() if line_req.description else None,
                debit_amount=debit,
                credit_amount=credit,
                transaction_currency=tx_curr,
                transaction_amount=tx_amount,
                exchange_rate=rate,
                functional_debit_amount=f_deb,
                functional_credit_amount=f_cred,
            )
            journal_entry.lines.append(line)

        await JournalRepository.create(session, journal_entry)
        logger.info(f"Created DRAFT journal entry {entry_number} for tenant {tenant_id}")
        return journal_entry

    @staticmethod
    async def get_entry(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        entry_id: uuid.UUID,
    ) -> JournalEntry:
        """Fetch journal entry by ID."""
        entry = await JournalRepository.get_by_id(session, entry_id, tenant_id)
        if not entry:
            raise JournalEntryNotFoundError(f"Journal entry '{entry_id}' not found.")
        return entry

    @staticmethod
    async def delete_draft(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        entry_id: uuid.UUID,
    ) -> None:
        """Delete an unposted DRAFT journal entry."""
        entry = await JournalRepository.get_by_id(session, entry_id, tenant_id, for_update=True)
        if not entry:
            raise JournalEntryNotFoundError(f"Journal entry '{entry_id}' not found.")
        if entry.status != JournalStatus.DRAFT.value:
            raise ImmutableLedgerError(
                f"Cannot delete journal entry in status '{entry.status}'. Posted and reversed journals are immutable."
            )
        await JournalRepository.delete_draft(session, entry)
        logger.info(f"Deleted draft journal entry {entry.entry_number}")

    @staticmethod
    async def list_entries(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        status: str | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[JournalEntry]:
        """List tenant journal entries."""
        return await JournalRepository.list_entries(
            session=session,
            tenant_id=tenant_id,
            status=status,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            offset=offset,
        )
