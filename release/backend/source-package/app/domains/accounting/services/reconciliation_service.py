"""WealthOS Financial Reconciliation Application Service."""

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.accounting.domain.accounting_rules import (
    JournalStatus,
    ReconciliationStatus,
)
from app.domains.accounting.domain.exceptions import JournalEntryNotFoundError
from app.domains.accounting.domain.money import quantize_money
from app.domains.accounting.models.reconciliation_record import ReconciliationRecord
from app.domains.accounting.repositories.journal_repository import JournalRepository
from app.domains.accounting.repositories.reconciliation_repository import (
    ReconciliationRepository,
)
from app.domains.accounting.schemas.reconciliation import (
    CreateReconciliationRequest,
    MarkDiscrepancyRequest,
    ReconcileMatchRequest,
)
from app.domains.audit.service import record_security_event

logger = get_logger("wealthos.accounting.reconciliation")


class ReconciliationService:
    """Service matching external financial statements to internal posted double-entry journals."""

    @staticmethod
    async def create_record(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        payload: CreateReconciliationRequest,
    ) -> ReconciliationRecord:
        """Register an external transaction record awaiting ledger reconciliation."""
        record = ReconciliationRecord(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            source_reference=payload.source_reference.strip(),
            account_id=payload.account_id,
            expected_amount=quantize_money(payload.expected_amount),
            posted_amount=None,
            currency_code=payload.currency_code,
            status=ReconciliationStatus.UNMATCHED.value,
            journal_entry_id=None,
            matched_at=None,
            matched_by=None,
            discrepancy_reason=None,
        )
        return await ReconciliationRepository.create(session, record)

    @staticmethod
    async def match_record(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        record_id: uuid.UUID,
        payload: ReconcileMatchRequest,
        user_id: uuid.UUID | None = None,
        correlation_id: str | None = None,
    ) -> ReconciliationRecord:
        """Match an external record against a posted double-entry journal entry."""
        record = await ReconciliationRepository.get_by_id(session, record_id, tenant_id)
        if not record:
            raise ValueError(f"Reconciliation record '{record_id}' not found.")

        journal = await JournalRepository.get_by_id(session, payload.journal_entry_id, tenant_id)
        if not journal:
            raise JournalEntryNotFoundError(
                f"Journal entry '{payload.journal_entry_id}' not found."
            )

        if journal.status != JournalStatus.POSTED.value:
            raise ValueError(
                f"Cannot reconcile against journal in '{journal.status}' status. Must be POSTED."
            )

        # Determine exact match vs discrepancy
        now = datetime.now(UTC)
        journal_total = journal.total_debit  # or credit (they are equal)
        is_exact_amount = quantize_money(abs(record.expected_amount)) == quantize_money(
            journal_total
        )
        is_currency_match = record.currency_code == journal.functional_currency

        record.posted_amount = journal_total
        record.journal_entry_id = journal.id
        record.matched_at = now
        record.matched_by = user_id

        if is_exact_amount and is_currency_match:
            record.status = ReconciliationStatus.MATCHED.value
            record.discrepancy_reason = payload.notes
        else:
            record.status = ReconciliationStatus.PARTIALLY_MATCHED.value
            discrepancy = f"Amount mismatch: expected={record.expected_amount} {record.currency_code}, journal={journal_total} {journal.functional_currency}."
            if payload.notes:
                discrepancy += f" Note: {payload.notes}"
            record.discrepancy_reason = discrepancy

        await record_security_event(
            session=session,
            event_type="accounting.reconciliation_matched",
            status="success",
            tenant_id=tenant_id,
            user_id=user_id,
            correlation_id=correlation_id,
            details={
                "record_id": str(record.id),
                "journal_entry_id": str(journal.id),
                "source_reference": record.source_reference,
                "status": record.status,
            },
        )
        await session.flush()
        return record

    @staticmethod
    async def flag_discrepancy(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        record_id: uuid.UUID,
        payload: MarkDiscrepancyRequest,
        user_id: uuid.UUID | None = None,
        correlation_id: str | None = None,
    ) -> ReconciliationRecord:
        """Mark an external record as having an unresolved discrepancy."""
        record = await ReconciliationRepository.get_by_id(session, record_id, tenant_id)
        if not record:
            raise ValueError(f"Reconciliation record '{record_id}' not found.")

        record.status = ReconciliationStatus.DISCREPANCY.value
        record.discrepancy_reason = payload.discrepancy_reason.strip()

        await record_security_event(
            session=session,
            event_type="accounting.reconciliation_discrepancy",
            status="success",
            tenant_id=tenant_id,
            user_id=user_id,
            correlation_id=correlation_id,
            details={
                "record_id": str(record.id),
                "source_reference": record.source_reference,
                "reason": record.discrepancy_reason,
            },
        )
        await session.flush()
        return record

    @staticmethod
    async def list_records(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        status: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[ReconciliationRecord]:
        """List reconciliation records."""
        return await ReconciliationRepository.list_records(
            session=session,
            tenant_id=tenant_id,
            status=status,
            limit=limit,
            offset=offset,
        )
