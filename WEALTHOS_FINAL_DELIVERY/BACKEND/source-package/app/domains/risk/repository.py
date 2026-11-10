"""WealthOS Financial Risk Intelligence Repository."""

import uuid
from datetime import UTC, datetime
from typing import Any, Sequence

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.risk.models import RiskAlert, RiskAssessment


class RiskRepository:
    """Data access repository for risk assessments and deduplicated risk alerts."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def save_assessment(self, assessment: RiskAssessment) -> RiskAssessment:
        self.session.add(assessment)
        await self.session.flush()
        return assessment

    async def get_latest_assessment(self, tenant_id: uuid.UUID) -> RiskAssessment | None:
        stmt = (
            select(RiskAssessment)
            .where(RiskAssessment.tenant_id == tenant_id)
            .order_by(desc(RiskAssessment.created_at))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_assessments(
        self, tenant_id: uuid.UUID, limit: int = 10
    ) -> Sequence[RiskAssessment]:
        stmt = (
            select(RiskAssessment)
            .where(RiskAssessment.tenant_id == tenant_id)
            .order_by(desc(RiskAssessment.created_at))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def upsert_alert(
        self,
        tenant_id: uuid.UUID,
        alert_key: str,
        risk_category: str,
        severity: str,
        title: str,
        description: str,
        evidence: dict[str, Any],
    ) -> RiskAlert:
        """Create new alert or update existing active alert by idempotent key."""
        stmt = select(RiskAlert).where(
            RiskAlert.tenant_id == tenant_id,
            RiskAlert.alert_key == alert_key,
        )
        result = await self.session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            # Re-evaluate evidence and severity; reactivate if previously resolved
            existing.severity = severity
            existing.title = title
            existing.description = description
            existing.evidence = evidence
            if existing.status == "RESOLVED":
                existing.status = "ACTIVE"
                existing.resolved_at = None
            await self.session.flush()
            return existing

        new_alert = RiskAlert(
            tenant_id=tenant_id,
            alert_key=alert_key,
            risk_category=risk_category,
            severity=severity,
            title=title,
            description=description,
            evidence=evidence,
            status="ACTIVE",
        )
        self.session.add(new_alert)
        await self.session.flush()
        return new_alert

    async def get_alert(self, tenant_id: uuid.UUID, alert_id: uuid.UUID) -> RiskAlert | None:
        stmt = select(RiskAlert).where(
            RiskAlert.tenant_id == tenant_id,
            RiskAlert.id == alert_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_alerts(
        self, tenant_id: uuid.UUID, status: str | None = None
    ) -> Sequence[RiskAlert]:
        stmt = select(RiskAlert).where(RiskAlert.tenant_id == tenant_id)
        if status:
            stmt = stmt.where(RiskAlert.status == status)
        stmt = stmt.order_by(desc(RiskAlert.triggered_at))
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def update_alert_status(
        self, alert: RiskAlert, new_status: str, notes: str | None = None
    ) -> RiskAlert:
        alert.status = new_status
        if notes:
            alert.resolution_notes = notes
        if new_status == "RESOLVED":
            alert.resolved_at = datetime.now(UTC)
        await self.session.flush()
        return alert
