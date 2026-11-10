"""WealthOS Multi-Tenant Workspaces & RBAC REST API Endpoints.

Implements workspace lifecycle, member management, invitation workflows,
role resolution, ownership transfer, and audit log inspection.
"""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db_session
from app.core.logging import correlation_id_ctx, get_logger
from app.core.security import (
    TenantContext,
    get_current_user,
    require_permission,
    require_role,
)
from app.domains.audit.models import SecurityAuditLog
from app.domains.audit.service import record_security_event
from app.domains.identity.models import User, UserCredential
from app.domains.identity.passwords import verify_password
from app.domains.identity.tokens import create_access_token
from app.domains.tenants.models import Tenant, TenantInvitation
from app.domains.tenants.schemas import (
    AcceptInvitationRequest,
    AuditLogResponse,
    CreateTenantRequest,
    InviteMemberRequest,
    RoleResponse,
    TenantDetailResponse,
    TenantInvitationResponse,
    TenantMemberResponse,
    TransferOwnershipRequest,
    UpdateMemberRequest,
    UpdateTenantRequest,
)
from app.domains.tenants.service import (
    TenantServiceError,
    accept_invitation,
    create_workspace,
    get_user_tenant_membership,
    invite_member,
    list_roles_with_permissions,
    list_tenant_members,
    list_user_tenants,
    remove_member,
    transfer_tenant_ownership,
    update_member_role_or_status,
)

logger = get_logger("wealthos.api.tenants")

router = APIRouter()


def _get_client_meta(request: Request) -> tuple[str | None, str | None, str | None]:
    """Extract client request metadata."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    ip_address = (
        forwarded_for.split(",")[0].strip()
        if forwarded_for
        else (request.client.host if request.client else None)
    )
    user_agent = request.headers.get("User-Agent")
    correlation_id = correlation_id_ctx.get()
    return ip_address, user_agent, correlation_id


# --------------------------------------------------------------------------
# Workspace Lifecycle Endpoints
# --------------------------------------------------------------------------


@router.get(
    "",
    response_model=dict[str, Any],
    summary="List workspaces for authenticated user",
)
async def list_workspaces(
    auth_data: tuple[User, uuid.UUID] = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """List all workspaces in which the authenticated user has an active membership."""
    user, _ = auth_data
    tenants = await list_user_tenants(session, user.id)
    return {
        "success": True,
        "data": tenants,
    }


@router.post(
    "",
    response_model=dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new workspace",
)
async def create_new_workspace(
    payload: CreateTenantRequest,
    request: Request,
    auth_data: tuple[User, uuid.UUID] = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Create a new collaborative household or organization workspace."""
    user, _ = auth_data
    ip, ua, cid = _get_client_meta(request)

    try:
        tenant = await create_workspace(
            session=session,
            user=user,
            name=payload.name,
            tenant_type=payload.tenant_type,
        )

        await record_security_event(
            session,
            event_type="workspace_created",
            status="success",
            user_id=user.id,
            tenant_id=tenant.id,
            ip_address=ip,
            user_agent=ua,
            correlation_id=cid,
            details={"name": tenant.name, "type": tenant.tenant_type},
        )

        return {
            "success": True,
            "data": TenantDetailResponse(
                id=tenant.id,
                name=tenant.name,
                slug=tenant.slug,
                tenant_type=tenant.tenant_type,
                status=tenant.status,
                role="owner",
                is_owner=True,
                created_at=tenant.created_at,
                member_count=1,
            ).model_dump(mode="json"),
        }
    except TenantServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get(
    "/{tenant_id}",
    response_model=dict[str, Any],
    summary="Get workspace details",
)
async def get_workspace(
    tenant_id: uuid.UUID,
    context: TenantContext = Depends(require_permission("tenant:read")),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Retrieve details of the active workspace. Validates tenant scope match."""
    if context.tenant.id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Scope mismatch: active tenant does not match requested tenant ID.",
        )

    members = await list_tenant_members(session, tenant_id)
    primary_role = (
        "owner"
        if context.membership.is_owner
        else (list(context.roles)[0] if context.roles else "member")
    )

    return {
        "success": True,
        "data": TenantDetailResponse(
            id=context.tenant.id,
            name=context.tenant.name,
            slug=context.tenant.slug,
            tenant_type=context.tenant.tenant_type,
            status=context.tenant.status,
            role=primary_role,
            is_owner=context.membership.is_owner,
            created_at=context.tenant.created_at,
            member_count=len(members),
        ).model_dump(mode="json"),
    }


@router.put(
    "/{tenant_id}",
    response_model=dict[str, Any],
    summary="Update workspace metadata or settings",
)
async def update_workspace(
    tenant_id: uuid.UUID,
    payload: UpdateTenantRequest,
    request: Request,
    context: TenantContext = Depends(require_permission("tenant:update")),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Update workspace name or preferences."""
    if context.tenant.id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Scope mismatch: active tenant does not match requested tenant ID.",
        )

    ip, ua, cid = _get_client_meta(request)

    if payload.name:
        context.tenant.name = payload.name.strip()
    if payload.settings is not None:
        context.tenant.settings = payload.settings

    await session.flush()

    await record_security_event(
        session,
        event_type="workspace_updated",
        status="success",
        user_id=context.user.id,
        tenant_id=tenant_id,
        ip_address=ip,
        user_agent=ua,
        correlation_id=cid,
        details={"name": context.tenant.name},
    )

    members = await list_tenant_members(session, tenant_id)
    primary_role = (
        "owner"
        if context.membership.is_owner
        else (list(context.roles)[0] if context.roles else "member")
    )

    return {
        "success": True,
        "data": TenantDetailResponse(
            id=context.tenant.id,
            name=context.tenant.name,
            slug=context.tenant.slug,
            tenant_type=context.tenant.tenant_type,
            status=context.tenant.status,
            role=primary_role,
            is_owner=context.membership.is_owner,
            created_at=context.tenant.created_at,
            member_count=len(members),
        ).model_dump(mode="json"),
    }


