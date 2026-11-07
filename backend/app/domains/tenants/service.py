"""WealthOS Tenants, Memberships, Invitations, and RBAC Application Service.

Core business logic for workspace provisioning, membership lifecycle, invitations,
role assignment, and permission resolution.
"""

import re
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, desc, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.logging import get_logger
from app.core.tenant_context import set_db_tenant_context
from app.domains.identity.crypto import generate_secure_token, hash_token
from app.domains.identity.email_service import get_email_service
from app.domains.identity.models import User
from app.domains.tenants.models import (
    MembershipRole,
    Role,
    Tenant,
    TenantInvitation,
    TenantMembership,
)

logger = get_logger("wealthos.tenants")


class TenantServiceError(ValueError):
    """Raised when tenant business invariants or membership checks fail."""


def _generate_slug(name: str) -> str:
    """Generate a clean URL-safe unique slug from a workspace name."""
    clean = re.sub(r"[^a-zA-Z0-9\s-]", "", name).strip().lower()
    base_slug = re.sub(r"[\s-]+", "-", clean)[:80]
    suffix = uuid.uuid4().hex[:6]
    return f"{base_slug}-{suffix}" if base_slug else f"tenant-{suffix}"


async def get_system_role_by_name(session: AsyncSession, role_name: str) -> Role:
    """Retrieve built-in system role by name."""
    stmt = select(Role).where(Role.is_system_role == True, Role.name == role_name)  # noqa: E712
    result = await session.execute(stmt)
    role = result.scalar_one_or_none()
    if not role:
        raise TenantServiceError(f"System role '{role_name}' not found.")
    return role


async def create_personal_tenant(session: AsyncSession, user: User) -> Tenant:
    """Provision the default Personal Workspace for a newly registered user."""
    workspace_name = f"{user.first_name}'s Workspace"
    tenant = Tenant(
        id=uuid.uuid4(),
        name=workspace_name,
        slug=_generate_slug(workspace_name),
        tenant_type="personal",
        status="active",
        settings={"currency": "INR", "is_default": True},
    )
    session.add(tenant)
    await session.flush()

    # Set transaction-local context for RLS enforcement
    await set_db_tenant_context(session, tenant.id, user_id=user.id)

    # Retrieve 'owner' role
    owner_role = await get_system_role_by_name(session, "owner")

    membership = TenantMembership(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        user_id=user.id,
        status="active",
        is_owner=True,
    )
    session.add(membership)
    await session.flush()

    # Assign owner role
    session.add(MembershipRole(membership_id=membership.id, role_id=owner_role.id))
    logger.info(f"Created personal workspace {tenant.id} for user {user.id}")
    return tenant


async def create_workspace(
    session: AsyncSession,
    user: User,
    name: str,
    tenant_type: str = "household",
) -> Tenant:
    """Create a new collaborative household or organization workspace."""
    tenant = Tenant(
        id=uuid.uuid4(),
        name=name.strip(),
        slug=_generate_slug(name),
        tenant_type=tenant_type,
        status="active",
        settings={"currency": "INR"},
    )
    session.add(tenant)
    await session.flush()

    # Set transaction-local context for RLS enforcement
    await set_db_tenant_context(session, tenant.id, user_id=user.id)

    owner_role = await get_system_role_by_name(session, "owner")

    membership = TenantMembership(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        user_id=user.id,
        status="active",
        is_owner=True,
    )
    session.add(membership)
    await session.flush()

    session.add(MembershipRole(membership_id=membership.id, role_id=owner_role.id))
    logger.info(f"User {user.id} created workspace {tenant.id} ({name})")
    return tenant


async def list_user_tenants(session: AsyncSession, user_id: uuid.UUID) -> list[dict]:
    """Retrieve all active workspaces where the user holds an active membership."""
    stmt = (
        select(TenantMembership)
        .options(
            selectinload(TenantMembership.tenant),
            selectinload(TenantMembership.roles),
        )
        .where(
            TenantMembership.user_id == user_id,
            TenantMembership.status == "active",
        )
    )
    result = await session.execute(stmt)
    memberships = result.scalars().all()

    tenants_list = []
    for m in memberships:
        if m.tenant and not m.tenant.is_deleted and m.tenant.status == "active":
            primary_role = m.roles[0].name if m.roles else "member"
            tenants_list.append(
                {
                    "id": m.tenant.id,
                    "name": m.tenant.name,
                    "slug": m.tenant.slug,
                    "tenant_type": m.tenant.tenant_type,
                    "status": m.tenant.status,
                    "role": primary_role,
                    "is_owner": m.is_owner,
                    "joined_at": m.joined_at,
                }
            )
    return tenants_list


