"""WealthOS Double-Entry Journal Entry Header Model."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.domains.accounting.models.journal_line import JournalLine


class JournalEntry(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """General ledger double-entry journal header."""

    __tablename__ = "journal_entries"
    __table_args__ = (UniqueConstraint("tenant_id", "entry_number", name="uq_tenant_entry_number"),)

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        doc="Owning tenant organization identifier",
    )
    entry_number: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        doc="Sequential or formatted journal voucher number",
    )
    entry_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
        doc="Effective financial transaction date",
    )
    posting_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Timestamp when status transitioned to POSTED",
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="Explanatory narration or memo",
    )
    reference: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        doc="External invoice, receipt, check, or contract reference",
    )
    source_type: Mapped[str] = mapped_column(
        String(50),
        default="MANUAL",
        nullable=False,
        doc="MANUAL, REVERSAL, ADJUSTMENT, SYSTEM, or IMPORT",
    )
    source_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        doc="External or upstream system record ID",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="DRAFT",
        nullable=False,
        index=True,
        doc="DRAFT, POSTED, or REVERSED",
    )
    functional_currency: Mapped[str] = mapped_column(
        String(3),
        default="INR",
        nullable=False,
        doc="Tenant functional currency for balancing (e.g. INR)",
    )
    total_debit: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        default=Decimal("0.0000"),
        nullable=False,
        doc="Sum of functional debits",
    )
    total_credit: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        default=Decimal("0.0000"),
        nullable=False,
        doc="Sum of functional credits",
    )
    idempotency_key: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        doc="Durable client-supplied idempotency key",
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
        doc="User who created the draft",
    )
    posted_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
        doc="User who posted the journal entry",
    )
    posted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Timestamp of posting execution",
    )
    reversal_of_entry_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("journal_entries.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        doc="ID of original entry if this is a reversal",
    )
    reversed_by_entry_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("journal_entries.id", ondelete="RESTRICT"),
        nullable=True,
        doc="ID of reversal entry if this entry has been reversed",
    )

    # Relationships
    lines: Mapped[list["JournalLine"]] = relationship(
        "JournalLine",
        back_populates="journal_entry",
        cascade="all, delete-orphan",
        order_by="JournalLine.line_number",
        lazy="selectin",
    )
    reversal_entry: Mapped["JournalEntry | None"] = relationship(
        "JournalEntry",
        foreign_keys=[reversed_by_entry_id],
        remote_side="JournalEntry.id",
        post_update=True,
    )
