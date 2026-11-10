"""WealthOS Security Audit Log Domain Models.

SQLAlchemy 2.x declarative models for immutable security event records,
forensic tracing, and authentication audit logs.
"""

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, UUIDPrimaryKeyMixin


class SecurityAuditLog(Base, UUIDPrimaryKeyMixin):
    """Immutable security audit log entry tracking authentication and access events."""

    __tablename__ = "security_audit_logs"

    tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Associated tenant identifier (if event is tenant-scoped)",
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Acting user identifier (if authenticated)",
    )
    event_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        doc="Event classification e.g. login_success, login_failure, password_change",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="success",
        nullable=False,
        index=True,
        doc="Outcome: success, failure, warning",
    )
    ip_address: Mapped[str | None] = mapped_column(
        String(45), nullable=True, doc="Client IPv4 or IPv6 address"
    )
    user_agent: Mapped[str | None] = mapped_column(
        Text, nullable=True, doc="Client User-Agent header"
    )
    correlation_id: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True, doc="Request correlation ID"
    )
    details: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        nullable=False,
        doc="Structured event metadata (never includes secrets/passwords)",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
        doc="Immutable event timestamp (UTC)",
    )