async def get_user_tenant_membership(
    session: AsyncSession,
    user_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> TenantMembership | None:
    """Retrieve active membership for user in specified tenant."""
    stmt = (
        select(TenantMembership)
        .options(
            selectinload(TenantMembership.tenant),
            selectinload(TenantMembership.roles).selectinload(Role.permissions),
        )
        .where(
            TenantMembership.user_id == user_id,
            TenantMembership.tenant_id == tenant_id,
            TenantMembership.status == "active",
        )
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_user_permissions_in_tenant(
    session: AsyncSession,
    user_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> set[str]:
    """Resolve the complete set of permission tokens held by user in specified tenant."""
    membership = await get_user_tenant_membership(session, user_id, tenant_id)
    if not membership:
        return set()

    permissions: set[str] = set()
    for role in membership.roles:
        for perm in role.permissions:
            permissions.add(perm.name)
    return permissions


async def list_tenant_members(session: AsyncSession, tenant_id: uuid.UUID) -> list[dict]:
    """List all members and their assigned roles in a tenant."""
    stmt = (
        select(TenantMembership)
        .options(
            selectinload(TenantMembership.user),
            selectinload(TenantMembership.roles),
        )
        .where(TenantMembership.tenant_id == tenant_id)
        .order_by(desc(TenantMembership.is_owner), TenantMembership.joined_at)
    )
    result = await session.execute(stmt)
    memberships = result.scalars().all()

    members = []
    for m in memberships:
        role_name = m.roles[0].name if m.roles else "member"
        members.append(
            {
                "id": m.id,
                "user_id": m.user_id,
                "email": m.user.email if m.user else "",
                "name": m.user.full_name if m.user else "",
                "role": role_name,
                "is_owner": m.is_owner,
                "status": m.status,
                "joined_at": m.joined_at,
            }
        )
    return members


async def invite_member(
    session: AsyncSession,
    tenant_id: uuid.UUID,
    inviter: User,
    email: str,
    role_name: str = "member",
) -> TenantInvitation:
    """Create and dispatch a workspace invitation."""
    clean_email = email.strip().lower()

    # Check if target is already an active member
    stmt = (
        select(TenantMembership)
        .join(User)
        .where(
            TenantMembership.tenant_id == tenant_id,
            User.email == clean_email,
            TenantMembership.status == "active",
        )
    )
    existing_mem = (await session.execute(stmt)).scalar_one_or_none()
    if existing_mem:
        raise TenantServiceError("User is already an active member of this workspace.")

    # Get target role
    role = await get_system_role_by_name(session, role_name)

    # Check tenant name
    tenant = await session.get(Tenant, tenant_id)
    if not tenant:
        raise TenantServiceError("Workspace not found.")

    raw_token = generate_secure_token(32)
    token_digest = hash_token(raw_token)
    expires_at = datetime.now(UTC) + timedelta(days=settings.INVITATION_TOKEN_EXPIRE_DAYS)

    invitation = TenantInvitation(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        inviter_id=inviter.id,
        role_id=role.id,
        email=clean_email,
        token_hash=token_digest,
        status="pending",
        expires_at=expires_at,
    )
    session.add(invitation)
    await session.flush()

    # Dispatch email
    email_service = get_email_service()
    await email_service.send_tenant_invitation(
        to_email=clean_email,
        tenant_name=tenant.name,
        token=raw_token,
        inviter_name=inviter.full_name,
    )
    logger.info(f"Dispatched invitation for {clean_email} to workspace {tenant_id}")
    return invitation


async def accept_invitation(
    session: AsyncSession,
    user: User,
    raw_token: str,
) -> TenantMembership:
    """Accept pending invitation and create workspace membership."""
    await session.execute(
        text("SELECT set_config('app.current_user_id', :uid, true)"),
        {"uid": str(user.id)},
    )
    token_digest = hash_token(raw_token.strip())

    stmt = select(TenantInvitation).where(
        TenantInvitation.token_hash == token_digest,
        TenantInvitation.status == "pending",
    )
    invitation = (await session.execute(stmt)).scalar_one_or_none()
    if not invitation:
        raise TenantServiceError("Invalid or expired invitation token.")

    if datetime.now(UTC) > invitation.expires_at:
        invitation.status = "expired"
        raise TenantServiceError("This invitation has expired.")

    # Check if user already has membership
    existing_mem = await get_user_tenant_membership(session, user.id, invitation.tenant_id)
    if existing_mem:
        invitation.status = "accepted"
        return existing_mem

    membership = TenantMembership(
        id=uuid.uuid4(),
        tenant_id=invitation.tenant_id,
        user_id=user.id,
        status="active",
        is_owner=False,
    )
    session.add(membership)
    await session.flush()

    session.add(MembershipRole(membership_id=membership.id, role_id=invitation.role_id))
    invitation.status = "accepted"
    logger.info(f"User {user.id} accepted invitation to tenant {invitation.tenant_id}")
    return membership


async def update_member_role_or_status(
    session: AsyncSession,
    tenant_id: uuid.UUID,
    acting_user_id: uuid.UUID,
    membership_id: uuid.UUID,
    role_name: str | None = None,
    status: str | None = None,
) -> TenantMembership:
    """Update workspace member role or status."""
    membership = await session.get(TenantMembership, membership_id)
    if not membership or membership.tenant_id != tenant_id:
        raise TenantServiceError("Member not found in this workspace.")

    if membership.is_owner:
        raise TenantServiceError("Workspace owner role and status cannot be modified here.")

    if membership.user_id == acting_user_id:
        raise TenantServiceError("You cannot modify your own membership role or status.")

    if role_name:
        role = await get_system_role_by_name(session, role_name)
        # Delete existing membership_roles and assign new
        await session.execute(
            delete(MembershipRole).where(MembershipRole.membership_id == membership.id)
        )
        session.add(MembershipRole(membership_id=membership.id, role_id=role.id))

    if status:
        membership.status = status

    membership.updated_at = datetime.now(UTC)
    logger.info(
        f"Updated member {membership_id} in tenant {tenant_id}: role={role_name}, status={status}"
    )
    return membership


async def remove_member(
    session: AsyncSession,
    tenant_id: uuid.UUID,
    acting_user_id: uuid.UUID,
    membership_id: uuid.UUID,
) -> None:
    """Remove member from workspace."""
    membership = await session.get(TenantMembership, membership_id)
    if not membership or membership.tenant_id != tenant_id:
        raise TenantServiceError("Member not found in this workspace.")

    if membership.is_owner:
        raise TenantServiceError("Workspace owner cannot be removed. Transfer ownership first.")

    membership.status = "revoked"
    await session.flush()
    logger.info(f"User {acting_user_id} revoked membership {membership_id} in tenant {tenant_id}")


async def transfer_tenant_ownership(
    session: AsyncSession,
    tenant_id: uuid.UUID,
    current_owner_id: uuid.UUID,
    target_user_id: uuid.UUID,
) -> None:
    """Safely transfer workspace ownership to another active member."""
    if current_owner_id == target_user_id:
        raise TenantServiceError("Target user is already the current owner.")

    current_owner_mem = await get_user_tenant_membership(session, current_owner_id, tenant_id)
    if not current_owner_mem or not current_owner_mem.is_owner:
        raise TenantServiceError("Only the current workspace owner can transfer ownership.")

    target_mem = await get_user_tenant_membership(session, target_user_id, tenant_id)
    if not target_mem or target_mem.status != "active":
        raise TenantServiceError("Target user must be an active member of this workspace.")

    owner_role = await get_system_role_by_name(session, "owner")
    admin_role = await get_system_role_by_name(session, "admin")

    # Demote current owner to admin
    current_owner_mem.is_owner = False
    await session.execute(
        delete(MembershipRole).where(MembershipRole.membership_id == current_owner_mem.id)
    )
    session.add(MembershipRole(membership_id=current_owner_mem.id, role_id=admin_role.id))

    # Promote target user to owner
    target_mem.is_owner = True
    await session.execute(
        delete(MembershipRole).where(MembershipRole.membership_id == target_mem.id)
    )
    session.add(MembershipRole(membership_id=target_mem.id, role_id=owner_role.id))

    logger.info(
        f"Transferred ownership of tenant {tenant_id} from {current_owner_id} to {target_user_id}"
    )


async def list_roles_with_permissions(
    session: AsyncSession,
    tenant_id: uuid.UUID,
) -> list[dict]:
    """Retrieve all available system roles and tenant-defined custom roles."""
    stmt = (
        select(Role)
        .options(selectinload(Role.permissions))
        .where((Role.is_system_role == True) | (Role.tenant_id == tenant_id))  # noqa: E712
        .order_by(Role.is_system_role.desc(), Role.name)
    )
    result = await session.execute(stmt)
    roles = result.scalars().all()

    return [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "is_system_role": r.is_system_role,
            "permissions": [p.name for p in r.permissions],
        }
        for r in roles
    ]
