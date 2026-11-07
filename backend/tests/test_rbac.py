"""Comprehensive tests for Role-Based Access Control (RBAC) and Deny-by-Default Authorization."""

import pytest
from httpx import AsyncClient

from app.domains.identity.email_service import get_email_service


@pytest.mark.asyncio
async def test_system_roles_and_permissions_inventory(client: AsyncClient, test_user_factory):
    """Test that all 4 system roles (owner, admin, member, viewer) and 13 permission tokens are retrievable."""
    user, tenant, token = await test_user_factory(
        email="rbac.roles@example.com",
        password="RbacPassword#2026",
    )
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": str(tenant.id),
    }

    res = await client.get(f"/api/v1/tenants/{tenant.id}/roles", headers=headers)
    assert res.status_code == 200
    roles = res.json()["data"]
    role_names = {r["name"] for r in roles}
    assert {"owner", "admin", "member", "viewer"}.issubset(role_names)

    # Verify Owner permissions
    owner_role = next(r for r in roles if r["name"] == "owner")
    assert len(owner_role["permissions"]) >= 13
    assert "tenant:transfer" in owner_role["permissions"]
    assert "tenant:delete" in owner_role["permissions"]


@pytest.mark.asyncio
async def test_owner_vs_admin_vs_viewer_privileges(client: AsyncClient, test_user_factory):
    """Test RBAC enforcement: Admin can invite, Viewer is blocked with HTTP 403 (deny-by-default)."""
    # 1. Setup Owner
    owner, tenant, token_owner = await test_user_factory(
        email="vault.owner.rbac@example.com",
        password="OwnerPassword#2026",
    )
    headers_owner = {
        "Authorization": f"Bearer {token_owner}",
        "X-Tenant-ID": str(tenant.id),
    }

    # 2. Setup Admin Collaborator
    admin_user, _, token_admin = await test_user_factory(
        email="admin.user@example.com",
        password="AdminPassword#2026",
    )
    await client.post(
        f"/api/v1/tenants/{tenant.id}/invitations",
        json={"email": "admin.user@example.com", "role_name": "admin"},
        headers=headers_owner,
    )
    outbox = get_email_service().get_outbox()
    admin_inv = next(m for m in outbox if m["to"] == "admin.user@example.com")
    await client.post(
        "/api/v1/tenants/invitations/accept",
        json={"token": admin_inv["token"]},
        headers={"Authorization": f"Bearer {token_admin}"},
    )

    # 3. Setup Viewer Collaborator
    viewer_user, _, token_viewer = await test_user_factory(
        email="viewer.user@example.com",
        password="ViewerPassword#2026",
    )
    await client.post(
        f"/api/v1/tenants/{tenant.id}/invitations",
        json={"email": "viewer.user@example.com", "role_name": "viewer"},
        headers=headers_owner,
    )
    outbox = get_email_service().get_outbox()
    viewer_inv = next(m for m in reversed(outbox) if m["to"] == "viewer.user@example.com")
    await client.post(
        "/api/v1/tenants/invitations/accept",
        json={"token": viewer_inv["token"]},
        headers={"Authorization": f"Bearer {token_viewer}"},
    )

    headers_admin = {
        "Authorization": f"Bearer {token_admin}",
        "X-Tenant-ID": str(tenant.id),
    }
    headers_viewer = {
        "Authorization": f"Bearer {token_viewer}",
        "X-Tenant-ID": str(tenant.id),
    }

    # TEST A: Admin can invite new members
    admin_invite_res = await client.post(
        f"/api/v1/tenants/{tenant.id}/invitations",
        json={"email": "another@example.com", "role_name": "member"},
        headers=headers_admin,
    )
    assert admin_invite_res.status_code == 201

    # TEST B: Viewer CANNOT invite new members (Blocked: 403 Forbidden)
    viewer_invite_res = await client.post(
        f"/api/v1/tenants/{tenant.id}/invitations",
        json={"email": "hacker@example.com", "role_name": "member"},
        headers=headers_viewer,
    )
    assert viewer_invite_res.status_code == 403
    assert "forbidden" in viewer_invite_res.json()["error"]["message"].lower()

    # TEST C: Viewer CANNOT update workspace settings (Blocked: 403 Forbidden)
    viewer_update_res = await client.put(
        f"/api/v1/tenants/{tenant.id}",
        json={"name": "Hacked Name"},
        headers=headers_viewer,
    )
    assert viewer_update_res.status_code == 403

    # TEST D: Admin CANNOT transfer workspace ownership (Blocked: 403 Forbidden - requires owner)
    admin_transfer_res = await client.post(
        f"/api/v1/tenants/{tenant.id}/transfer-ownership",
        json={"target_user_id": str(admin_user.id), "current_password": "AdminPassword#2026"},
        headers=headers_admin,
    )
    assert admin_transfer_res.status_code == 403


@pytest.mark.asyncio
async def test_deny_by_default_missing_token_or_unassigned_permission(
    client: AsyncClient, test_user_factory
):
    """Test deny-by-default: anonymous requests or requests missing required claims are rejected."""
    user, tenant, _ = await test_user_factory(
        email="deny.default@example.com",
        password="DenyPassword#2026",
    )

    # 1. Unauthenticated request to protected endpoint
    res_no_auth = await client.get(f"/api/v1/tenants/{tenant.id}")
    assert res_no_auth.status_code == 401

    # 2. Bogus token
    res_bad_auth = await client.get(
        f"/api/v1/tenants/{tenant.id}",
        headers={"Authorization": "Bearer invalid.jwt.token"},
    )
    assert res_bad_auth.status_code == 401
