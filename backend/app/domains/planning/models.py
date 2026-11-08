"""WealthOS Financial Planning & Forecasting Domain Models."""

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
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
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin
# Re-use existing unified models for forecast_runs and financial_scenarios
from app.domains.cash.models import FinancialScenario, ForecastRun


class FinancialGoal(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """User-defined or system-suggested financial objective."""

    __tablename__ = "financial_goals"
    __table_args__ = (
        UniqueConstraint("id", "tenant_id", name="uq_financial_goals_id_tenant"),
        Index("idx_goals_tenant", "tenant_id"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="SAVINGS", nullable=False)
    target_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    current_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    target_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="IN_PROGRESS", nullable=False)
    monthly_contribution: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    inflation_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), default=Decimal("0.0600"), nullable=False
    )
    expected_return_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), default=Decimal("0.1000"), nullable=False
    )
    priority: Mapped[str] = mapped_column(String(20), default="MEDIUM", nullable=False)
    linked_account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="SET NULL"),
        nullable=True,
    )

    contributions: Mapped[list["GoalContribution"]] = relationship(
        "GoalContribution", back_populates="goal", cascade="all, delete-orphan"
    )


class GoalContribution(Base, UUIDPrimaryKeyMixin):
    """Realized or attributed funding event for a financial goal."""

    __tablename__ = "goal_contributions"
    __table_args__ = (
        Index("idx_contributions_goal", "goal_id"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    goal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("financial_goals.id", ondelete="CASCADE"),
        nullable=False,
    )
    transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    contribution_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    goal: Mapped["FinancialGoal"] = relationship("FinancialGoal", back_populates="contributions")


class RetirementProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Retirement planning parameters and target wealth projection."""

    __tablename__ = "retirement_profiles"
    __table_args__ = (
        UniqueConstraint("tenant_id", name="uq_retirement_tenant"),
        Index("idx_retire_tenant", "tenant_id"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    current_age: Mapped[int] = mapped_column(Integer, nullable=False)
    retirement_age: Mapped[int] = mapped_column(Integer, nullable=False)
    life_expectancy: Mapped[int] = mapped_column(Integer, default=85, nullable=False)
    monthly_expenses_current: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    inflation_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), default=Decimal("0.0600"), nullable=False
    )
    pre_retirement_return: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), default=Decimal("0.1000"), nullable=False
    )
    post_retirement_return: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), default=Decimal("0.0700"), nullable=False
    )
    existing_corpus: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    monthly_contribution: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
