"""WealthOS Security Audit Service.

Immutable recording and inspection of security, authentication, and authorization events.
"""

import uuid
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.audit.models import SecurityAuditLog

logger = get_logger("wealthos.audit")

# Redacted keys that must never appear in audit details
_SENSITIVE_DETAIL_KEYS = {
    "password",
    "plain_password",
    "current_password",
    "new_password",
    "token",
    "raw_token",
    "secret",
    "secret_key",
    "recovery_codes",
    "code",
}


def _scrub_details(details: dict[str, Any]) -> dict[str, Any]:
    """Ensure sensitive credentials or tokens are never persisted in audit details."""
    cleaned: dict[str, Any] = {}
    for k, v in details.items():
        if k.lower() in _SENSITIVE_DETAIL_KEYS:
            cleaned[k] = "[REDACTED]"
        elif isinstance(v, dict):
            cleaned[k] = _scrub_details(v)
        else:
            cleaned[k] = v
    return cleaned


# Public alias
scrub_sensitive_data = _scrub_details


async def record_security_event(
    session: AsyncSession,
    event_type: str,
    status: str = "success",
    tenant_id: uuid.UUID | None = None,
    user_id: uuid.UUID | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    correlation_id: str | None = None,
    details: dict[str, Any] | None = None,
) -> SecurityAuditLog:
    """Record an immutable security event."""
    safe_details = _scrub_details(details or {})

    audit_entry = SecurityAuditLog(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        user_id=user_id,
        event_type=event_type,
        status=status,
        ip_address=ip_address,
        user_agent=user_agent[:500] if user_agent else None,
        correlation_id=correlation_id,
        details=safe_details,
    )
    session.add(audit_entry)
    # Flushed with transaction
    logger.info(
        f"[AUDIT] event={event_type} status={status} user={user_id} tenant={tenant_id} correlation={correlation_id}"
    )
    return audit_entry


async def query_tenant_audit_logs(
    session: AsyncSession,
    tenant_id: uuid.UUID,
    limit: int = 100,
    offset: int = 0,
    event_type: str | None = None,
) -> list[SecurityAuditLog]:
    """Retrieve security audit logs for a tenant with pagination."""
    stmt = (
        select(SecurityAuditLog)
        .where(SecurityAuditLog.tenant_id == tenant_id)
        .order_by(desc(SecurityAuditLog.created_at))
        .limit(limit)
        .offset(offset)
    )
    if event_type:
        stmt = stmt.where(SecurityAuditLog.event_type == event_type)

    result = await session.execute(stmt)
    return list(result.scalars().all())
