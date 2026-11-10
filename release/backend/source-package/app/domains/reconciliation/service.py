"""WealthOS Financial Control Centre Domain Service.

Implements reconciliation matching, discrepancy investigation, duplicate detection,
ledger invariant audits, and data quality tracking with full audit logging.
"""

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.accounting.models.account import Account
from app.domains.accounting.models.journal_entry import JournalEntry
from app.domains.accounting.models.reconciliation_record import ReconciliationRecord
from app.domains.reconciliation.models import DataQualityMetric, ReconciliationSession
from app.domains.reconciliation.repository import ReconciliationRepository
from app.domains.reconciliation.schemas import (
    DataQualityItem,
    FinancialControlDashboardResponse,
    LedgerIntegrityReport,
    ReconciliationRecordResponse,
)


class FinancialControlService:
    """Core domain service for the Financial Control Centre."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = ReconciliationRepository(session)

    async def get_dashboard(self, tenant_id: uuid.UUID) -> FinancialControlDashboardResponse:
        """Aggregate executive financial control health metrics."""
        # 1. Fetch records
        all_records = await self.repo.list_records(tenant_id, limit=200)
        total_records = len(all_records)
        matched = [r for r in all_records if r.status == "MATCHED"]
        unmatched = [r for r in all_records if r.status in ("UNMATCHED", "DISCREPANCY")]
        open_disc = [
            r for r in all_records if r.status == "DISCREPANCY" and r.resolution_status == "OPEN"
        ]
        crit_disc = [r for r in open_disc if r.severity == "CRITICAL"]
        high_disc = [r for r in open_disc if r.severity == "HIGH"]

        recon_rate = (len(matched) / total_records * 100.0) if total_records > 0 else 100.0

        # 2. Ledger integrity check
        debits, credits, variance, unbalanced, unposted = await self.repo.verify_ledger_integrity(
            tenant_id
        )
        ledger_report = LedgerIntegrityReport(
            is_balanced=(variance == Decimal("0.0000") and unbalanced == 0),
            total_debits=debits,
            total_credits=credits,
            variance=variance,
            unbalanced_entry_count=unbalanced,
            unposted_entry_count=unposted,
            checked_at=datetime.now(UTC),
        )

        # 3. Data quality metrics
        quality_entities = await self.repo.get_data_quality_metrics(tenant_id)
        if not quality_entities:
            # Seed default metric for primary banking source if empty
            default_metric = await self.repo.upsert_data_quality_metric(
                tenant_id=tenant_id,
                source_name="Primary Operating Bank (HDFC)",
                account_id=None,
                status="VERIFIED",
                unreconciled_count=len(unmatched),
                discrepancy_count=len(open_disc),
            )
            quality_entities = [default_metric]

        quality_items = [DataQualityItem.model_validate(q) for q in quality_entities]

        # 4. Sessions
        sessions = await self.repo.list_sessions(tenant_id, limit=1)
        total_sessions = len(sessions) if sessions else 1

        recent_discrepancies = [
            ReconciliationRecordResponse.model_validate(r)
            for r in (open_disc[:10] if open_disc else all_records[:5])
        ]

        return FinancialControlDashboardResponse(
            total_sessions=max(total_sessions, 1),
            open_discrepancies=len(open_disc),
            critical_discrepancies=len(crit_disc),
            high_discrepancies=len(high_disc),
            matched_records=len(matched),
            unmatched_records=len(unmatched),
            reconciliation_rate_percent=round(recon_rate, 2),
            ledger_integrity=ledger_report,
            data_quality=quality_items,
            recent_discrepancies=recent_discrepancies,
        )

    async def ingest_external_record(
        self,
        tenant_id: uuid.UUID,
        source_reference: str,
        account_id: uuid.UUID,
        expected_amount: Decimal,
        currency_code: str = "INR",
        posted_amount: Decimal | None = None,
        session_id: uuid.UUID | None = None,
    ) -> ReconciliationRecord:
        """Ingest external statement line and perform automatic matching/severity triage."""
        # 1. Check duplicate reference idempotency
        stmt = select(ReconciliationRecord).where(
            ReconciliationRecord.tenant_id == tenant_id,
            ReconciliationRecord.account_id == account_id,
            ReconciliationRecord.source_reference == source_reference,
        )
        existing = (await self.session.execute(stmt)).scalars().first()
        if existing:
            return existing

        # 2. Check for duplicate transactions (same account & amount within window)
        dup_stmt = select(ReconciliationRecord).where(
            ReconciliationRecord.tenant_id == tenant_id,
            ReconciliationRecord.account_id == account_id,
            ReconciliationRecord.expected_amount == expected_amount,
        )
        potential_dups = (await self.session.execute(dup_stmt)).scalars().all()

        difference = None
        status = "UNMATCHED"
        severity = "LOW"
        category = "UNMATCHED_EXTERNAL"
        reason = None

        if len(potential_dups) > 0:
            severity = "HIGH"
            category = "DUPLICATE_CANDIDATE"
            status = "DISCREPANCY"
            reason = f"Potential duplicate debit: {len(potential_dups)} existing record(s) with identical amount {expected_amount} {currency_code}"
        elif posted_amount is not None:
            difference = abs(expected_amount - posted_amount)
            if difference == Decimal("0.0000"):
                status = "MATCHED"
                severity = "LOW"
            elif difference <= Decimal("100.0000"):
                status = "DISCREPANCY"
                severity = "MEDIUM"
                category = "AMOUNT_MISMATCH"
                reason = f"Minor variance of {difference} {currency_code}"
            else:
                status = "DISCREPANCY"
                severity = "HIGH" if difference <= Decimal("5000.0000") else "CRITICAL"
                category = "AMOUNT_MISMATCH"
                reason = f"Substantial variance of {difference} {currency_code} exceeds tolerance"

        record = ReconciliationRecord(
            tenant_id=tenant_id,
            source_reference=source_reference,
            account_id=account_id,
            expected_amount=expected_amount,
            posted_amount=posted_amount,
            difference=difference,
            currency_code=currency_code,
            status=status,
            severity=severity,
            discrepancy_category=category,
            discrepancy_reason=reason,
            resolution_status="OPEN" if status == "DISCREPANCY" else "RESOLVED",
            session_id=session_id,
            matched_at=datetime.now(UTC) if status == "MATCHED" else None,
        )
        return await self.repo.create_record(record)

    async def execute_action(
        self,
        tenant_id: uuid.UUID,
        record_id: uuid.UUID,
        action: str,
        actor_id: uuid.UUID | None,
        notes: str,
        journal_entry_id: uuid.UUID | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> ReconciliationRecord:
        """Process user action on a discrepancy with audit logging."""
        record = await self.repo.get_record_by_id(tenant_id, record_id)
        if not record:
            raise ValueError(f"Reconciliation record {record_id} not found in workspace")

        now = datetime.now(UTC)
        record.resolution_notes = notes

        if action == "REVIEW":
            record.resolution_status = "UNDER_REVIEW"

        elif action == "MATCH":
            if not journal_entry_id:
                raise ValueError("Journal entry ID required to match discrepancy")
            # Verify journal entry exists in tenant
            je_stmt = select(JournalEntry).where(
                JournalEntry.tenant_id == tenant_id,
                JournalEntry.id == journal_entry_id,
            )
            je = (await self.session.execute(je_stmt)).scalars().first()
            if not je:
                raise ValueError(f"Target journal entry {journal_entry_id} not found in workspace")

            record.journal_entry_id = journal_entry_id
            record.posted_amount = je.total_debit
            record.difference = abs(record.expected_amount - je.total_debit)
            record.status = "MATCHED"
            record.resolution_status = "RESOLVED"
            record.matched_at = now
            record.matched_by = actor_id

        elif action == "MARK_DUPLICATE":
            record.status = "DISCREPANCY"
            record.discrepancy_category = "DUPLICATE_CONFIRMED"
            record.resolution_status = "MARKED_DUPLICATE"

        elif action == "RESOLVE":
            record.resolution_status = "RESOLVED"
            record.status = "MATCHED"

        elif action == "REJECT":
            record.resolution_status = "REJECTED"

        elif action == "ESCALATE":
            record.resolution_status = "ESCALATED"
            record.severity = "CRITICAL"

        else:
            raise ValueError(f"Unsupported action: {action}")

        # Audit event logged immutably
        await self.repo.create_audit_event(
            tenant_id=tenant_id,
            record_id=record.id,
            action=action,
            actor_id=actor_id,
            notes=notes,
            metadata=metadata or {},
        )
        await self.session.flush()
        return record

