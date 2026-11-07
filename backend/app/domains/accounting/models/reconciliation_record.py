"""WealthOS Reconciliation Record Model."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    pass


class ReconciliationRecord(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """External transaction reconciliation primitive."""

    __tablename__ = "reconciliation_records"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        doc="Owning tenant organization identifier",
    )
    source_reference: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        doc="External statement, transaction, or UTR reference number",
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        doc="Target internal ledger account",
    )
    journal_entry_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("journal_entries.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        doc="Matched double-entry journal entry",
    )
    expected_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        nullable=False,
        doc="Expected external amount",
    )
    posted_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(18, 4),
        nullable=True,
        doc="Actual amount posted to ledger",
    )
    currency_code: Mapped[str] = mapped_column(
        String(3),
        default="INR",
        nullable=False,
        doc="Denomination currency",
    )
    status: Mapped[str] = mapped_column(
        String(30),
        default="UNMATCHED",
        nullable=False,
        index=True,
        doc="UNMATCHED, MATCHED, PARTIALLY_MATCHED, or DISCREPANCY",
    )
    matched_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Timestamp of match reconciliation",
    )
    matched_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
        doc="User who approved the reconciliation",
    )
    discrepancy_reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        doc="Explanatory note if discrepancy is flagged",
    )
