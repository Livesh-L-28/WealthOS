"""WealthOS Atomic Journal Posting Application Service.

Enforces idempotency, accounting period restrictions, double-entry verification,
and immutable transition to POSTED status with audit events.
"""

import hashlib
import json
import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.accounting.domain.accounting_rules import JournalStatus
from app.domains.accounting.domain.exceptions import (
    AccountingPeriodClosedError,
    DuplicateTransactionError,
    ImmutableLedgerError,
    JournalEntryNotFoundError,
)
from app.domains.accounting.domain.validation import validate_journal_lines_balance
from app.domains.accounting.models.idempotency_record import AccountingIdempotencyRecord
from app.domains.accounting.models.journal_entry import JournalEntry
from app.domains.accounting.repositories.journal_repository import JournalRepository
from app.domains.accounting.repositories.period_repository import PeriodRepository
from app.domains.accounting.schemas.journal_entry import (
    CreateJournalEntryRequest,
    PostJournalRequest,
)
from app.domains.accounting.services.journal_service import JournalService
from app.domains.audit.service import record_security_event

logger = get_logger("wealthos.accounting.posting")


def _compute_hash(data: dict) -> str:
    """Compute deterministic SHA-256 hash of a payload dictionary."""
    encoded = json.dumps(data, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


class PostingService:
    """Service orchestrating atomic journal posting with idempotency and audit controls."""

    @staticmethod
    async def post_journal_entry(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        entry_id: uuid.UUID,
        payload: PostJournalRequest | None = None,
        user_id: uuid.UUID | None = None,
        correlation_id: str | None = None,
        fingerprint: str | None = None,
    ) -> JournalEntry:
        """Atomically post an existing DRAFT journal entry."""
        idempotency_key = payload.idempotency_key if payload else None

        # 1. Idempotency Check
        if idempotency_key:
            existing_record = await JournalRepository.get_idempotency_record(
                session=session,
                tenant_id=tenant_id,
                idempotency_key=idempotency_key,
            )
            if existing_record:
                if existing_record.journal_entry_id == entry_id:
                    # Idempotent replay of same request
                    entry = await JournalRepository.get_by_id(session, entry_id, tenant_id)
                    if entry:
                        logger.info(
                            f"Idempotent replay for journal {entry.entry_number} (key={idempotency_key})"
                        )
                        return entry
                raise DuplicateTransactionError(
                    f"Idempotency key '{idempotency_key}' was already consumed for another transaction."
                )

        # 2. Acquire row lock on journal entry
        entry = await JournalRepository.get_by_id(session, entry_id, tenant_id, for_update=True)
        if not entry:
            raise JournalEntryNotFoundError(f"Journal entry '{entry_id}' not found.")

        # Check existing status
        if entry.status == JournalStatus.POSTED.value:
            return entry
        if entry.status == JournalStatus.REVERSED.value:
            raise ImmutableLedgerError("Cannot post a reversed journal entry.")

        # 3. Verify Accounting Period is not closed
        is_closed = await PeriodRepository.is_date_in_closed_period(
            session=session,
            tenant_id=tenant_id,
            entry_date=entry.entry_date,
        )
        if is_closed:
            raise AccountingPeriodClosedError(
                f"Cannot post journal entry for date {entry.entry_date}: Accounting period is closed."
            )

        # 4. Strict double-entry balance check
        tot_deb, tot_cred = validate_journal_lines_balance(
            lines=entry.lines,
            functional_currency=entry.functional_currency,
        )
        entry.total_debit = tot_deb
        entry.total_credit = tot_cred

        # 5. Mark POSTED
        now = datetime.now(UTC)
        entry.status = JournalStatus.POSTED.value
        entry.posted_at = now
        entry.posting_date = now
        entry.posted_by = user_id

        # 6. Record idempotency record if key was provided
        if idempotency_key:
            rec = AccountingIdempotencyRecord(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                idempotency_key=idempotency_key,
                request_fingerprint=fingerprint
                or _compute_hash({"entry_id": str(entry.id), "date": str(entry.entry_date)}),
                operation_type="JOURNAL_POST",
                status="COMMITTED",
                journal_entry_id=entry.id,
            )
            await JournalRepository.create_idempotency_record(session, rec)

        # 7. Security audit event
        await record_security_event(
            session=session,
            event_type="accounting.journal_posted",
            status="success",
            tenant_id=tenant_id,
            user_id=user_id,
            correlation_id=correlation_id,
            details={
                "journal_entry_id": str(entry.id),
                "entry_number": entry.entry_number,
                "entry_date": entry.entry_date.isoformat(),
                "total_debit": str(entry.total_debit),
                "total_credit": str(entry.total_credit),
                "functional_currency": entry.functional_currency,
            },
        )

        await session.flush()
        logger.info(
            f"Successfully posted journal entry {entry.entry_number} for tenant {tenant_id}"
        )
        return entry

    @staticmethod
    async def create_and_post(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        payload: CreateJournalEntryRequest,
        user_id: uuid.UUID | None = None,
        correlation_id: str | None = None,
    ) -> JournalEntry:
        """Create a draft journal entry and immediately post it atomically."""
        # 1. Idempotency Pre-Check
        computed_hash = _compute_hash(payload.model_dump())
        if payload.idempotency_key:
            existing_record = await JournalRepository.get_idempotency_record(
                session=session,
                tenant_id=tenant_id,
                idempotency_key=payload.idempotency_key,
            )
            if existing_record and existing_record.journal_entry_id:
                existing_entry = await JournalRepository.get_by_id(
                    session=session,
                    entry_id=existing_record.journal_entry_id,
                    tenant_id=tenant_id,
                )
                if existing_entry:
                    if existing_record.request_fingerprint == computed_hash:
                        logger.info(
                            f"Idempotent replay for create_and_post (key={payload.idempotency_key}, entry={existing_entry.entry_number})"
                        )
                        return existing_entry
                    raise DuplicateTransactionError(
                        f"Idempotency key '{payload.idempotency_key}' already used with different payload."
                    )

        # 2. Create draft
        draft = await JournalService.create_draft(
            session=session,
            tenant_id=tenant_id,
            payload=payload,
            created_by=user_id,
        )

        # 3. Post entry
        post_req = PostJournalRequest(idempotency_key=payload.idempotency_key)
        posted = await PostingService.post_journal_entry(
            session=session,
            tenant_id=tenant_id,
            entry_id=draft.id,
            payload=post_req,
            user_id=user_id,
            correlation_id=correlation_id,
            fingerprint=computed_hash,
        )
        return posted
