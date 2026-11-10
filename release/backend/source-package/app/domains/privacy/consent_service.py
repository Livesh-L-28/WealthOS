"""WealthOS Purpose-Specific Data Consent Governance Service.

Manages granular, explicit user consents for financial data processing,
AI inference, third-party aggregation, and data sharing under DPDP/GDPR.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from enum import Enum
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.privacy.models import DataConsentRecord

logger = get_logger("wealthos.consent_service")


class ConsentPurpose(str, Enum):
    ACCOUNT_AGGREGATION = "ACCOUNT_AGGREGATION"
    AI_COPILOT_PROCESSING = "AI_COPILOT_PROCESSING"
    TAX_PREPARATION_EXPORT = "TAX_PREPARATION_EXPORT"
    HOUSEHOLD_SHARING = "HOUSEHOLD_SHARING"
    ANALYTICS_TELEMETRY = "ANALYTICS_TELEMETRY"


class DataConsentService:
    """Enterprise Data Consent & Purpose Governance Service."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def grant_consent(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        purpose: ConsentPurpose | str,
        consent_version: str = "1.0",
        expires_at: datetime | None = None,
        audit_metadata: dict[str, Any] | None = None,
    ) -> DataConsentRecord:
        """Grant or re-affirm explicit purpose-specific data processing consent."""
        p_str = purpose.value if isinstance(purpose, ConsentPurpose) else purpose

        # Revoke or update prior active record if exists
        stmt = select(DataConsentRecord).where(
            DataConsentRecord.tenant_id == tenant_id,
            DataConsentRecord.user_id == user_id,
            DataConsentRecord.purpose == p_str,
            DataConsentRecord.status == "GRANTED",
        )
        res = await self.session.execute(stmt)
        existing = res.scalar_one_or_none()

        now = datetime.now(UTC)
        if existing:
            existing.status = "REVOKED"
            existing.revoked_at = now

        meta = audit_metadata or {}
        meta["granted_timestamp"] = now.isoformat()

        record = DataConsentRecord(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            user_id=user_id,
            purpose=p_str,
            consent_version=consent_version,
            status="GRANTED",
            granted_at=now,
            expires_at=expires_at,
            audit_metadata=meta,
        )
        self.session.add(record)
        await self.session.flush()
        logger.info(f"Granted consent for purpose '{p_str}' by user {user_id} (tenant {tenant_id})")
        return record

    async def revoke_consent(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        purpose: ConsentPurpose | str,
        reason: str = "USER_REQUEST",
    ) -> bool:
        """Revoke active consent for specific processing purpose."""
        p_str = purpose.value if isinstance(purpose, ConsentPurpose) else purpose
        stmt = select(DataConsentRecord).where(
            DataConsentRecord.tenant_id == tenant_id,
            DataConsentRecord.user_id == user_id,
            DataConsentRecord.purpose == p_str,
            DataConsentRecord.status == "GRANTED",
        )
        res = await self.session.execute(stmt)
        record = res.scalar_one_or_none()

        if not record:
            return False

        record.status = "REVOKED"
        record.revoked_at = datetime.now(UTC)
        record.audit_metadata["revocation_reason"] = reason
        record.audit_metadata["revocation_timestamp"] = record.revoked_at.isoformat()
        await self.session.flush()
        logger.warning(f"Revoked consent for purpose '{p_str}' by user {user_id}")
        return True

    async def has_active_consent(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        purpose: ConsentPurpose | str,
    ) -> bool:
        """Verify if principal has granted active, unexpired consent."""
        p_str = purpose.value if isinstance(purpose, ConsentPurpose) else purpose
        stmt = select(DataConsentRecord).where(
            DataConsentRecord.tenant_id == tenant_id,
            DataConsentRecord.user_id == user_id,
            DataConsentRecord.purpose == p_str,
            DataConsentRecord.status == "GRANTED",
        )
        res = await self.session.execute(stmt)
        record = res.scalar_one_or_none()
        if not record:
            return False

        if record.expires_at and record.expires_at < datetime.now(UTC):
            record.status = "EXPIRED"
            await self.session.flush()
            return False

        return True

    async def get_user_consent_matrix(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> list[dict[str, Any]]:
        """Retrieve all consent declarations and current status for user."""
        stmt = (
            select(DataConsentRecord)
            .where(
                DataConsentRecord.tenant_id == tenant_id,
                DataConsentRecord.user_id == user_id,
            )
            .order_by(DataConsentRecord.granted_at.desc())
        )
        res = await self.session.execute(stmt)
        records = res.scalars().all()

        return [
            {
                "id": str(r.id),
                "purpose": r.purpose,
                "version": r.consent_version,
                "status": r.status,
                "granted_at": r.granted_at.isoformat(),
                "revoked_at": r.revoked_at.isoformat() if r.revoked_at else None,
                "expires_at": r.expires_at.isoformat() if r.expires_at else None,
            }
            for r in records
        ]

