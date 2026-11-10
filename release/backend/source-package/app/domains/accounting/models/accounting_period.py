"""WealthOS Accounting Period Model."""

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    pass


class AccountingPeriod(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Fiscal or monthly accounting period controlling posting permissions."""

    __tablename__ = "accounting_periods"
    __table_args__ = (UniqueConstraint("tenant_id", "period_name", name="uq_tenant_period_name"),)

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        doc="Owning tenant workspace identifier",
    )
    period_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        doc="Period identifier (e.g., 'FY2026-Q1', '2026-04')",
    )
    start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        doc="Period start date (inclusive)",
    )
    end_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        doc="Period end date (inclusive)",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="OPEN",
        nullable=False,
        doc="OPEN or CLOSED",
    )
    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Timestamp of period closure",
    )
    closed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
        doc="User who closed this accounting period",
    )
