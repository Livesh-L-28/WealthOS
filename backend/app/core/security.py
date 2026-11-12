"""WealthOS Core Security & Authorization Dependencies.

Implements token verification, tenant resolution, RBAC policy enforcement,
and Redis-backed rate limiting.
"""

import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db_session
from app.core.logging import get_logger
from app.core.tenant_context import (
    current_permissions_ctx,
    current_roles_ctx,
    current_tenant_id_ctx,
    current_user_id_ctx,
    set_db_tenant_context,
)
from app.domains.identity.models import User, UserSession
from app.domains.identity.tokens import TokenSecurityError, decode_and_validate_token
from app.domains.tenants.models import Tenant, TenantMembership
from app.domains.tenants.service import (
    get_user_permissions_in_tenant,
    get_user_tenant_membership,
    list_user_tenants,
)
from app.infrastructure.redis import get_redis

logger = get_logger("wealthos.security")

# HTTP Bearer authentication scheme (auto_error=False to allow clean custom 401s)
bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class TenantContext:
    """Resolved security context for an authenticated, tenant-scoped request."""

    user: User
    tenant: Tenant
    membership: TenantMembership
    roles: set[str]
    permissions: set[str]
    session_id: uuid.UUID


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_db_session),
) -> tuple[User, uuid.UUID]:
    """Validate Bearer access token or HttpOnly session cookie and resolve active authenticated user and session ID.

    Returns:
        tuple[User, uuid.UUID]: Authenticated user model and session ID.

    Raises:
        HTTPException: 401 if unauthenticated, token invalid, or session terminated.
    """
    raw_token: str | None = None
    if credentials and credentials.credentials:
        raw_token = credentials.credentials
    elif request.cookies.get("wealthos_access_token"):
        raw_token = request.cookies.get("wealthos_access_token")
    elif request.cookies.get("access_token"):
        raw_token = request.cookies.get("access_token")

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_and_validate_token(raw_token, expected_token_type="access")
    except TokenSecurityError as exc:
        logger.warning(f"Access token validation failure: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired authentication token: {exc}",
            headers={"WWW-Authenticate": "Bearer error='invalid_token'"},
        ) from exc

    try:
        user_id = uuid.UUID(payload["sub"])
        session_id = uuid.UUID(payload["sid"])
    except (ValueError, KeyError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload contains invalid identifier claims.",
            headers={"WWW-Authenticate": "Bearer error='invalid_token'"},
        ) from exc

    # Query user account with credential metadata
    stmt = (
        select(User)
        .options(
            selectinload(User.credential),
            selectinload(User.mfa_credential),
        )
        .where(User.id == user_id, User.is_deleted == False)  # noqa: E712
    )
    user = (await session.execute(stmt)).scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with token was not found.",
            headers={"WWW-Authenticate": "Bearer error='invalid_token'"},
        )

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User account is not active (current status: {user.status}).",
        )

    now = datetime.now(UTC)

    # Validate session status in DB
    session_stmt = select(UserSession).where(
        UserSession.id == session_id,
        UserSession.user_id == user.id,
    )
    user_session = (await session.execute(session_stmt)).scalar_one_or_none()

    if not user_session or not user_session.is_active or user_session.revoked_at is not None:
        logger.warning(f"Access token presented for revoked/non-existent session {session_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been terminated or revoked. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer error='invalid_token'"},
        )

    # Validate session expiration
    expires_at = user_session.expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if expires_at and expires_at <= now:
        logger.warning(
            f"Database session {session_id} has expired (expires_at={user_session.expires_at})"
        )
        user_session.is_active = False
        user_session.revoked_at = now
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer error='invalid_token'"},
        )

    # Update session activity
    user_session.last_active_at = now

    # Set context variables and database session context
    current_user_id_ctx.set(user.id)
    await set_db_tenant_context(session, tenant_id=None, user_id=user.id)

    return user, session_id


