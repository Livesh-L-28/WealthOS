"""WealthOS Accounting Period Schemas."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domains.accounting.domain.accounting_rules import PeriodStatus


class CreatePeriodRequest(BaseModel):
    """Payload to open a new accounting period."""

    period_name: str = Field(
        ..., min_length=1, max_length=100, description="Name e.g. 'FY2024-Q1' or '2025-01'"
    )
    start_date: date = Field(..., description="Start of accounting period")
    end_date: date = Field(..., description="End of accounting period (inclusive)")

    @model_validator(mode="after")
    def validate_dates(self) -> "CreatePeriodRequest":
        if self.start_date > self.end_date:
            raise ValueError(
                f"start_date ({self.start_date}) cannot be after end_date ({self.end_date})"
            )
        return self


class ClosePeriodRequest(BaseModel):
    """Payload to close an accounting period."""

    reason: str | None = Field(
        default=None, max_length=500, description="Optional closure justification"
    )


class ReopenPeriodRequest(BaseModel):
    """Payload to reopen a closed accounting period (admin only)."""

    reason: str = Field(
        ...,
        min_length=5,
        max_length=500,
        description="Mandatory audit justification to reopen period",
    )


class PeriodResponse(BaseModel):
    """Serialized accounting period model."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    period_name: str
    start_date: date
    end_date: date
    status: PeriodStatus
    closed_at: datetime | None = None
    closed_by: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime
