"""WealthOS In-App Notifications and Event Bus Service."""

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.integrations.models import (
    Notification,
    NotificationEvent,
    NotificationPreference,
)

logger = get_logger("wealthos.integrations.notifications")


class NotificationService:
    """Service orchestrating event emission, preference routing, and inbox management."""

    @staticmethod
    async def set_user_preference(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        category: str,
        channel: str = "IN_APP",
        is_enabled: bool = True,
        frequency: str = "IMMEDIATE",
    ) -> NotificationPreference:
        """Upsert user notification preference for a specific category and channel."""
        stmt = select(NotificationPreference).where(
            NotificationPreference.tenant_id == tenant_id,
            NotificationPreference.user_id == user_id,
            NotificationPreference.category == category,
            NotificationPreference.channel == channel,
        )
        res = await session.execute(stmt)
        pref = res.scalar_one_or_none()

        if pref:
            pref.is_enabled = is_enabled
            pref.frequency = frequency
            pref.updated_at = datetime.now(UTC)
        else:
            pref = NotificationPreference(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                user_id=user_id,
                category=category,
                channel=channel,
                is_enabled=is_enabled,
                frequency=frequency,
            )
            session.add(pref)

        await session.flush()
        return pref

    @staticmethod
    async def emit_event(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        event_type: str,
        category: str,
        priority: str = "MEDIUM",
        payload: dict[str, Any] | None = None,
        source_id: uuid.UUID | None = None,
    ) -> NotificationEvent:
        """Emit domain event to notification event stream."""
        event = NotificationEvent(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            event_type=event_type,
            category=category,
            priority=priority,
            source_id=source_id,
            payload=payload or {},
        )
        session.add(event)
        await session.flush()
        return event

    @staticmethod
    async def dispatch_notification(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        event_type: str,
        category: str,
        priority: str,
        title: str,
        message: str,
        action_url: str | None = None,
    ) -> Notification | None:
        """Deliver in-app notification if user preferences permit."""
        # Check user preference
        pref_stmt = select(NotificationPreference).where(
            NotificationPreference.tenant_id == tenant_id,
            NotificationPreference.user_id == user_id,
            NotificationPreference.category == category,
            NotificationPreference.channel == "IN_APP",
        )
        res = await session.execute(pref_stmt)
        pref = res.scalar_one_or_none()

        # If explicitly disabled by user, drop notification
        if pref and not pref.is_enabled:
            logger.info(
                f"Notification suppressed by user preference: user={user_id}, category={category}"
            )
            return None

        notification = Notification(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            user_id=user_id,
            event_type=event_type,
            category=category,
            priority=priority,
            title=title.strip()[:255],
            message=message,
            action_url=action_url,
        )
        session.add(notification)
        await session.flush()
        return notification

    @staticmethod
    async def get_inbox(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        unread_only: bool = False,
    ) -> list[Notification]:
        """Fetch notifications in user's in-app inbox."""
        stmt = (
            select(Notification)
            .where(
                Notification.tenant_id == tenant_id,
                Notification.user_id == user_id,
                Notification.archived_at == None,  # noqa: E711
            )
            .order_by(Notification.created_at.desc())
        )
        if unread_only:
            stmt = stmt.where(Notification.read_at == None)  # noqa: E711

        res = await session.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def mark_as_read(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        notification_id: uuid.UUID,
    ) -> bool:
        """Mark specific notification as read."""
        stmt = (
            update(Notification)
            .where(
                Notification.id == notification_id,
                Notification.tenant_id == tenant_id,
                Notification.user_id == user_id,
            )
            .values(read_at=datetime.now(UTC))
        )
        res = await session.execute(stmt)
        await session.flush()
        return res.rowcount > 0

    @staticmethod
    async def archive_notification(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        notification_id: uuid.UUID,
    ) -> bool:
        """Archive notification from inbox."""
        stmt = (
            update(Notification)
            .where(
                Notification.id == notification_id,
                Notification.tenant_id == tenant_id,
                Notification.user_id == user_id,
            )
            .values(archived_at=datetime.now(UTC))
        )
        res = await session.execute(stmt)
        await session.flush()
        return res.rowcount > 0

