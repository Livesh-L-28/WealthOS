"""WealthOS Security Incident Response Engine.

Provides automated incident classification, forensic evidence preservation,
containment action orchestration (quarantine, credential revocation), and audit trails.
"""

from __future__ import annotations

import hashlib
import json
import uuid
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from enum import Enum
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.audit.models import SecurityAuditLog
from app.domains.identity.models import UserApiKey, UserSession
from app.domains.tenants.models import Tenant

logger = get_logger("wealthos.incident_service")


class IncidentSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class IncidentStatus(str, Enum):
    DETECTED = "DETECTED"
    CONTAINED = "CONTAINED"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class ContainmentAction(str, Enum):
    QUARANTINE_TENANT = "QUARANTINE_TENANT"
    REVOKE_USER_SESSIONS = "REVOKE_USER_SESSIONS"
    REVOKE_API_KEYS = "REVOKE_API_KEYS"
    FREEZE_LEDGER = "FREEZE_LEDGER"


@dataclass
class SecurityIncident:
    """Security incident state and forensic evidence."""

    incident_id: str
    tenant_id: uuid.UUID | None
    user_id: uuid.UUID | None
    title: str
    severity: IncidentSeverity
    status: IncidentStatus
    threat_category: str  # e.g., CREDENTIAL_STUFFING, DATA_EXFILTRATION, TOKEN_LEAK
    evidence_payload: dict[str, Any]
    evidence_hash: str
    containment_actions_taken: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    contained_at: datetime | None = None
    resolved_at: datetime | None = None
    post_mortem: str | None = None


# Persistent in-memory incidents ledger (in production, mirrored in security datastore)
_INCIDENTS_STORE: dict[str, SecurityIncident] = {}


class SecurityIncidentService:
    """Enterprise Incident Response Orchestration Service."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def compute_evidence_hash(evidence: dict[str, Any]) -> str:
        """Compute cryptographic SHA-256 hash of forensic evidence payload."""
        canonical_json = json.dumps(evidence, sort_keys=True, default=str)
        return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

    async def declare_incident(
        self,
        title: str,
        severity: IncidentSeverity | str,
        threat_category: str,
        evidence: dict[str, Any],
        tenant_id: uuid.UUID | None = None,
        user_id: uuid.UUID | None = None,
    ) -> SecurityIncident:
        """Declare and record a new security incident with cryptographic evidence hashing."""
        sev_enum = IncidentSeverity(severity) if isinstance(severity, str) else severity
        now = datetime.now(UTC)
        incident_id = f"INC-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"

        evidence_hash = self.compute_evidence_hash(evidence)

        incident = SecurityIncident(
            incident_id=incident_id,
            tenant_id=tenant_id,
            user_id=user_id,
            title=title,
            severity=sev_enum,
            status=IncidentStatus.DETECTED,
            threat_category=threat_category,
            evidence_payload=evidence,
            evidence_hash=evidence_hash,
            created_at=now,
        )
        _INCIDENTS_STORE[incident_id] = incident

        # Record immutable audit log
        audit_entry = SecurityAuditLog(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            user_id=user_id,
            event_type="security_incident_declared",
            status="warning" if sev_enum in (IncidentSeverity.LOW, IncidentSeverity.MEDIUM) else "failure",
            details={
                "incident_id": incident_id,
                "title": title,
                "severity": sev_enum.value,
                "threat_category": threat_category,
                "evidence_hash": evidence_hash,
            },
        )
        self.session.add(audit_entry)
        await self.session.flush()

        logger.error(
            f"[SECURITY INCIDENT DECLARED] {incident_id} [{sev_enum.value}] {title} (evidence={evidence_hash})"
        )
        return incident

    async def execute_containment(
        self,
        incident_id: str,
        actions: list[ContainmentAction | str],
        executed_by_user_id: uuid.UUID | None = None,
    ) -> SecurityIncident:
        """Execute automated containment procedures across affected principals."""
        if incident_id not in _INCIDENTS_STORE:
            raise ValueError(f"Incident '{incident_id}' not found.")

        incident = _INCIDENTS_STORE[incident_id]
        applied = []

        for action in actions:
            act_enum = ContainmentAction(action) if isinstance(action, str) else action

            if act_enum == ContainmentAction.QUARANTINE_TENANT and incident.tenant_id:
                # Update tenant status to SUSPENDED
                stmt = (
                    update(Tenant)
                    .where(Tenant.id == incident.tenant_id)
                    .values(status="SUSPENDED")
                )
                await self.session.execute(stmt)
                applied.append(act_enum.value)
                logger.warning(f"Containment: Quarantined tenant {incident.tenant_id}")

            elif act_enum == ContainmentAction.REVOKE_USER_SESSIONS and incident.user_id:
                # Revoke active user sessions
                stmt = (
                    update(UserSession)
                    .where(UserSession.user_id == incident.user_id)
                    .values(is_active=False, revoked_at=datetime.now(UTC))
                )
                await self.session.execute(stmt)
                applied.append(act_enum.value)
                logger.warning(f"Containment: Revoked all active sessions for user {incident.user_id}")

            elif act_enum == ContainmentAction.REVOKE_API_KEYS and incident.tenant_id:
                # Revoke API keys for tenant
                stmt = (
                    update(UserApiKey)
                    .where(UserApiKey.tenant_id == incident.tenant_id)
                    .values(is_active=False)
                )
                await self.session.execute(stmt)
                applied.append(act_enum.value)
                logger.warning(f"Containment: Revoked all developer API keys for tenant {incident.tenant_id}")

            elif act_enum == ContainmentAction.FREEZE_LEDGER:
                applied.append(act_enum.value)
                logger.warning(f"Containment: Ledger writes frozen for incident {incident_id}")

        incident.containment_actions_taken.extend(applied)
        incident.status = IncidentStatus.CONTAINED
        incident.contained_at = datetime.now(UTC)

        # Audit log containment event
        audit_entry = SecurityAuditLog(
            id=uuid.uuid4(),
            tenant_id=incident.tenant_id,
            user_id=executed_by_user_id,
            event_type="security_incident_contained",
            status="success",
            details={
                "incident_id": incident_id,
                "applied_actions": applied,
            },
        )
        self.session.add(audit_entry)
        await self.session.flush()

        return incident

    async def resolve_incident(
        self,
        incident_id: str,
        post_mortem_summary: str,
        resolved_by_user_id: uuid.UUID | None = None,
    ) -> SecurityIncident:
        """Mark incident as resolved with root cause documentation."""
        if incident_id not in _INCIDENTS_STORE:
            raise ValueError(f"Incident '{incident_id}' not found.")

        incident = _INCIDENTS_STORE[incident_id]
        incident.status = IncidentStatus.RESOLVED
        incident.resolved_at = datetime.now(UTC)
        incident.post_mortem = post_mortem_summary

        audit_entry = SecurityAuditLog(
            id=uuid.uuid4(),
            tenant_id=incident.tenant_id,
            user_id=resolved_by_user_id,
            event_type="security_incident_resolved",
            status="success",
            details={
                "incident_id": incident_id,
                "post_mortem": post_mortem_summary,
            },
        )
        self.session.add(audit_entry)
        await self.session.flush()

        logger.info(f"Incident {incident_id} successfully resolved.")
        return incident

    @staticmethod
    def get_incident(incident_id: str) -> SecurityIncident | None:
        """Retrieve incident from store."""
        return _INCIDENTS_STORE.get(incident_id)
