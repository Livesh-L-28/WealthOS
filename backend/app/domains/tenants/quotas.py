"""WealthOS Tenant Resource Quota & Noisy-Neighbour Protection Service.

Enforces per-tenant daily rate limits and resource consumption caps
(OCR document extractions, AI copilot tokens, report PDF/XLSX exports).
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from enum import Enum
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.tenants.models import TenantResourceQuota

logger = get_logger("wealthos.tenant_quotas")


class QuotaResourceType(str, Enum):
    OCR_DOCUMENTS = "OCR_DOCUMENTS"
    AI_REQUESTS = "AI_REQUESTS"
    REPORT_EXPORTS = "REPORT_EXPORTS"
    CONCURRENT_SYNCS = "CONCURRENT_SYNCS"


class QuotaExceededError(Exception):
    """Raised when a tenant exceeds their daily resource quota."""

    def __init__(self, resource: str, current_used: int, max_allowed: int) -> None:
        super().__init__(
            f"Daily quota exceeded for {resource}: used {current_used}/{max_allowed}. "
            "Resets tomorrow at 00:00 UTC."
        )
        self.resource = resource
        self.current_used = current_used
        self.max_allowed = max_allowed


class TenantQuotaService:
    """Manages tenant quota lifecycle, atomic increments, and daily rollover."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_or_create_quotas(self, tenant_id: uuid.UUID) -> TenantResourceQuota:
        """Fetch or initialize default resource quotas for tenant."""
        stmt = select(TenantResourceQuota).where(TenantResourceQuota.tenant_id == tenant_id)
        res = await self.session.execute(stmt)
        quota = res.scalar_one_or_none()

        today = datetime.now(UTC).date()
        if not quota:
            quota = TenantResourceQuota(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                max_daily_ocr_documents=100,
                max_daily_ai_requests=500,
                max_daily_report_exports=50,
                max_concurrent_syncs=5,
                used_ocr_count=0,
                used_ai_count=0,
                used_report_count=0,
                quota_reset_date=today,
            )
            self.session.add(quota)
            await self.session.flush()
            return quota

        # Roll over if date changed
        if quota.quota_reset_date < today:
            quota.used_ocr_count = 0
            quota.used_ai_count = 0
            quota.used_report_count = 0
            quota.quota_reset_date = today
            await self.session.flush()

        return quota

    async def check_and_consume_quota(
        self,
        tenant_id: uuid.UUID,
        resource_type: QuotaResourceType | str,
        amount: int = 1,
    ) -> TenantResourceQuota:
        """Atomic check and increment of tenant resource usage."""
        rtype = QuotaResourceType(resource_type) if isinstance(resource_type, str) else resource_type
        quota = await self.get_or_create_quotas(tenant_id)

        if rtype == QuotaResourceType.OCR_DOCUMENTS:
            if quota.used_ocr_count + amount > quota.max_daily_ocr_documents:
                raise QuotaExceededError("OCR_DOCUMENTS", quota.used_ocr_count, quota.max_daily_ocr_documents)
            quota.used_ocr_count += amount

        elif rtype == QuotaResourceType.AI_REQUESTS:
            if quota.used_ai_count + amount > quota.max_daily_ai_requests:
                raise QuotaExceededError("AI_REQUESTS", quota.used_ai_count, quota.max_daily_ai_requests)
            quota.used_ai_count += amount

        elif rtype == QuotaResourceType.REPORT_EXPORTS:
            if quota.used_report_count + amount > quota.max_daily_report_exports:
                raise QuotaExceededError("REPORT_EXPORTS", quota.used_report_count, quota.max_daily_report_exports)
            quota.used_report_count += amount

        await self.session.flush()
        return quota

    async def get_quota_status(self, tenant_id: uuid.UUID) -> dict[str, Any]:
        """Retrieve telemetry summary of quota consumption and remaining units."""
        quota = await self.get_or_create_quotas(tenant_id)
        return {
            "tenant_id": str(tenant_id),
            "quota_reset_date": quota.quota_reset_date.isoformat(),
            "resources": {
                "ocr_documents": {
                    "used": quota.used_ocr_count,
                    "max": quota.max_daily_ocr_documents,
                    "remaining": max(0, quota.max_daily_ocr_documents - quota.used_ocr_count),
                },
                "ai_requests": {
                    "used": quota.used_ai_count,
                    "max": quota.max_daily_ai_requests,
                    "remaining": max(0, quota.max_daily_ai_requests - quota.used_ai_count),
                },
                "report_exports": {
                    "used": quota.used_report_count,
                    "max": quota.max_daily_report_exports,
                    "remaining": max(0, quota.max_daily_report_exports - quota.used_report_count),
                },
                "concurrent_syncs": {
                    "max": quota.max_concurrent_syncs,
                },
            },
        }