async def get_current_tenant_context(
    request: Request,
    auth_data: tuple[User, uuid.UUID] = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> TenantContext:
    """Resolve and enforce tenant isolation context for the active request.

    Evaluates X-Tenant-ID header, validates user membership, computes RBAC permissions,
    and sets thread/task-local context variables and database session tenant state.

    Raises:
        HTTPException: 400 on malformed tenant header, 403 on denied workspace access.
    """
    user, session_id = auth_data

    # 1. Determine target tenant ID
    tenant_header = request.headers.get("X-Tenant-ID")
    target_tenant_id: uuid.UUID | None = None

    if tenant_header:
        try:
            target_tenant_id = uuid.UUID(tenant_header.strip())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Header 'X-Tenant-ID' must be a valid UUIDv4 string.",
            )
    else:
        # Fallback to user's personal or first available active workspace
        tenants = await list_user_tenants(session, user.id)
        if not tenants:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not have access to any active workspace.",
            )
        # Prefer personal workspace
        personal = next((t for t in tenants if t["tenant_type"] == "personal"), tenants[0])
        target_tenant_id = personal["id"]

    # 2. Verify user has active membership in this tenant
    membership = await get_user_tenant_membership(session, user.id, target_tenant_id)
    if not membership or membership.status != "active":
        logger.warning(
            f"Cross-tenant access rejected: user={user.id} tried accessing tenant={target_tenant_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to the requested workspace was denied.",
        )

    # 3. Retrieve tenant entity
    tenant = await session.get(Tenant, target_tenant_id)
    if not tenant or tenant.is_deleted or tenant.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The requested workspace is inactive or has been archived.",
        )

    # 4. Resolve roles and permissions
    permissions = await get_user_permissions_in_tenant(session, user.id, tenant.id)
    roles = {r.name for r in membership.roles}
    if membership.is_owner:
        roles.add("owner")

    # 5. Set task-local context
    current_tenant_id_ctx.set(tenant.id)
    current_permissions_ctx.set(permissions)
    current_roles_ctx.set(roles)

    # 6. Apply database-level tenant isolation
    await set_db_tenant_context(session, tenant.id, user_id=user.id)

    return TenantContext(
        user=user,
        tenant=tenant,
        membership=membership,
        roles=roles,
        permissions=permissions,
        session_id=session_id,
    )


def require_permission(permission: str) -> Callable:
    """Enforce granular RBAC permission token (deny-by-default).

    Args:
        permission: Standard permission token, e.g. 'members:invite'.

    Returns:
        FastAPI dependency callable returning the active TenantContext.
    """

    async def _dependency(
        context: TenantContext = Depends(get_current_tenant_context),
    ) -> TenantContext:
        if "owner" not in context.roles and permission not in context.permissions:
            logger.warning(
                f"RBAC access denied: user={context.user.id} lacks '{permission}' in tenant={context.tenant.id}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: You do not possess the required permission '{permission}'.",
            )
        return context

    return _dependency


def require_role(role_name: str) -> Callable:
    """Enforce minimum role requirement within active tenant.

    Args:
        role_name: Required role name (e.g. 'owner', 'admin').

    Returns:
        FastAPI dependency callable returning the active TenantContext.
    """

    async def _dependency(
        context: TenantContext = Depends(get_current_tenant_context),
    ) -> TenantContext:
        if role_name not in context.roles:
            logger.warning(
                f"Role access denied: user={context.user.id} lacks role '{role_name}' in tenant={context.tenant.id}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Action requires '{role_name}' role in this workspace.",
            )
        return context

    return _dependency


class RateLimiter:
    """Redis-backed sliding-window rate limiter dependency.

    Protects sensitive auth endpoints against brute force and credential stuffing.
    Validates reverse proxy trustworthiness before evaluating forwarded headers,
    and enforces fail-closed security for sensitive authentication boundaries.
    """

    def __init__(
        self,
        max_requests: int = 5,
        window_seconds: int = 60,
        prefix: str = "auth",
        fail_closed: bool = True,
    ):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.prefix = prefix
        self.fail_closed = fail_closed

    async def __call__(self, request: Request) -> None:
        if settings.is_testing and not getattr(
            request.app.state, "enable_rate_limiting_tests", False
        ):
            return

        # 1. Resolve peer client IP securely without trusting arbitrary client headers
        peer_host = request.client.host if request.client else "127.0.0.1"

        trusted_proxies = set(settings.TRUSTED_PROXIES)
        forwarded_for = request.headers.get("X-Forwarded-For")

        if peer_host in trusted_proxies and forwarded_for:
            # Proxy is verified. Use client address preceding the trusted reverse proxy chain
            client_ip = forwarded_for.split(",")[0].strip()
        else:
            # Untrusted caller or direct connection: strictly ignore X-Forwarded-For to prevent spoofing
            client_ip = peer_host

        key = f"ratelimit:{self.prefix}:{client_ip}"
        now = time.time()
        clear_before = now - self.window_seconds

        try:
            redis_client = await get_redis()
            # Sliding window via Redis sorted set
            pipe = redis_client.pipeline()
            pipe.zremrangebyscore(key, 0, clear_before)
            pipe.zadd(key, {f"{now}:{uuid.uuid4().hex[:8]}": now})
            pipe.zcard(key)
            pipe.expire(key, self.window_seconds)
            results = await pipe.execute()

            request_count = results[2]
            if request_count > self.max_requests:
                logger.warning(
                    f"Rate limit exceeded: prefix={self.prefix}, ip={client_ip}, count={request_count}"
                )
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please slow down and try again later.",
                    headers={"Retry-After": str(self.window_seconds)},
                )
        except HTTPException:
            raise
        except Exception as exc:
            if self.fail_closed and getattr(settings, 'is_production', False):
                logger.error(f"Rate limiting service failure in security boundary: {exc}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Authentication security rate limiting service is temporarily unavailable. Please retry shortly.",
                ) from exc
            else:
                logger.warning(f"Rate limiting degraded due to Redis error: {exc}")
