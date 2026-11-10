"""WealthOS Cash Management & Liquidity Domain Models."""

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
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin


class FinancialInstitution(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Directory of banks, depositories, and financial institutions."""

    __tablename__ = "financial_institutions"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    institution_type: Mapped[str] = mapped_column(String(50), default="BANK", nullable=False)
    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    country_code: Mapped[str] = mapped_column(String(3), default="IND", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class FinancialAccount(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """External bank, card, or liquid financial account."""

    __tablename__ = "financial_accounts"
    __table_args__ = (Index("idx_fin_accounts_tenant", "tenant_id"),)

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    institution_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("financial_institutions.id", ondelete="SET NULL"),
        nullable=True,
    )
    account_name: Mapped[str] = mapped_column(String(255), nullable=False)
    account_number_mask: Mapped[str] = mapped_column(String(20), nullable=False)
    account_type: Mapped[str] = mapped_column(String(50), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    current_balance: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    available_balance: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    gl_account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class AccountTransfer(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Owned account-to-account transfer record enforcing transfer neutrality."""

    __tablename__ = "account_transfers"
    __table_args__ = (Index("idx_transfers_tenant", "tenant_id"),)

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("financial_accounts.id", ondelete="RESTRICT"),
        nullable=False,
    )
    destination_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("financial_accounts.id", ondelete="RESTRICT"),
        nullable=False,
    )
    source_transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    destination_transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    transfer_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    exchange_rate: Mapped[Decimal] = mapped_column(
        Numeric(18, 8), default=Decimal("1.00000000"), nullable=False
    )
    fee_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), default="COMPLETED", nullable=False)


class RecurringTransactionRule(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Rule defining recurring income streams or expense obligations."""

    __tablename__ = "recurring_transaction_rules"
    __table_args__ = (Index("idx_recurring_tenant", "tenant_id"),)

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("financial_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    merchant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    expected_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    direction: Mapped[str] = mapped_column(String(10), nullable=False)  # INFLOW / OUTFLOW
    recurrence_interval: Mapped[str] = mapped_column(
        String(20), default="MONTHLY", nullable=False
    )  # DAILY, WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, ANNUAL
    next_due_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class ForecastRun(Base, UUIDPrimaryKeyMixin):
    """Historical record of cash flow projection run."""

    __tablename__ = "forecast_runs"
    __table_args__ = (Index("idx_forecast_runs_tenant", "tenant_id"),)

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    run_name: Mapped[str] = mapped_column(String(255), nullable=False)
    horizon_months: Mapped[int] = mapped_column(Integer, default=36, nullable=False)
    baseline_date: Mapped[date] = mapped_column(Date, nullable=False)
    assumptions: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    projection_data: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )


class FinancialScenario(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """User-controlled what-if financial simulation model."""

    __tablename__ = "financial_scenarios"
    __table_args__ = (Index("idx_scenarios_tenant", "tenant_id"),)

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    scenario_inputs: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    simulation_results: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
