"""WealthOS Phase 19 Workstream 5: Advanced Application & Infrastructure Security Tests.

Validates security incident declaration, cryptographic evidence preservation,
automated containment orchestration (quarantine, session revocation, key revocation),
and immutable security audit logging.
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.audit.models import SecurityAuditLog
from app.domains.identity.api_keys import ApiKeyService
from app.domains.identity.models import User, UserApiKey, UserSession
from app.domains.security.incident_service import (
    ContainmentAction,
    IncidentSeverity,
    IncidentStatus,
    SecurityIncidentService,
)
from app.domains.tenants.models import Tenant


@pytest.fixture
async def security_incident_context(db_session: AsyncSession):
    """Seed test tenant, user, session, and API key for containment testing."""
    tenant = Tenant(
        id=uuid.uuid4(),
        name="Target Security Tenant",
        slug=f"sec-tenant-{uuid.uuid4().hex[:6]}",
        status="ACTIVE",
    )
    db_session.add(tenant)

    user = User(
        id=uuid.uuid4(),
        email=f"compromised-{uuid.uuid4().hex[:6]}@wealthos.test",
        first_name="Compromised",
        last_name="Account",
        status="active",
    )
    db_session.add(user)
    await db_session.flush()

    # Set tenant context
    await db_session.execute(
        text("SELECT set_config('app.current_tenant_id', :tid, false);"),
        {"tid": str(tenant.id)},
    )

    # Active session
    session = UserSession(
        id=uuid.uuid4(),
        user_id=user.id,
        ip_address="203.0.113.42",
        user_agent="Malicious/Crawler",
        device_fingerprint="test_device_fp",
        is_active=True,
        expires_at=datetime.now(UTC) + timedelta(hours=24),
    )
    db_session.add(session)

    # Active API Key
    api_key_svc = ApiKeyService(db_session)
    key_record, _ = await api_key_svc.create_api_key(
        tenant_id=tenant.id,
        user_id=user.id,
        key_name="Compromised Bot",
        scopes=["ledger:read"],
    )
    await db_session.flush()

    return {
        "tenant_id": tenant.id,
        "user_id": user.id,
        "session_id": session.id,
        "key_id": key_record.id,
    }


@pytest.mark.asyncio
async def test_security_incident_declaration_and_evidence(
    db_session: AsyncSession,
    security_incident_context: dict,
):
    """Verify incident declaration creates cryptographic evidence hash and audit record."""
    tenant_id = security_incident_context["tenant_id"]
    user_id = security_incident_context["user_id"]
    incident_svc = SecurityIncidentService(db_session)

    evidence = {
        "source_ip": "198.51.100.99",
        "attempted_endpoints": ["/api/v1/accounting/transfers", "/api/v1/auth/tokens"],
        "suspicious_user_agent": "SqlMap/1.7.2#dev",
        "attack_vector": "SQL_INJECTION_AND_CREDENTIAL_STUFFING",
    }

    incident = await incident_svc.declare_incident(
        title="Detected Automated Credential Stuffing & Probe",
        severity=IncidentSeverity.CRITICAL,
        threat_category="CREDENTIAL_STUFFING",
        evidence=evidence,
        tenant_id=tenant_id,
        user_id=user_id,
    )

    assert incident.incident_id.startswith("INC-")
    assert incident.severity == IncidentSeverity.CRITICAL
    assert incident.status == IncidentStatus.DETECTED
    assert len(incident.evidence_hash) == 64  # SHA-256

    # Verify audit log was written
    stmt = select(SecurityAuditLog).where(
        SecurityAuditLog.event_type == "security_incident_declared"
    )
    res = await db_session.execute(stmt)
    audit_log = res.scalars().first()
    assert audit_log is not None
    assert audit_log.details["incident_id"] == incident.incident_id


@pytest.mark.asyncio
async def test_security_incident_containment_and_resolution(
    db_session: AsyncSession,
    security_incident_context: dict,
):
    """Verify automated containment actions: tenant quarantine, session revocation, key revocation."""
    tenant_id = security_incident_context["tenant_id"]
    user_id = security_incident_context["user_id"]
    session_id = security_incident_context["session_id"]
    key_id = security_incident_context["key_id"]
    incident_svc = SecurityIncidentService(db_session)

    # 1. Declare
    incident = await incident_svc.declare_incident(
        title="Compromised API Key Detected on Public Pastebin",
        severity=IncidentSeverity.HIGH,
        threat_category="TOKEN_EXFILTRATION",
        evidence={"leak_url": "https://pastebin.com/sample_leak"},
        tenant_id=tenant_id,
        user_id=user_id,
    )

    # 2. Execute containment
    contained_incident = await incident_svc.execute_containment(
        incident_id=incident.incident_id,
        actions=[
            ContainmentAction.QUARANTINE_TENANT,
            ContainmentAction.REVOKE_USER_SESSIONS,
            ContainmentAction.REVOKE_API_KEYS,
        ],
    )
    assert contained_incident.status == IncidentStatus.CONTAINED
    assert len(contained_incident.containment_actions_taken) == 3

    # Verify database state updates
    tenant = await db_session.get(Tenant, tenant_id)
    assert tenant.status == "SUSPENDED"

    session = await db_session.get(UserSession, session_id)
    assert session.is_active is False
    assert session.revoked_at is not None

    key = await db_session.get(UserApiKey, key_id)
    assert key.is_active is False

    # 3. Resolve Incident
    resolved = await incident_svc.resolve_incident(
        incident_id=incident.incident_id,
        post_mortem_summary="Key revoked within 12 seconds of alert. Leaked key had read-only scope, zero financial records altered.",
    )
    assert resolved.status == IncidentStatus.RESOLVED
    assert resolved.resolved_at is not None
    assert "Key revoked within 12 seconds" in resolved.post_mortem
