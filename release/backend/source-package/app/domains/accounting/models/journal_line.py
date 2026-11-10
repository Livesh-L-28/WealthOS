"""WealthOS Double-Entry Journal Line Model."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.domains.accounting.models.account import Account
    from app.domains.accounting.models.journal_entry import JournalEntry


class JournalLine(Base, UUIDPrimaryKeyMixin):
    """Individual debit or credit posting in a journal entry."""

    __tablename__ = "journal_lines"
    __table_args__ = (
        UniqueConstraint("journal_entry_id", "line_number", name="uq_journal_line_number"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        doc="Owning tenant organization identifier",
    )
    journal_entry_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("journal_entries.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        doc="Parent journal entry identifier",
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        doc="Target account in chart of accounts",
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        doc="Line-item memo or description",
    )
    line_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Sequential line position in journal entry (1-based)",
    )
    debit_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        default=Decimal("0.0000"),
        nullable=False,
        doc="Nominal transaction debit amount",
    )
    credit_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        default=Decimal("0.0000"),
        nullable=False,
        doc="Nominal transaction credit amount",
    )
    transaction_currency: Mapped[str] = mapped_column(
        String(3),
        default="INR",
        nullable=False,
        doc="Currency of original transaction",
    )
    transaction_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        default=Decimal("0.0000"),
        nullable=False,
        doc="Total transaction amount in transaction currency",
    )
    exchange_rate: Mapped[Decimal] = mapped_column(
        Numeric(18, 8),
        default=Decimal("1.00000000"),
        nullable=False,
        doc="Conversion multiplier to tenant functional currency",
    )
    functional_debit_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        default=Decimal("0.0000"),
        nullable=False,
        doc="Converted debit in functional currency",
    )
    functional_credit_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        default=Decimal("0.0000"),
        nullable=False,
        doc="Converted credit in functional currency",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(),
        nullable=False,
        doc="Timestamp of creation (UTC)",
    )

    # Relationships
    journal_entry: Mapped["JournalEntry"] = relationship(
        "JournalEntry",
        back_populates="lines",
    )
    account: Mapped["Account"] = relationship(
        "Account",
        back_populates="journal_lines",
    )
