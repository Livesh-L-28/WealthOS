"""WealthOS Accounting Idempotency Record Model."""

import uuid
from typing import Any

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AccountingIdempotencyRecord(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Durable idempotency tracking record for financial posting operations."""

    __tablename__ = "accounting_idempotency_records"
    __table_args__ = (
        UniqueConstraint("tenant_id", "idempotency_key", name="uq_tenant_idempotency_key"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        doc="Owning tenant organization identifier",
    )
    idempotency_key: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        doc="Client-provided idempotency key",
    )
    request_fingerprint: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        doc="SHA-256 hash of canonical request payload",
    )
    operation_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        doc="Operation identifier (e.g. 'JOURNAL_POST', 'JOURNAL_REVERSE')",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="PENDING",
        nullable=False,
        doc="PENDING, COMMITTED, or FAILED",
    )
    journal_entry_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("journal_entries.id", ondelete="RESTRICT"),
        nullable=True,
        doc="Created or committed journal entry ID",
    )
    response_payload: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        doc="Cached serializable response envelope for immediate replay",
    )
