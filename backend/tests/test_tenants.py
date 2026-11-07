"""Tests for Multi-Tenant Workspace Lifecycle, Invitations, and Member Management."""

import pytest
from httpx import AsyncClient

from app.domains.identity.email_service import get_email_service


@pytest.mark.asyncio
async def test_list_and_create_workspaces(client: AsyncClient, test_user_factory):
    """Test listing user workspaces and provisioning collaborative household/org workspaces."""
    user, personal_tenant, token = await test_user_factory(
        email="workspace.creator@example.com",
        password="WorkspacePassword#2026",
    )
    headers = {"Authorization": f"Bearer {token}"}

    # 1. List workspaces (should have personal workspace initially)
    list_res = await client.get("/api/v1/tenants", headers=headers)
    assert list_res.status_code == 200
    tenants = list_res.json()["data"]
    assert len(tenants) == 1
    assert tenants[0]["id"] == str(personal_tenant.id)
    assert tenants[0]["tenant_type"] == "personal"

    # 2. Create collaborative household workspace
    create_res = await client.post(
        "/api/v1/tenants",
        json={"name": "The Connor Family", "tenant_type": "household"},
        headers=headers,
    )
    assert create_res.status_code == 201
    created = create_res.json()["data"]
    assert created["name"] == "The Connor Family"
    assert created["tenant_type"] == "household"
    assert created["role"] == "owner"
    assert created["is_owner"] is True

    # 3. List workspaces again (should now have 2)
    list_res2 = await client.get("/api/v1/tenants", headers=headers)
    assert list_res2.status_code == 200
    assert len(list_res2.json()["data"]) == 2


