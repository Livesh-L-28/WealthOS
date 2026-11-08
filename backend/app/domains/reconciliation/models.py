"""WealthOS Financial Control Centre & Reconciliation Domain Models."""

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.domains.accounting.models.reconciliation_record import ReconciliationRecord


class ReconciliationSession(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Consolidated reconciliation session aggregating multiple records."""

    __tablename__ = "reconciliation_sessions"
    __table_args__ = (Index("idx_recon_sessions_tenant", "tenant_id"),)

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("financial_documents.id", ondelete="SET NULL"),
        nullable=True,
    )
    session_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    total_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    matched_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    discrepancy_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        default="COMPLETED",
        nullable=False,
    )


class ReconciliationAuditEvent(Base, UUIDPrimaryKeyMixin):
    """Immutable audit trail for reconciliation discrepancy actions."""

    __tablename__ = "reconciliation_audit_events"
    __table_args__ = (
        Index("idx_recon_audit_tenant", "tenant_id"),
        Index("idx_recon_audit_record", "reconciliation_record_id"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    reconciliation_record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("reconciliation_records.id", ondelete="CASCADE"),
        nullable=False,
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_payload: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, default=dict, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )


class DataQualityMetric(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Data freshness and synchronization health metric per source/account."""

    __tablename__ = "data_quality_metrics"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "source_name", "account_id", name="uq_data_quality_tenant_source_acct"
        ),
        Index("idx_data_quality_tenant", "tenant_id"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=True,
    )
    source_name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        default="VERIFIED",
        nullable=False,
    )
    last_sync_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    unreconciled_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    discrepancy_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    freshness_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