@router.post(
    "/{tenant_id}/switch",
    response_model=dict[str, Any],
    summary="Switch active workspace context",
)
async def switch_workspace(
    tenant_id: uuid.UUID,
    auth_data: tuple[User, uuid.UUID] = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Switch active workspace, returning a freshly scoped access JWT."""
    user, session_id = auth_data

    # Verify membership
    membership = await get_user_tenant_membership(session, user.id, tenant_id)
    if not membership or membership.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to requested workspace.",
        )

    tenant = await session.get(Tenant, tenant_id)
    if not tenant or tenant.is_deleted or tenant.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requested workspace is inactive or archived.",
        )

    # Issue new access JWT scoped to new tenant
    new_token = create_access_token(
        user_id=user.id,
        session_id=session_id,
        tenant_id=tenant.id,
    )

    primary_role = (
        "owner"
        if membership.is_owner
        else (membership.roles[0].name if membership.roles else "member")
    )

    return {
        "success": True,
        "data": {
            "access_token": new_token,
            "token_type": "Bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "active_tenant": {
                "id": str(tenant.id),
                "name": tenant.name,
                "slug": tenant.slug,
                "tenant_type": tenant.tenant_type,
                "role": primary_role,
                "is_owner": membership.is_owner,
            },
        },
    }


# --------------------------------------------------------------------------
# Member & Invitation Endpoints
# --------------------------------------------------------------------------


@router.get(
    "/{tenant_id}/members",
    response_model=dict[str, Any],
    summary="List workspace members",
)
async def get_members(
    tenant_id: uuid.UUID,
    context: TenantContext = Depends(require_permission("members:read")),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """List all members and their assigned roles in this workspace."""
    if context.tenant.id != tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Scope mismatch.")

    members = await list_tenant_members(session, tenant_id)
    return {
        "success": True,
        "data": [TenantMemberResponse(**m).model_dump(mode="json") for m in members],
    }


@router.post(
    "/{tenant_id}/invitations",
    response_model=dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Invite a collaborator to workspace",
)
async def create_invitation(
    tenant_id: uuid.UUID,
    payload: InviteMemberRequest,
    request: Request,
    context: TenantContext = Depends(require_permission("members:invite")),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Dispatch an invitation email to a prospective collaborator."""
    if context.tenant.id != tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Scope mismatch.")

    ip, ua, cid = _get_client_meta(request)

    try:
        invitation = await invite_member(
            session=session,
            tenant_id=tenant_id,
            inviter=context.user,
            email=payload.email,
            role_name=payload.role_name,
        )

        await record_security_event(
            session,
            event_type="member_invited",
            status="success",
            user_id=context.user.id,
            tenant_id=tenant_id,
            ip_address=ip,
            user_agent=ua,
            correlation_id=cid,
            details={"email": payload.email, "role": payload.role_name},
        )

        return {
            "success": True,
            "data": TenantInvitationResponse(
                id=invitation.id,
                tenant_id=invitation.tenant_id,
                email=invitation.email,
                role_name=payload.role_name,
                status=invitation.status,
                expires_at=invitation.expires_at,
                created_at=invitation.created_at,
            ).model_dump(mode="json"),
        }
    except TenantServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get(
    "/{tenant_id}/invitations",
    response_model=dict[str, Any],
    summary="List pending invitations",
)
async def list_invitations(
    tenant_id: uuid.UUID,
    context: TenantContext = Depends(require_permission("members:read")),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Retrieve all pending invitations dispatched from this workspace."""
    if context.tenant.id != tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Scope mismatch.")

    stmt = (
        select(TenantInvitation)
        .where(
            TenantInvitation.tenant_id == tenant_id,
            TenantInvitation.status == "pending",
        )
        .order_by(desc(TenantInvitation.created_at))
    )
    result = await session.execute(stmt)
    invitations = result.scalars().all()

    invitation_responses = []
    for inv in invitations:
        invitation_responses.append(
            TenantInvitationResponse(
                id=inv.id,
                tenant_id=inv.tenant_id,
                email=inv.email,
                role_name="member",
                status=inv.status,
                expires_at=inv.expires_at,
                created_at=inv.created_at,
            ).model_dump(mode="json")
        )

    return {
        "success": True,
        "data": invitation_responses,
    }


@router.delete(
    "/{tenant_id}/invitations/{invitation_id}",
    response_model=dict[str, Any],
    summary="Revoke pending invitation",
)
async def revoke_invitation(
    tenant_id: uuid.UUID,
    invitation_id: uuid.UUID,
    context: TenantContext = Depends(require_permission("members:invite")),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Revoke an outstanding workspace invitation."""
    if context.tenant.id != tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Scope mismatch.")

    inv = await session.get(TenantInvitation, invitation_id)
    if not inv or inv.tenant_id != tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found.")

    inv.status = "revoked"
    return {
        "success": True,
        "message": "Invitation revoked successfully.",
    }


@router.post(
    "/invitations/accept",
    response_model=dict[str, Any],
    summary="Accept workspace invitation",
)
async def accept_tenant_invitation(
    payload: AcceptInvitationRequest,
    request: Request,
    auth_data: tuple[User, uuid.UUID] = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Accept an invitation token to join a workspace."""
    user, _ = auth_data
    ip, ua, cid = _get_client_meta(request)

    try:
        membership = await accept_invitation(
            session=session,
            user=user,
            raw_token=payload.token,
        )

        tenant = await session.get(Tenant, membership.tenant_id)

        await record_security_event(
            session,
            event_type="invitation_accepted",
            status="success",
            user_id=user.id,
            tenant_id=membership.tenant_id,
            ip_address=ip,
            user_agent=ua,
            correlation_id=cid,
        )

        return {
            "success": True,
            "message": f"Successfully joined workspace {tenant.name if tenant else ''}.",
            "data": {
                "tenant_id": membership.tenant_id,
                "role": "member",
            },
        }
    except TenantServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.put(
    "/{tenant_id}/members/{membership_id}",
    response_model=dict[str, Any],
    summary="Update member role or status",
)
async def modify_member(
    tenant_id: uuid.UUID,
    membership_id: uuid.UUID,
    payload: UpdateMemberRequest,
    request: Request,
    context: TenantContext = Depends(require_permission("members:manage")),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Modify workspace member status or role assignment."""
    if context.tenant.id != tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Scope mismatch.")

    ip, ua, cid = _get_client_meta(request)

    try:
        updated_mem = await update_member_role_or_status(
            session=session,
            tenant_id=tenant_id,
            acting_user_id=context.user.id,
            membership_id=membership_id,
            role_name=payload.role_name,
            status=payload.status,
        )

        await record_security_event(
            session,
            event_type="member_updated",
            status="success",
            user_id=context.user.id,
            tenant_id=tenant_id,
            ip_address=ip,
            user_agent=ua,
            correlation_id=cid,
            details={
                "membership_id": str(membership_id),
                "role": payload.role_name,
                "status": payload.status,
            },
        )

        return {
            "success": True,
            "message": "Member updated successfully.",
            "data": {"id": updated_mem.id, "status": updated_mem.status},
        }
    except TenantServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.delete(
    "/{tenant_id}/members/{membership_id}",
    response_model=dict[str, Any],
    summary="Remove collaborator from workspace",
)
async def delete_member(
    tenant_id: uuid.UUID,
    membership_id: uuid.UUID,
    request: Request,
    context: TenantContext = Depends(require_permission("members:manage")),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Revoke a member's workspace access."""
    if context.tenant.id != tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Scope mismatch.")

    ip, ua, cid = _get_client_meta(request)

    try:
        await remove_member(
            session=session,
            tenant_id=tenant_id,
            acting_user_id=context.user.id,
            membership_id=membership_id,
        )

        await record_security_event(
            session,
            event_type="member_removed",
            status="success",
            user_id=context.user.id,
            tenant_id=tenant_id,
            ip_address=ip,
            user_agent=ua,
            correlation_id=cid,
            details={"membership_id": str(membership_id)},
        )

        return {
            "success": True,
            "message": "Member removed successfully.",
        }
    except TenantServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.post(
    "/{tenant_id}/transfer-ownership",
    response_model=dict[str, Any],
    summary="Transfer workspace ownership",
)
async def transfer_ownership(
    tenant_id: uuid.UUID,
    payload: TransferOwnershipRequest,
    request: Request,
    context: TenantContext = Depends(require_role("owner")),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Transfer workspace ownership to another active member. Requires password confirmation."""
    if context.tenant.id != tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Scope mismatch.")

    ip, ua, cid = _get_client_meta(request)

    # Re-authenticate owner password
    cred_stmt = select(UserCredential).where(UserCredential.user_id == context.user.id)
    cred = (await session.execute(cred_stmt)).scalar_one_or_none()
    if not cred or not verify_password(payload.current_password, cred.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password verification failed. Ownership transfer rejected.",
        )

    try:
        await transfer_tenant_ownership(
            session=session,
            tenant_id=tenant_id,
            current_owner_id=context.user.id,
            target_user_id=payload.target_user_id,
        )

        await record_security_event(
            session,
            event_type="ownership_transferred",
            status="success",
            user_id=context.user.id,
            tenant_id=tenant_id,
            ip_address=ip,
            user_agent=ua,
            correlation_id=cid,
            details={"new_owner_id": str(payload.target_user_id)},
        )

        return {
            "success": True,
            "message": "Workspace ownership transferred successfully.",
        }
    except TenantServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


# --------------------------------------------------------------------------
# Roles & Audit Log Inspection Endpoints
# --------------------------------------------------------------------------


@router.get(
    "/{tenant_id}/roles",
    response_model=dict[str, Any],
    summary="List available roles and permissions",
)
async def get_roles(
    tenant_id: uuid.UUID,
    context: TenantContext = Depends(require_permission("roles:read")),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Retrieve system roles and custom tenant roles along with permission tokens."""
    if context.tenant.id != tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Scope mismatch.")

    roles = await list_roles_with_permissions(session, tenant_id)
    return {
        "success": True,
        "data": [RoleResponse(**r).model_dump(mode="json") for r in roles],
    }


@router.get(
    "/{tenant_id}/audit-logs",
    response_model=dict[str, Any],
    summary="Retrieve tenant security audit logs",
)
async def get_audit_logs(
    tenant_id: uuid.UUID,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    context: TenantContext = Depends(require_permission("audit:read")),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Retrieve immutable audit trail scoped strictly to this workspace."""
    if context.tenant.id != tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Scope mismatch.")

    stmt = (
        select(SecurityAuditLog)
        .where(SecurityAuditLog.tenant_id == tenant_id)
        .order_by(desc(SecurityAuditLog.created_at))
        .offset(skip)
        .limit(limit)
    )
    result = await session.execute(stmt)
    logs = result.scalars().all()

    return {
        "success": True,
        "data": [
            AuditLogResponse(
                id=log.id,
                tenant_id=log.tenant_id,
                user_id=log.user_id,
                event_type=log.event_type,
                status=log.status,
                ip_address=log.ip_address,
                user_agent=log.user_agent,
                correlation_id=log.correlation_id,
                details=log.details,
                created_at=log.created_at,
            ).model_dump(mode="json")
            for log in logs
        ],
    }