@pytest.mark.asyncio
async def test_workspace_metadata_and_update(client: AsyncClient, test_user_factory):
    """Test reading workspace details and updating preferences."""
    user, personal_tenant, token = await test_user_factory(
        email="workspace.update@example.com",
        password="WorkspacePassword#2026",
    )
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": str(personal_tenant.id),
    }

    # 1. Get workspace details
    detail_res = await client.get(f"/api/v1/tenants/{personal_tenant.id}", headers=headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["data"]["id"] == str(personal_tenant.id)

    # 2. Update workspace name and settings
    update_res = await client.put(
        f"/api/v1/tenants/{personal_tenant.id}",
        json={"name": "Sarah's Primary Vault", "settings": {"currency": "USD"}},
        headers=headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["data"]["name"] == "Sarah's Primary Vault"


@pytest.mark.asyncio
async def test_switch_workspace_context(client: AsyncClient, test_user_factory):
    """Test switching active workspace returns access token with updated tenant context."""
    user, personal_tenant, token = await test_user_factory(
        email="switch.user@example.com",
        password="SwitchPassword#2026",
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Create second workspace
    create_res = await client.post(
        "/api/v1/tenants",
        json={"name": "Second Workspace", "tenant_type": "household"},
        headers=headers,
    )
    second_id = create_res.json()["data"]["id"]

    # Switch active workspace
    switch_res = await client.post(f"/api/v1/tenants/{second_id}/switch", headers=headers)
    assert switch_res.status_code == 200
    switch_data = switch_res.json()["data"]
    new_token = switch_data["access_token"]
    assert switch_data["active_tenant"]["id"] == second_id

    # Verify request with new token resolves second workspace
    new_headers = {"Authorization": f"Bearer {new_token}"}
    me_res = await client.get("/api/v1/auth/me", headers=new_headers)
    assert me_res.status_code == 200


@pytest.mark.asyncio
async def test_invitation_lifecycle(client: AsyncClient, test_user_factory):
    """Test full invitation flow: invite member, list pending, accept with token."""
    # User A (Inviter)
    user_a, tenant_a, token_a = await test_user_factory(
        email="inviter@example.com",
        password="InviterPassword#2026",
    )
    # User B (Invitee)
    user_b, _, token_b = await test_user_factory(
        email="invitee@example.com",
        password="InviteePassword#2026",
    )

    headers_a = {
        "Authorization": f"Bearer {token_a}",
        "X-Tenant-ID": str(tenant_a.id),
    }

    # 1. Dispatch invitation
    invite_res = await client.post(
        f"/api/v1/tenants/{tenant_a.id}/invitations",
        json={"email": "invitee@example.com", "role_name": "member"},
        headers=headers_a,
    )
    assert invite_res.status_code == 201
    inv_data = invite_res.json()["data"]
    assert inv_data["email"] == "invitee@example.com"
    assert inv_data["id"] is not None

    # 2. List pending invitations
    pending_res = await client.get(
        f"/api/v1/tenants/{tenant_a.id}/invitations",
        headers=headers_a,
    )
    assert pending_res.status_code == 200
    assert len(pending_res.json()["data"]) >= 1

    # 3. Extract invitation token from outbox
    outbox = get_email_service().get_outbox()
    invite_msg = next((m for m in outbox if m["to"] == "invitee@example.com"), None)
    assert invite_msg is not None
    inv_token = invite_msg["token"]

    # 4. User B accepts invitation
    headers_b = {"Authorization": f"Bearer {token_b}"}
    accept_res = await client.post(
        "/api/v1/tenants/invitations/accept",
        json={"token": inv_token},
        headers=headers_b,
    )
    assert accept_res.status_code == 200

    # 5. Verify User B can now access Tenant A
    members_res = await client.get(
        f"/api/v1/tenants/{tenant_a.id}/members",
        headers=headers_a,
    )
    assert members_res.status_code == 200
    member_emails = [m["email"] for m in members_res.json()["data"]]
    assert "invitee@example.com" in member_emails


@pytest.mark.asyncio
async def test_member_role_update_and_removal(client: AsyncClient, test_user_factory):
    """Test updating collaborator role/status and revoking membership."""
    user_owner, tenant, token_owner = await test_user_factory(
        email="vault.owner@example.com",
        password="OwnerPassword#2026",
    )
    user_collab, _, token_collab = await test_user_factory(
        email="collaborator@example.com",
        password="CollabPassword#2026",
    )

    headers_owner = {
        "Authorization": f"Bearer {token_owner}",
        "X-Tenant-ID": str(tenant.id),
    }

    # Invite and accept collaborator
    await client.post(
        f"/api/v1/tenants/{tenant.id}/invitations",
        json={"email": "collaborator@example.com", "role_name": "viewer"},
        headers=headers_owner,
    )
    outbox = get_email_service().get_outbox()
    inv_msg = next(m for m in outbox if m["to"] == "collaborator@example.com")

    await client.post(
        "/api/v1/tenants/invitations/accept",
        json={"token": inv_msg["token"]},
        headers={"Authorization": f"Bearer {token_collab}"},
    )

    # Get members list to find membership ID
    members_res = await client.get(f"/api/v1/tenants/{tenant.id}/members", headers=headers_owner)
    collab_mem = next(
        m for m in members_res.json()["data"] if m["email"] == "collaborator@example.com"
    )
    membership_id = collab_mem["id"]

    # 1. Update role from viewer to admin
    role_res = await client.put(
        f"/api/v1/tenants/{tenant.id}/members/{membership_id}",
        json={"role_name": "admin"},
        headers=headers_owner,
    )
    assert role_res.status_code == 200

    # 2. Remove member from workspace
    del_res = await client.delete(
        f"/api/v1/tenants/{tenant.id}/members/{membership_id}",
        headers=headers_owner,
    )
    assert del_res.status_code == 200

    # 3. Verify member no longer has active access
    headers_collab = {
        "Authorization": f"Bearer {token_collab}",
        "X-Tenant-ID": str(tenant.id),
    }
    blocked_res = await client.get(f"/api/v1/tenants/{tenant.id}", headers=headers_collab)
    assert blocked_res.status_code == 403


@pytest.mark.asyncio
async def test_transfer_workspace_ownership(client: AsyncClient, test_user_factory):
    """Test transferring workspace ownership requiring current owner password verification."""
    owner, tenant, token_owner = await test_user_factory(
        email="original.owner@example.com",
        password="OriginalOwnerPassword#2026",
    )
    successor, _, token_succ = await test_user_factory(
        email="successor.owner@example.com",
        password="SuccessorPassword#2026",
    )

    headers_owner = {
        "Authorization": f"Bearer {token_owner}",
        "X-Tenant-ID": str(tenant.id),
    }

    # Invite and accept successor
    await client.post(
        f"/api/v1/tenants/{tenant.id}/invitations",
        json={"email": "successor.owner@example.com", "role_name": "admin"},
        headers=headers_owner,
    )
    outbox = get_email_service().get_outbox()
    inv_msg = next(m for m in outbox if m["to"] == "successor.owner@example.com")

    await client.post(
        "/api/v1/tenants/invitations/accept",
        json={"token": inv_msg["token"]},
        headers={"Authorization": f"Bearer {token_succ}"},
    )

    # 1. Transfer ownership with incorrect password should be rejected
    bad_res = await client.post(
        f"/api/v1/tenants/{tenant.id}/transfer-ownership",
        json={
            "target_user_id": str(successor.id),
            "current_password": "WrongPassword!1",
        },
        headers=headers_owner,
    )
    assert bad_res.status_code == 401

    # 2. Transfer ownership with valid password
    good_res = await client.post(
        f"/api/v1/tenants/{tenant.id}/transfer-ownership",
        json={
            "target_user_id": str(successor.id),
            "current_password": "OriginalOwnerPassword#2026",
        },
        headers=headers_owner,
    )
    assert good_res.status_code == 200

    # 3. Verify successor is now owner in members list
    members_res = await client.get(f"/api/v1/tenants/{tenant.id}/members", headers=headers_owner)
    members = members_res.json()["data"]
    succ_mem = next(m for m in members if m["email"] == "successor.owner@example.com")
    orig_mem = next(m for m in members if m["email"] == "original.owner@example.com")

    assert succ_mem["is_owner"] is True
    assert orig_mem["is_owner"] is False
