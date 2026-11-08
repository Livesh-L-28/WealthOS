"""WealthOS Trusted Device Registry Service.

Maintains client hardware/browser fingerprints, tracks session activity,
and flags unfamiliar devices for step-up security verification.
"""

from __future__ import annotations

import hashlib
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.identity.models import DeviceRegistry

logger = get_logger("wealthos.devices")


class DeviceRegistryService:
    """Manages user devices, fingerprints, and trust status."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def compute_fingerprint(
        user_agent: str,
        client_ip: str | None = None,
        screen_resolution: str = "",
        timezone: str = "UTC",
    ) -> str:
        """Generate SHA-256 deterministic device fingerprint."""
        raw = f"{user_agent}|{screen_resolution}|{timezone}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    async def register_or_update_device(
        self,
        user_id: uuid.UUID,
        device_fingerprint: str,
        device_name: str,
        device_type: str = "WEB_DESKTOP",
        client_ip: str | None = None,
        auto_trust: bool = True,
    ) -> tuple[DeviceRegistry, bool]:
        """Register or update a user device.
        
        Returns tuple of (device, is_new_device).
        """
        stmt = select(DeviceRegistry).where(
            DeviceRegistry.user_id == user_id,
            DeviceRegistry.device_fingerprint == device_fingerprint,
        )
        res = await self.session.execute(stmt)
        device = res.scalar_one_or_none()

        if device:
            device.last_seen_at = datetime.now(UTC)
            if client_ip:
                device.client_ip = client_ip
            await self.session.flush()
            return device, False

        # New device
        device = DeviceRegistry(
            id=uuid.uuid4(),
            user_id=user_id,
            device_fingerprint=device_fingerprint,
            device_name=device_name,
            device_type=device_type,
            client_ip=client_ip,
            is_trusted=auto_trust,
            is_revoked=False,
            created_at=datetime.now(UTC),
            last_seen_at=datetime.now(UTC),
        )
        self.session.add(device)
        await self.session.flush()
        logger.info(f"Registered new device '{device_name}' for user {user_id}")
        return device, True

    async def get_user_devices(self, user_id: uuid.UUID) -> list[DeviceRegistry]:
        """Fetch all registered devices for user."""
        stmt = (
            select(DeviceRegistry)
            .where(DeviceRegistry.user_id == user_id)
            .order_by(DeviceRegistry.last_seen_at.desc())
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def revoke_device(self, user_id: uuid.UUID, device_id: uuid.UUID) -> bool:
        """Revoke trust and mark device as untrusted/revoked."""
        stmt = select(DeviceRegistry).where(
            DeviceRegistry.id == device_id,
            DeviceRegistry.user_id == user_id,
        )
        res = await self.session.execute(stmt)
        device = res.scalar_one_or_none()
        if not device:
            return False

        device.is_trusted = False
        device.is_revoked = True
        device.revoked_at = datetime.now(UTC)
        await self.session.flush()
        logger.warning(f"Revoked device {device_id} for user {user_id}")
        return True

    async def is_device_trusted(self, user_id: uuid.UUID, device_fingerprint: str) -> bool:
        """Check if fingerprint corresponds to an active, trusted device."""
        stmt = select(DeviceRegistry).where(
            DeviceRegistry.user_id == user_id,
            DeviceRegistry.device_fingerprint == device_fingerprint,
            DeviceRegistry.is_trusted == True,
            DeviceRegistry.is_revoked == False,
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none() is not None

