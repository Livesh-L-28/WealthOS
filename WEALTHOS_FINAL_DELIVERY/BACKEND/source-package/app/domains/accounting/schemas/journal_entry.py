"""WealthOS Double-Entry Journal Entry Schemas."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.domains.accounting.domain.money import (
    quantize_money,
    quantize_rate,
    validate_currency_code,
)


class CreateJournalLineRequest(BaseModel):
    """Line-item posting within a journal entry."""

    account_id: uuid.UUID = Field(..., description="Target account ID")
    debit_amount: Decimal = Field(
        default=Decimal("0.0000"), ge=0, description="Nominal debit amount"
    )
    credit_amount: Decimal = Field(
        default=Decimal("0.0000"), ge=0, description="Nominal credit amount"
    )
    transaction_currency: str = Field(default="INR", min_length=3, max_length=3)
    transaction_amount: Decimal | None = Field(default=None, ge=0)
    exchange_rate: Decimal = Field(default=Decimal("1.00000000"), gt=0)
    description: str | None = Field(default=None, max_length=500)

    @field_validator("transaction_currency")
    @classmethod
    def check_curr(cls, v: str) -> str:
        return validate_currency_code(v)

    @field_validator("debit_amount", "credit_amount")
    @classmethod
    def check_money(cls, v: Decimal) -> Decimal:
        return quantize_money(v)

    @field_validator("exchange_rate")
    @classmethod
    def check_rate(cls, v: Decimal) -> Decimal:
        return quantize_rate(v)


class CreateJournalEntryRequest(BaseModel):
    """Payload to create or draft a journal entry."""

    entry_date: date = Field(..., description="Transaction effective date")
    description: str = Field(
        ..., min_length=1, max_length=1000, description="Journal description or narration"
    )
    reference: str | None = Field(default=None, max_length=100)
    source_type: str = Field(default="MANUAL", max_length=50)
    source_id: str | None = Field(default=None, max_length=100)
    functional_currency: str = Field(default="INR", min_length=3, max_length=3)
    idempotency_key: str | None = Field(default=None, max_length=100)
    lines: list[CreateJournalLineRequest] = Field(
        ..., min_length=2, description="At least two lines required"
    )

    @field_validator("functional_currency")
    @classmethod
    def check_func_curr(cls, v: str) -> str:
        return validate_currency_code(v)


class PostJournalRequest(BaseModel):
    """Payload to post a draft journal entry."""

    idempotency_key: str | None = Field(default=None, max_length=100)


class ReverseJournalRequest(BaseModel):
    """Payload to reverse a posted journal entry."""

    reason: str = Field(..., min_length=1, max_length=500, description="Reason for reversal")
    reversal_date: date | None = Field(
        default=None, description="Optional date for reversal, defaults to entry_date"
    )
    idempotency_key: str | None = Field(default=None, max_length=100)


class JournalLineResponse(BaseModel):
    """Serialized journal line."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    journal_entry_id: uuid.UUID
    account_id: uuid.UUID
    line_number: int
    description: str | None = None
    debit_amount: Decimal
    credit_amount: Decimal
    transaction_currency: str
    transaction_amount: Decimal
    exchange_rate: Decimal
    functional_debit_amount: Decimal
    functional_credit_amount: Decimal
    created_at: datetime


class JournalEntryResponse(BaseModel):
    """Serialized journal entry summary."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    entry_number: str
    entry_date: date
    posting_date: datetime | None = None
    description: str
    reference: str | None = None
    source_type: str
    source_id: str | None = None
    status: str
    functional_currency: str
    total_debit: Decimal
    total_credit: Decimal
    idempotency_key: str | None = None
    created_by: uuid.UUID | None = None
    posted_by: uuid.UUID | None = None
    posted_at: datetime | None = None
    reversal_of_entry_id: uuid.UUID | None = None
    reversed_by_entry_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime


class JournalEntryDetailResponse(JournalEntryResponse):
    """Full journal entry detail with nested lines."""

    lines: list[JournalLineResponse] = []
