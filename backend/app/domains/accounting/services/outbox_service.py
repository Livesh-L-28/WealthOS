"""WealthOS Transactional Outbox Domain Service.

Coordinates atomic event persistence, reliable at-least-once asynchronous dispatch,
and idempotency across message brokers.
"""

import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.accounting.models.outbox import OutboxEvent

logger = get_logger("wealthos.accounting.outbox")


class OutboxService:
    """Manages transactional outbox recording, polling, and dispatching."""

    @staticmethod
    async def record_event(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        aggregate_type: str,
        aggregate_id: str,
        event_type: str,
        payload: dict[str, Any],
        event_version: int = 1,
    ) -> OutboxEvent:
        """Atomically persist domain event in outbox inside current database transaction."""
        event = OutboxEvent(
            tenant_id=tenant_id,
            aggregate_type=aggregate_type.upper().strip(),
            aggregate_id=str(aggregate_id).strip(),
            event_type=event_type.strip(),
            event_version=event_version,
            payload=payload,
            status="PENDING",
            retry_count=0,
            max_retries=5,
        )
        session.add(event)
        await session.flush()
        logger.debug(
            f"Recorded outbox event {event.id} ({event.event_type}) for aggregate {aggregate_type}:{aggregate_id}"
        )
        return event

    @staticmethod
    async def fetch_pending_events(
        session: AsyncSession,
        limit: int = 50,
    ) -> list[OutboxEvent]:
        """Fetch pending or failed events eligible for retry."""
        stmt = (
            select(OutboxEvent)
            .where(
                OutboxEvent.status.in_(["PENDING", "FAILED"]),
                OutboxEvent.retry_count < OutboxEvent.max_retries,
            )
            .order_by(OutboxEvent.created_at.asc())
            .limit(limit)
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def mark_processed(
        session: AsyncSession,
        event_id: uuid.UUID,
    ) -> None:
        """Mark outbox event as successfully published."""
        event = await session.get(OutboxEvent, event_id)
        if event:
            event.status = "PUBLISHED"
            event.processed_at = datetime.now(UTC)
            event.last_error = None
            await session.flush()

    @staticmethod
    async def mark_failed(
        session: AsyncSession,
        event_id: uuid.UUID,
        error_msg: str,
    ) -> None:
        """Record dispatch failure and increment retry counter."""
        event = await session.get(OutboxEvent, event_id)
        if event:
            event.retry_count += 1
            event.last_error = error_msg[:1000]
            if event.retry_count >= event.max_retries:
                event.status = "FAILED"
            else:
                event.status = "PENDING"
            await session.flush()

    @staticmethod
    async def dispatch_pending_events(
        session: AsyncSession,
        publisher: Callable[[OutboxEvent], Any],
        limit: int = 50,
    ) -> dict[str, int]:
        """Dispatch pending outbox events through the provided publisher."""
        events = await OutboxService.fetch_pending_events(session, limit=limit)
        dispatched = 0
        failed = 0

        for ev in events:
            ev.status = "PROCESSING"
            await session.flush()
            try:
                res = publisher(ev)
                if hasattr(res, "__await__"):
                    await res
                await OutboxService.mark_processed(session, ev.id)
                dispatched += 1
            except Exception as exc:
                logger.warning(f"Failed to dispatch outbox event {ev.id}: {exc}")
                await OutboxService.mark_failed(session, ev.id, str(exc))
                failed += 1

        return {"dispatched": dispatched, "failed": failed, "total": len(events)}

    @staticmethod
    async def cleanup_processed_events(
        session: AsyncSession,
        retention_days: int = 7,
    ) -> int:
        """Purge successfully published outbox events older than retention period."""
        cutoff = datetime.now(UTC) - timedelta(days=retention_days)
        stmt = delete(OutboxEvent).where(
            OutboxEvent.status == "PUBLISHED",
            OutboxEvent.processed_at < cutoff,
        )
        res = await session.execute(stmt)
        deleted_count = res.rowcount or 0
        if deleted_count > 0:
            logger.info(f"Purged {deleted_count} published outbox events older than {retention_days} days")
        return deleted_count
