"""WealthOS Suspicious Login & Account Takeover Defense Service.

Evaluates login context (fingerprint, IP, anomaly indicators) and determines
whether step-up multi-factor authentication or account locking is required.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.identity.devices import DeviceRegistryService

logger = get_logger("wealthos.suspicious_login")


@dataclass
class LoginRiskEvaluation:
    """Detailed risk assessment score and factor breakdown."""

    risk_score: int  # 0 to 100
    risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL
    requires_step_up: bool
    risk_factors: list[str] = field(default_factory=list)
    evaluated_at: datetime = field(default_factory=lambda: datetime.now(UTC))


class SuspiciousLoginService:
    """Evaluates login signals and enforces step-up authentication."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.device_service = DeviceRegistryService(session)

    async def evaluate_login_risk(
        self,
        user_id: uuid.UUID,
        device_fingerprint: str,
        client_ip: str | None = None,
        failed_attempts_last_hour: int = 0,
        is_known_proxy: bool = False,
    ) -> LoginRiskEvaluation:
        """Evaluate risk score based on device trust, IP characteristics, and failed attempts."""
        score = 0
        factors = []

        # 1. Device Trust Check
        is_trusted = await self.device_service.is_device_trusted(user_id, device_fingerprint)
        if not is_trusted:
            score += 35
            factors.append("NEW_OR_UNTRUSTED_DEVICE")

        # 2. Failed Attempts Frequency
        if failed_attempts_last_hour >= 5:
            score += 45
            factors.append("HIGH_FAILED_LOGIN_FREQUENCY")
        elif failed_attempts_last_hour >= 2:
            score += 20
            factors.append("ELEVATED_FAILED_LOGIN_FREQUENCY")

        # 3. Known Proxy / Tor / VPN
        if is_known_proxy:
            score += 25
            factors.append("ANONYMOUS_PROXY_OR_VPN")

        # Risk Classification
        if score >= 60:
            level = "CRITICAL" if score >= 80 else "HIGH"
            requires_step_up = True
        elif score >= 30:
            level = "MEDIUM"
            requires_step_up = True
        else:
            level = "LOW"
            requires_step_up = False

        if requires_step_up:
            logger.warning(
                f"[SECURITY EVENT] Suspicious login evaluated for user {user_id}: "
                f"score={score}, level={level}, factors={factors}"
            )

        return LoginRiskEvaluation(
            risk_score=min(100, score),
            risk_level=level,
            requires_step_up=requires_step_up,
            risk_factors=factors,
        )

