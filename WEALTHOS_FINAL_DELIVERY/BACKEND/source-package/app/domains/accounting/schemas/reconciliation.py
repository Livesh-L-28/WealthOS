"""WealthOS Financial Reconciliation Schemas."""

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.domains.accounting.domain.accounting_rules import ReconciliationStatus
from app.domains.accounting.domain.money import quantize_money, validate_currency_code


class CreateReconciliationRequest(BaseModel):
    """Payload to record an external transaction for ledger reconciliation."""

    account_id: uuid.UUID = Field(..., description="Target internal ledger account ID")
    source_reference: str = Field(
        ..., min_length=1, max_length=100, description="External txn reference or UTR"
    )
    expected_amount: Decimal = Field(..., description="External reported amount")
    currency_code: str = Field(default="INR", min_length=3, max_length=3)

    @field_validator("currency_code")
    @classmethod
    def check_curr(cls, v: str) -> str:
        return validate_currency_code(v)

    @field_validator("expected_amount")
    @classmethod
    def check_amt(cls, v: Decimal) -> Decimal:
        return quantize_money(v)


class ReconcileMatchRequest(BaseModel):
    """Payload to match an external reconciliation record to a posted journal entry."""

    journal_entry_id: uuid.UUID = Field(..., description="Target posted journal entry ID")
    notes: str | None = Field(default=None, max_length=500)


class MarkDiscrepancyRequest(BaseModel):
    """Payload to flag an external reconciliation item as having a discrepancy."""

    discrepancy_reason: str = Field(
        ..., min_length=5, max_length=1000, description="Details of the discrepancy"
    )


class ReconciliationResponse(BaseModel):
    """Serialized reconciliation record."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    source_reference: str
    account_id: uuid.UUID
    journal_entry_id: uuid.UUID | None = None
    expected_amount: Decimal
    posted_amount: Decimal | None = None
    currency_code: str
    status: ReconciliationStatus
    matched_at: datetime | None = None
    matched_by: uuid.UUID | None = None
    discrepancy_reason: str | None = None
    created_at: datetime
    updated_at: datetime
