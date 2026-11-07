"""WealthOS Journal Reversal Application Service.

Generates exact mirrored reversal journal entries with bidirectional links,
preserving full immutable historical audit trails.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.accounting.domain.accounting_rules import JournalStatus
from app.domains.accounting.domain.exceptions import (
    AccountingPeriodClosedError,
    DuplicateTransactionError,
    JournalEntryNotFoundError,
    ReversalNotAllowedError,
)
from app.domains.accounting.models.idempotency_record import AccountingIdempotencyRecord
from app.domains.accounting.models.journal_entry import JournalEntry
from app.domains.accounting.models.journal_line import JournalLine
from app.domains.accounting.repositories.journal_repository import JournalRepository
from app.domains.accounting.repositories.period_repository import PeriodRepository
from app.domains.accounting.schemas.journal_entry import ReverseJournalRequest
from app.domains.accounting.services.posting_service import _compute_hash
from app.domains.audit.service import record_security_event

logger = get_logger("wealthos.accounting.reversal")


class ReversalService:
    """Service orchestrating immutable journal entry reversals."""

    @staticmethod
    async def reverse_journal_entry(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        entry_id: uuid.UUID,
        payload: ReverseJournalRequest,
        user_id: uuid.UUID | None = None,
        correlation_id: str | None = None,
    ) -> JournalEntry:
        """Reverse a posted journal entry by creating an exact mirrored counter-entry."""
        # 1. Idempotency Check
        if payload.idempotency_key:
            existing_record = await JournalRepository.get_idempotency_record(
                session=session,
                tenant_id=tenant_id,
                idempotency_key=payload.idempotency_key,
            )
            if existing_record and existing_record.journal_entry_id:
                existing_reversal = await JournalRepository.get_by_id(
                    session=session,
                    entry_id=existing_record.journal_entry_id,
                    tenant_id=tenant_id,
                )
                if existing_reversal:
                    logger.info(
                        f"Idempotent replay for reversal {existing_reversal.entry_number} (key={payload.idempotency_key})"
                    )
                    return existing_reversal
                raise DuplicateTransactionError(
                    f"Idempotency key '{payload.idempotency_key}' already used with different operation."
                )

        # 2. Acquire row lock on original journal entry
        original = await JournalRepository.get_by_id(session, entry_id, tenant_id, for_update=True)
        if not original:
            raise JournalEntryNotFoundError(f"Journal entry '{entry_id}' not found.")

        # 3. Validate eligibility for reversal
        if original.status != JournalStatus.POSTED.value:
            raise ReversalNotAllowedError(
                f"Cannot reverse journal in status '{original.status}'. Only POSTED entries can be reversed."
            )
        if original.reversed_by_entry_id is not None:
            raise ReversalNotAllowedError(
                f"Journal entry {original.entry_number} has already been reversed by entry ID {original.reversed_by_entry_id}."
            )
        if original.reversal_of_entry_id is not None:
            raise ReversalNotAllowedError(
                f"Cannot reverse entry {original.entry_number} because it is itself a reversal. Post an adjustment entry instead."
            )

        # 4. Check target accounting period
        reversal_date = payload.reversal_date or original.entry_date
        is_closed = await PeriodRepository.is_date_in_closed_period(
            session=session,
            tenant_id=tenant_id,
            entry_date=reversal_date,
        )
        if is_closed:
            raise AccountingPeriodClosedError(
                f"Cannot post reversal for date {reversal_date}: Accounting period is closed."
            )

        # 5. Generate reversal entry number and construct mirror entry in DRAFT status first
        reversal_entry_number = await JournalRepository.generate_entry_number(
            session, tenant_id, prefix="REV"
        )
        now = datetime.now(UTC)

        reversal_entry = JournalEntry(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            entry_number=reversal_entry_number,
            entry_date=reversal_date,
            posting_date=None,
            description=f"REVERSAL of {original.entry_number}: {payload.reason.strip()}",
            reference=f"REV-{original.entry_number}",
            source_type="REVERSAL",
            source_id=str(original.id),
            status=JournalStatus.DRAFT.value,
            functional_currency=original.functional_currency,
            total_debit=original.total_credit,
            total_credit=original.total_debit,
            idempotency_key=payload.idempotency_key,
            created_by=user_id,
            posted_by=None,
            posted_at=None,
            reversal_of_entry_id=original.id,
            reversed_by_entry_id=None,
            lines=[],
        )

        # 6. Mirror every line (swap debits and credits)
        for orig_line in original.lines:
            rev_line = JournalLine(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                journal_entry_id=reversal_entry.id,
                account_id=orig_line.account_id,
                line_number=orig_line.line_number,
                description=f"Reversal of line {orig_line.line_number}: {orig_line.description or ''}".strip(),
                debit_amount=orig_line.credit_amount,
                credit_amount=orig_line.debit_amount,
                transaction_currency=orig_line.transaction_currency,
                transaction_amount=orig_line.transaction_amount,
                exchange_rate=orig_line.exchange_rate,
                functional_debit_amount=orig_line.functional_credit_amount,
                functional_credit_amount=orig_line.functional_debit_amount,
            )
            reversal_entry.lines.append(rev_line)

        # 7. Persist reversal draft and lines
        await JournalRepository.create(session, reversal_entry)

        # 8. Transition reversal entry to POSTED
        reversal_entry.status = JournalStatus.POSTED.value
        reversal_entry.posting_date = now
        reversal_entry.posted_at = now
        reversal_entry.posted_by = user_id

        # 9. Bidirectionally link original entry
        original.reversed_by_entry_id = reversal_entry.id
        original.status = JournalStatus.REVERSED.value
        original.status = JournalStatus.REVERSED.value

        # 9. Persist idempotency record if requested
        if payload.idempotency_key:
            rec = AccountingIdempotencyRecord(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                idempotency_key=payload.idempotency_key,
                request_fingerprint=_compute_hash(
                    {
                        "original_entry_id": str(original.id),
                        "reason": payload.reason,
                        "reversal_date": str(reversal_date),
                    }
                ),
                operation_type="JOURNAL_REVERSE",
                status="COMMITTED",
                journal_entry_id=reversal_entry.id,
            )
            await JournalRepository.create_idempotency_record(session, rec)

        # 10. Security audit event
        await record_security_event(
            session=session,
            event_type="accounting.journal_reversed",
            status="success",
            tenant_id=tenant_id,
            user_id=user_id,
            correlation_id=correlation_id,
            details={
                "original_entry_id": str(original.id),
                "original_entry_number": original.entry_number,
                "reversal_entry_id": str(reversal_entry.id),
                "reversal_entry_number": reversal_entry.entry_number,
                "reason": payload.reason,
                "total_reversed_amount": str(reversal_entry.total_debit),
            },
        )

        await session.flush()
        logger.info(
            f"Successfully reversed journal {original.entry_number} with {reversal_entry.entry_number} for tenant {tenant_id}"
        )
        return reversal_entry
