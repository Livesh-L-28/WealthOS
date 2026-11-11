"""WealthOS Multi-Tenant Context & Isolation Engine.

Provides thread/task-local context variables for request scoping,
PostgreSQL session-level tenant isolation, and tenant-scoped repository abstractions.
"""

import uuid
from collections.abc import Sequence
from contextvars import ContextVar
from typing import Any

from sqlalchemy import Select, delete, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import Base, TenantScopedMixin
from app.core.logging import get_logger

logger = get_logger("wealthos.tenant_context")

# Request-scoped context variables for multi-tenant identity
current_user_id_ctx: ContextVar[uuid.UUID | None] = ContextVar("current_user_id", default=None)
current_tenant_id_ctx: ContextVar[uuid.UUID | None] = ContextVar("current_tenant_id", default=None)
current_permissions_ctx: ContextVar[set[str]] = ContextVar("current_permissions", default=set())
current_roles_ctx: ContextVar[set[str]] = ContextVar("current_roles", default=set())


def get_current_user_id() -> uuid.UUID | None:
    """Retrieve the authenticated user ID from context."""
    return current_user_id_ctx.get()


def get_current_tenant_id() -> uuid.UUID:
    """Retrieve the verified active tenant ID from context.

    Raises:
        RuntimeError: If tenant context has not been initialized.
    """
    tid = current_tenant_id_ctx.get()
    if tid is None:
        raise RuntimeError("Tenant context has not been initialized for this operation.")
    return tid


def get_current_permissions() -> set[str]:
    """Retrieve the verified set of permission tokens for the active tenant."""
    return current_permissions_ctx.get()


def get_current_roles() -> set[str]:
    """Retrieve the verified set of role names for the active tenant."""
    return current_roles_ctx.get()


async def set_db_tenant_context(
    session: AsyncSession,
    tenant_id: uuid.UUID | None,
    user_id: uuid.UUID | None = None,
) -> None:
    """Apply PostgreSQL transaction-local tenant and user context for RLS enforcement.

    Uses `set_config` with is_local=true so settings automatically expire at the end of the transaction.
    Gracefully bypassed on SQLite fallback environments where `set_config` is not defined.
    """
    tid_str = str(tenant_id) if tenant_id is not None else ""
    uid_str = str(user_id) if user_id is not None else ""
    try:
        await session.execute(
            text(
                "SELECT set_config('app.current_tenant_id', :tid, true), "
                "set_config('app.current_user_id', :uid, true)"
            ),
            {"tid": tid_str, "uid": uid_str},
        )
    except Exception as exc:
        logger.debug(f"Tenant session context note (bypassed on non-Postgres engine): {exc}")


async def reset_db_session_state(session: AsyncSession) -> None:
    """Sanitize database connection state before returning to pool."""
    try:
        await session.execute(
            text(
                "SELECT set_config('app.current_tenant_id', '', false), "
                "set_config('app.current_user_id', '', false);"
            )
        )
    except Exception as exc:
        logger.debug(f"Connection pool sanitization note: {exc}")


class TenantScopedRepository[T: Base]:
    """Generic repository enforcing strict tenant isolation on all queries.

    Prevents Cross-Tenant Data Leakage (OWASP A01 / IDOR) by automatically
    binding all SELECT, UPDATE, and DELETE queries to the current tenant ID.
    """

    def __init__(self, model_class: type[T], session: AsyncSession):
        if not hasattr(model_class, "tenant_id") and not issubclass(model_class, TenantScopedMixin):
            raise TypeError(
                f"Model {model_class.__name__} must possess a tenant_id attribute to use TenantScopedRepository."
            )
        self.model_class = model_class
        self.session = session

    @property
    def tenant_id(self) -> uuid.UUID:
        """Resolve current verified tenant ID."""
        return get_current_tenant_id()

    def _apply_tenant_filter(self, query: Select[Any]) -> Select[Any]:
        """Apply tenant_id equality filter to SQLAlchemy select statement."""
        tenant_col = getattr(self.model_class, "tenant_id")
        return query.where(tenant_col == self.tenant_id)

    async def get_by_id(self, entity_id: uuid.UUID) -> T | None:
        """Fetch a single record by primary key scoped strictly to active tenant."""
        id_col = getattr(self.model_class, "id")
        stmt = self._apply_tenant_filter(select(self.model_class).where(id_col == entity_id))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_all(
        self,
        skip: int = 0,
        limit: int = 100,
        include_soft_deleted: bool = False,
    ) -> Sequence[T]:
        """List records scoped to active tenant with pagination."""
        stmt = self._apply_tenant_filter(select(self.model_class))
        if hasattr(self.model_class, "is_deleted") and not include_soft_deleted:
            del_col = getattr(self.model_class, "is_deleted")
            stmt = stmt.where(del_col == False)  # noqa: E712
        stmt = stmt.offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create(self, **kwargs: Any) -> T:
        """Create a new entity with tenant_id automatically bound."""
        kwargs["tenant_id"] = self.tenant_id
        if "user_id" not in kwargs:
            uid = get_current_user_id()
            if uid is not None:
                kwargs["user_id"] = uid

        entity = self.model_class(**kwargs)
        self.session.add(entity)
        await self.session.flush()
        return entity

    async def update_by_id(self, entity_id: uuid.UUID, **kwargs: Any) -> bool:
        """Update a record by ID strictly scoped to active tenant."""
        # Never allow overriding tenant_id or id
        kwargs.pop("tenant_id", None)
        kwargs.pop("id", None)

        id_col = getattr(self.model_class, "id")
        tenant_col = getattr(self.model_class, "tenant_id")
        stmt = (
            update(self.model_class)
            .where(
                id_col == entity_id,
                tenant_col == self.tenant_id,
            )
            .values(**kwargs)
        )
        result = await self.session.execute(stmt)
        rowcount = getattr(result, "rowcount", 0)
        return int(rowcount) > 0

    async def delete_by_id(self, entity_id: uuid.UUID, soft: bool = True) -> bool:
        """Delete or soft-delete a record by ID strictly scoped to active tenant."""
        if soft and hasattr(self.model_class, "is_deleted"):
            return await self.update_by_id(entity_id, is_deleted=True)

        id_col = getattr(self.model_class, "id")
        tenant_col = getattr(self.model_class, "tenant_id")
        stmt = delete(self.model_class).where(
            id_col == entity_id,
            tenant_col == self.tenant_id,
        )
        result = await self.session.execute(stmt)
        rowcount = getattr(result, "rowcount", 0)
        return int(rowcount) > 0
