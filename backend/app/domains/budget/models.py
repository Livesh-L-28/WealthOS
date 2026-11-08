"""WealthOS Budget & Expense Intelligence Domain Models."""

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin


class TransactionCategory(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Spending, income, or transfer classification category."""

    __tablename__ = "transaction_categories"
    __table_args__ = (
        UniqueConstraint("tenant_id", "code", name="uq_tenant_category_code"),
        Index("idx_tx_categories_tenant", "tenant_id"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transaction_categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    category_type: Mapped[str] = mapped_column(String(20), default="EXPENSE", nullable=False)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Budget(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Spending plan envelope for a defined temporal window."""

    __tablename__ = "budgets"
    __table_args__ = (
        UniqueConstraint("id", "tenant_id", name="uq_budgets_id_tenant"),
        Index("idx_budgets_tenant", "tenant_id"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    period_type: Mapped[str] = mapped_column(String(20), default="MONTHLY", nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    allocations: Mapped[list["BudgetAllocation"]] = relationship(
        "BudgetAllocation", back_populates="budget", cascade="all, delete-orphan"
    )
    revisions: Mapped[list["BudgetRevision"]] = relationship(
        "BudgetRevision", back_populates="budget", cascade="all, delete-orphan"
    )
    alerts: Mapped[list["BudgetAlert"]] = relationship(
        "BudgetAlert", back_populates="budget", cascade="all, delete-orphan"
    )


class BudgetAllocation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Category-level limit and allocation envelope within a parent budget."""

    __tablename__ = "budget_allocations"
    __table_args__ = (
        UniqueConstraint("budget_id", "category_id", name="uq_budget_category"),
        Index("idx_allocations_budget", "budget_id"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    budget_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("budgets.id", ondelete="CASCADE"),
        nullable=False,
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transaction_categories.id", ondelete="RESTRICT"),
        nullable=False,
    )
    allocated_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    spent_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    rollover_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)

    budget: Mapped["Budget"] = relationship("Budget", back_populates="allocations")
    category: Mapped["TransactionCategory"] = relationship("TransactionCategory")


class BudgetRevision(Base, UUIDPrimaryKeyMixin):
    """Audited change log for budget envelope modifications."""

    __tablename__ = "budget_revisions"
    __table_args__ = (
        UniqueConstraint("budget_id", "revision_number", name="uq_budget_revision"),
        Index("idx_budget_revisions_tenant", "tenant_id"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    budget_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("budgets.id", ondelete="CASCADE"),
        nullable=False,
    )
    revision_number: Mapped[int] = mapped_column(Integer, nullable=False)
    previous_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    revised_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    budget: Mapped["Budget"] = relationship("Budget", back_populates="revisions")


class BudgetAlert(Base, UUIDPrimaryKeyMixin):
    """Triggered notification state when spending crosses pre-configured threshold."""

    __tablename__ = "budget_alerts"
    __table_args__ = (
        UniqueConstraint("budget_id", "allocation_id", "threshold_percent", name="uq_budget_alert_threshold"),
        Index("idx_budget_alerts_tenant", "tenant_id"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    budget_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("budgets.id", ondelete="CASCADE"),
        nullable=False,
    )
    allocation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("budget_allocations.id", ondelete="CASCADE"),
        nullable=True,
    )
    threshold_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    current_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    spent_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    allocated_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    alert_status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    budget: Mapped["Budget"] = relationship("Budget", back_populates="alerts")
    allocation: Mapped["BudgetAllocation | None"] = relationship("BudgetAllocation")
