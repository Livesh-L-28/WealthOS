"""WealthOS Liability & Debt Management Domain Models."""

import uuid
from datetime import date, datetime
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


class Liability(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Personal debt obligation, loan, or credit facility entity."""

    __tablename__ = "liabilities"
    __table_args__ = (
        Index("idx_liabilities_tenant", "tenant_id"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    liability_type: Mapped[str] = mapped_column(String(50), nullable=False)
    lender_name: Mapped[str] = mapped_column(String(255), nullable=False)
    initial_principal: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    current_principal: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    interest_rate: Mapped[Decimal] = mapped_column(Numeric(7, 4), nullable=False)
    tenure_months: Mapped[int] = mapped_column(Integer, nullable=False)
    emi_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    maturity_date: Mapped[date] = mapped_column(Date, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    gl_account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    schedules: Mapped[list["LoanPaymentSchedule"]] = relationship(
        "LoanPaymentSchedule",
        back_populates="liability",
        cascade="all, delete-orphan",
        order_by="LoanPaymentSchedule.installment_number",
    )
    statements: Mapped[list["CreditCardStatement"]] = relationship(
        "CreditCardStatement",
        back_populates="liability",
        cascade="all, delete-orphan",
        order_by="CreditCardStatement.statement_date.desc()",
    )


class LoanPaymentSchedule(Base, UUIDPrimaryKeyMixin):
    """Amortization payment schedule installment entry."""

    __tablename__ = "loan_payment_schedules"
    __table_args__ = (
        UniqueConstraint("liability_id", "installment_number", name="uq_liability_installment"),
        Index("idx_loan_sched_tenant", "tenant_id", "liability_id"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    liability_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("liabilities.id", ondelete="CASCADE"),
        nullable=False,
    )
    installment_number: Mapped[int] = mapped_column(Integer, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    expected_payment: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    principal_component: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    interest_component: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    fee_component: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    remaining_principal: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    payment_status: Mapped[str] = mapped_column(String(30), default="UPCOMING", nullable=False)
    paid_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    actual_paid_amount: Mapped[Decimal | None] = mapped_column(Numeric(18, 4), nullable=True)
    transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    liability: Mapped["Liability"] = relationship("Liability", back_populates="schedules")


class CreditCardStatement(Base, UUIDPrimaryKeyMixin):
    """Credit card billing statement and utilization record."""

    __tablename__ = "credit_card_statements"
    __table_args__ = (
        Index("idx_card_stmt_tenant", "tenant_id", "liability_id"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    liability_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("liabilities.id", ondelete="CASCADE"),
        nullable=False,
    )
    statement_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    statement_balance: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    minimum_due: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    credit_limit: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    available_credit: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    finance_charges: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=Decimal("0.0000"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="UNPAID", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    liability: Mapped["Liability"] = relationship("Liability", back_populates="statements")
