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
_EXACT_SENSITIVE_KEYS = {
    "password",
    "plain_password",
    "current_password",
    "new_password",
    "confirm_password",
    "token",
    "raw_token",
    "access_token",
    "refresh_token",
    "bearer_token",
    "auth_token",
    "id_token",
    "secret",
    "secret_key",
    "client_secret",
    "master_key",
    "encryption_key",
    "private_key",
    "api_key",
    "apikey",
    "recovery_code",
    "recovery_codes",
    "code",
    "totp_secret",
    "mfa_secret",
    "authorization",
    "cookie",
    "set-cookie",
    "session_token",
}

_SENSITIVE_PATTERNS = (
    "password",
    "secret",
    "token",
    "api_key",
    "apikey",
    "private_key",
    "recovery_code",
)


def _is_sensitive_key(key: str) -> bool:
    clean_k = key.strip().lower()
    if clean_k in _EXACT_SENSITIVE_KEYS:
        return True
    return any(pattern in clean_k for pattern in _SENSITIVE_PATTERNS)


def _scrub_value(val: Any) -> Any:
    if isinstance(val, dict):
        return {
            k: ("[REDACTED]" if _is_sensitive_key(k) else _scrub_value(v)) for k, v in val.items()
        }
    elif isinstance(val, (list, tuple)):
        return [_scrub_value(item) for item in val]
    elif isinstance(val, set):
        return {_scrub_value(item) for item in val}
    return val


def _scrub_details(details: dict[str, Any]) -> dict[str, Any]:
    """Ensure sensitive credentials, tokens, and secrets are never persisted in audit details.

    Recursively scrubs nested dictionaries, lists of dictionaries, and sensitive keys.
    """
    return _scrub_value(details)


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
