"""WealthOS Universal Financial Document Intelligence Domain Models."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    BigInteger,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin


class FinancialDocument(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Uploaded financial statement, invoice, or receipt entity."""

    __tablename__ = "financial_documents"
    __table_args__ = (
        Index("idx_findocs_tenant", "tenant_id"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    document_type: Mapped[str] = mapped_column(String(50), default="STATEMENT", nullable=False)
    processing_status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)
    ocr_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    extracted_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    extractions: Mapped[list["DocumentExtraction"]] = relationship(
        "DocumentExtraction",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="DocumentExtraction.created_at.desc()",
    )
    approval_events: Mapped[list["DocumentApprovalEvent"]] = relationship(
        "DocumentApprovalEvent",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="DocumentApprovalEvent.created_at.asc()",
    )


class DocumentExtraction(Base, UUIDPrimaryKeyMixin):
    """Structured extraction payload with validation and approval status."""

    __tablename__ = "document_extractions"
    __table_args__ = (
        Index("idx_doc_extract_tenant", "tenant_id", "document_id"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("financial_documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    schema_version: Mapped[str] = mapped_column(String(20), default="v1", nullable=False)
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    reporting_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    reporting_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    confidence_score: Mapped[Decimal] = mapped_column(Numeric(5, 4), default=Decimal("1.0000"), nullable=False)
    validation_status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)
    approval_status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)
    extracted_payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    validation_errors: Mapped[list[Any]] = mapped_column(JSONB, default=list, nullable=False)
    provenance_metadata: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    document: Mapped["FinancialDocument"] = relationship("FinancialDocument", back_populates="extractions")
    approval_events: Mapped[list["DocumentApprovalEvent"]] = relationship(
        "DocumentApprovalEvent",
        back_populates="extraction",
        cascade="all, delete-orphan",
    )


class DocumentApprovalEvent(Base, UUIDPrimaryKeyMixin):
    """Audit event tracking human review, approval, rejection, or ledger posting."""

    __tablename__ = "document_approval_events"
    __table_args__ = (
        Index("idx_doc_approvals_tenant", "tenant_id", "document_id"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("financial_documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    extraction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("document_extractions.id", ondelete="CASCADE"),
        nullable=False,
    )
    action: Mapped[str] = mapped_column(String(30), nullable=False)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    audit_metadata: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    document: Mapped["FinancialDocument"] = relationship("FinancialDocument", back_populates="approval_events")
    extraction: Mapped["DocumentExtraction"] = relationship("DocumentExtraction", back_populates="approval_events")

