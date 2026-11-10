"""WealthOS Financial Risk Intelligence Domain Models."""

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, UUIDPrimaryKeyMixin


class RiskAssessment(Base, UUIDPrimaryKeyMixin):
    """Snapshot assessment of workspace financial health and aggregate risk ratios."""

    __tablename__ = "risk_assessments"
    __table_args__ = (
        Index("idx_risk_assess_tenant", "tenant_id", "assessment_date"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    assessment_date: Mapped[date] = mapped_column(Date, nullable=False)
    health_score: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("100.00"), nullable=False
    )
    liquidity_ratio: Mapped[Decimal] = mapped_column(
        Numeric(8, 4), default=Decimal("0.0000"), nullable=False
    )
    debt_service_ratio: Mapped[Decimal] = mapped_column(
        Numeric(8, 4), default=Decimal("0.0000"), nullable=False
    )
    emergency_coverage_months: Mapped[Decimal] = mapped_column(
        Numeric(6, 2), default=Decimal("0.00"), nullable=False
    )
    portfolio_concentration_score: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("0.00"), nullable=False
    )
    data_quality_score: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("100.00"), nullable=False
    )
    risk_signals: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, default=list, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )


class RiskAlert(Base, UUIDPrimaryKeyMixin):
    """Actionable, evidence-backed financial risk warning entity."""

    __tablename__ = "risk_alerts"
    __table_args__ = (
        UniqueConstraint("tenant_id", "alert_key", name="uq_risk_alert_key"),
        Index("idx_risk_alerts_tenant", "tenant_id", "status"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    alert_key: Mapped[str] = mapped_column(String(100), nullable=False)
    risk_category: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    evidence: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
