"""WealthOS Financial Control Centre & Reconciliation Schemas."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ReconciliationRecordBase(BaseModel):
    """Base schema for reconciliation record attributes."""

    source_reference: str = Field(..., max_length=100)
    account_id: uuid.UUID
    expected_amount: Decimal = Field(..., max_digits=18, decimal_places=4)
    posted_amount: Decimal | None = Field(None, max_digits=18, decimal_places=4)
    currency_code: str = Field(default="INR", max_length=3)
    status: str = Field(default="UNMATCHED")
    severity: str = Field(default="MEDIUM")
    discrepancy_category: str = Field(default="AMOUNT_MISMATCH")
    discrepancy_reason: str | None = None
    resolution_status: str = Field(default="OPEN")


class ReconciliationRecordCreate(ReconciliationRecordBase):
    """Payload for creating an external transaction reconciliation record."""

    session_id: uuid.UUID | None = None


class ReconciliationRecordResponse(ReconciliationRecordBase):
    """Serialized reconciliation record response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    session_id: uuid.UUID | None = None
    journal_entry_id: uuid.UUID | None = None
    difference: Decimal | None = None
    resolution_notes: str | None = None
    matched_at: datetime | None = None
    matched_by: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime


class DiscrepancyActionRequest(BaseModel):
    """Payload for resolving or acting on a reconciliation discrepancy."""

    action: str = Field(
        ...,
        pattern="^(REVIEW|MATCH|MARK_DUPLICATE|RESOLVE|REJECT|ESCALATE)$",
        description="Action to take on discrepancy",
    )
    notes: str = Field(..., min_length=3, max_length=1000, description="Audit justification note")
    journal_entry_id: uuid.UUID | None = Field(
        None, description="Optional target journal entry to link when MATCHING"
    )
    metadata: dict[str, Any] = Field(default_factory=dict)


class ReconciliationSessionResponse(BaseModel):
    """Serialized summary of a reconciliation session."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    document_id: uuid.UUID | None = None
    session_date: datetime
    total_records: int
    matched_records: int
    discrepancy_count: int
    status: str
    created_at: datetime


class LedgerIntegrityReport(BaseModel):
    """Real-time General Ledger balance and invariant verification."""

    is_balanced: bool
    total_debits: Decimal
    total_credits: Decimal
    variance: Decimal
    unbalanced_entry_count: int
    unposted_entry_count: int
    checked_at: datetime


class DataQualityItem(BaseModel):
    """Data freshness and synchronization health status per account/source."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    source_name: str
    account_id: uuid.UUID | None = None
    status: str
    last_sync_at: datetime
    unreconciled_count: int
    discrepancy_count: int
    freshness_seconds: int


class FinancialControlDashboardResponse(BaseModel):
    """Consolidated Financial Control Centre executive metrics."""

    total_sessions: int
    open_discrepancies: int
    critical_discrepancies: int
    high_discrepancies: int
    matched_records: int
    unmatched_records: int
    reconciliation_rate_percent: float
    ledger_integrity: LedgerIntegrityReport
    data_quality: list[DataQualityItem]
    recent_discrepancies: list[ReconciliationRecordResponse]

