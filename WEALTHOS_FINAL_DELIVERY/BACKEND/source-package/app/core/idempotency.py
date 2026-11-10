"""WealthOS Universal Financial API Idempotency Engine.

Guarantees exact-once execution across financial operations (transactions,
trades, transfers, document approvals, period close) using cryptographic request fingerprints.
"""

import hashlib
import json
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger

logger = get_logger("wealthos.core.idempotency")


class IdempotencyConflictError(ValueError):
    """Raised when an idempotency key is concurrently locked or reused with differing payload."""

    pass


class IdempotencyEngine:
    """Universal idempotency coordinator for transactional financial endpoints."""

    @staticmethod
    def compute_request_hash(payload: Any) -> str:
        """Compute deterministic SHA-256 digest of request payload."""
        if payload is None:
            serialized = "{}"
        elif isinstance(payload, str):
            serialized = payload.strip()
        elif isinstance(payload, dict | list):
            serialized = json.dumps(payload, sort_keys=True, default=str)
        elif hasattr(payload, "model_dump"):
            serialized = json.dumps(payload.model_dump(mode="json"), sort_keys=True, default=str)
        else:
            serialized = str(payload)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    @staticmethod
    async def check_or_lock(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        idempotency_key: str,
        operation: str,
        payload: Any,
        ttl_seconds: int = 86400,
    ) -> tuple[bool, int | None, Any | None]:
        """Check for existing idempotency record or acquire execution lock.
        
        Returns:
            (is_replay: bool, cached_status_code: int | None, cached_response: Any | None)
        """
        clean_key = str(idempotency_key).strip()[:128]
        req_hash = IdempotencyEngine.compute_request_hash(payload)

        # Query existing record
        query = text(
            """
            SELECT id, request_hash, status, response_code, response_body, expires_at
            FROM api_idempotency_records
            WHERE tenant_id = :tenant_id AND idempotency_key = :key
            FOR UPDATE;
            """
        )
        result = await session.execute(query, {"tenant_id": str(tenant_id), "key": clean_key})
        row = result.fetchone()

        now = datetime.now(UTC)

        if row:
            rec_id, stored_hash, status, resp_code, resp_body, expires_at = row

            # If expired, delete and allow retry
            if expires_at and expires_at < now:
                await session.execute(
                    text("DELETE FROM api_idempotency_records WHERE id = :id"),
                    {"id": str(rec_id)},
                )
                await session.flush()
            else:
                # Payload mismatch check
                if stored_hash != req_hash:
                    logger.warning(
                        f"Idempotency conflict: key '{clean_key}' reused with different payload for tenant {tenant_id}"
                    )
                    raise IdempotencyConflictError(
                        f"Idempotency key '{clean_key}' was already used with a different request payload."
                    )

                # Concurrent in-progress execution check
                if status == "IN_PROGRESS":
                    raise IdempotencyConflictError(
                        f"An operation with idempotency key '{clean_key}' is currently in progress."
                    )

                # Replay completed response
                if status == "COMPLETED":
                    logger.info(f"Replaying cached response for idempotency key '{clean_key}'")
                    return True, resp_code, resp_body

        # Acquire lock by inserting IN_PROGRESS record
        insert_stmt = text(
            """
            INSERT INTO api_idempotency_records (
                id, tenant_id, user_id, idempotency_key, operation,
                request_hash, status, created_at, expires_at
            ) VALUES (
                gen_random_uuid(), :tenant_id, :user_id, :key, :operation,
                :hash, 'IN_PROGRESS', :now, :expires_at
            )
            ON CONFLICT (tenant_id, idempotency_key) DO UPDATE
            SET status = 'IN_PROGRESS', request_hash = :hash, created_at = :now, expires_at = :expires_at;
            """
        )
        expires_at = now + timedelta(seconds=ttl_seconds)
        await session.execute(
            insert_stmt,
            {
                "tenant_id": str(tenant_id),
                "user_id": str(user_id),
                "key": clean_key,
                "operation": str(operation)[:100],
                "hash": req_hash,
                "now": now,
                "expires_at": expires_at,
            },
        )
        await session.flush()
        return False, None, None

    @staticmethod
    async def record_completed(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        idempotency_key: str,
        response_code: int,
        response_body: Any,
    ) -> None:
        """Store completed execution result for future replays."""
        clean_key = str(idempotency_key).strip()[:128]
        body_json = response_body
        if hasattr(response_body, "model_dump"):
            body_json = response_body.model_dump(mode="json")

        update_stmt = text(
            """
            UPDATE api_idempotency_records
            SET status = 'COMPLETED',
                response_code = :code,
                response_body = CAST(:body AS JSONB)
            WHERE tenant_id = :tenant_id AND idempotency_key = :key;
            """
        )
        await session.execute(
            update_stmt,
            {
                "tenant_id": str(tenant_id),
                "key": clean_key,
                "code": response_code,
                "body": json.dumps(body_json, default=str),
            },
        )
        await session.flush()

    @staticmethod
    async def record_failed(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        idempotency_key: str,
    ) -> None:
        """Mark record as failed so future retries can proceed."""
        clean_key = str(idempotency_key).strip()[:128]
        await session.execute(
            text(
                """
                UPDATE api_idempotency_records
                SET status = 'FAILED'
                WHERE tenant_id = :tenant_id AND idempotency_key = :key;
                """
            ),
            {"tenant_id": str(tenant_id), "key": clean_key},
        )
        await session.flush()
