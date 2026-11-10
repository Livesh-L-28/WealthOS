"""WealthOS India Tax Readiness Domain Models."""

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin


class TaxProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Taxpayer profile and election configuration per financial year."""

    __tablename__ = "tax_profiles"
    __table_args__ = (
        UniqueConstraint("tenant_id", "financial_year", name="uq_tax_profile_fy"),
        Index("idx_tax_profiles_tenant", "tenant_id"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    financial_year: Mapped[str] = mapped_column(String(10), nullable=False)
    assessment_year: Mapped[str] = mapped_column(String(10), nullable=False)
    tax_regime: Mapped[str] = mapped_column(String(20), default="NEW", nullable=False)
    taxpayer_category: Mapped[str] = mapped_column(
        String(30), default="INDIVIDUAL", nullable=False
    )
    residential_status: Mapped[str] = mapped_column(
        String(30), default="RESIDENT", nullable=False
    )

    computations: Mapped[list["TaxComputation"]] = relationship(
        "TaxComputation", back_populates="profile", cascade="all, delete-orphan"
    )


class TaxComputation(Base, UUIDPrimaryKeyMixin):
    """Audit-trailed tax estimation computation snapshot."""

    __tablename__ = "tax_computations"
    __table_args__ = (
        Index("idx_tax_comp_tenant", "tenant_id", "profile_id"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tax_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    financial_year: Mapped[str] = mapped_column(String(10), nullable=False)
    rule_version: Mapped[str] = mapped_column(String(20), default="2026.1", nullable=False)
    gross_total_income: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    total_deductions: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    taxable_income: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    tax_on_income: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    rebate_87a: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    surcharge: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    cess: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    total_tax_liability: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    tds_credits: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    net_tax_payable: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0.0000"), nullable=False
    )
    computation_breakdown: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), default="PROVISIONAL", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    profile: Mapped["TaxProfile"] = relationship("TaxProfile", back_populates="computations")
