"""Mandatory Release Gate: Cross-Tenant Isolation and Data Leakage Prevention Tests.

Mathematically and empirically verifies that Tenant A cannot access, query, mutate,
or infer Tenant B's data via REST API headers, SQL repositories, or connection pools.
"""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenant_context import (
    TenantScopedRepository,
    current_tenant_id_ctx,
    current_user_id_ctx,
    set_db_tenant_context,
)
from app.domains.tenants.models import TenantMembership


@pytest.mark.asyncio
async def test_rest_api_cross_tenant_access_denial(client: AsyncClient, test_user_factory):
    """MANDATORY RELEASE GATE: Prove User A cannot access Tenant B via X-Tenant-ID header spoofing."""
    user_a, tenant_a, token_a = await test_user_factory(
        email="tenant.a.owner@example.com",
        password="TenantAPassword#2026",
    )
    user_b, tenant_b, token_b = await test_user_factory(
        email="tenant.b.owner@example.com",
        password="TenantBPassword#2026",
    )

    # User A tries to access Tenant B by setting X-Tenant-ID: tenant_b.id
    spoofed_headers = {
        "Authorization": f"Bearer {token_a}",
        "X-Tenant-ID": str(tenant_b.id),
    }

    # 1. Workspace details access denied
    res_details = await client.get(f"/api/v1/tenants/{tenant_b.id}", headers=spoofed_headers)
    assert res_details.status_code == 403
    assert (
        "access to the requested workspace was denied"
        in res_details.json()["error"]["message"].lower()
    )

    # 2. Members list access denied
    res_members = await client.get(
        f"/api/v1/tenants/{tenant_b.id}/members", headers=spoofed_headers
    )
    assert res_members.status_code == 403

    # 3. Settings update denied
    res_update = await client.put(
        f"/api/v1/tenants/{tenant_b.id}",
        json={"name": "Tampered By Attacker"},
        headers=spoofed_headers,
    )
    assert res_update.status_code == 403

    # 4. Invitation creation denied
    res_invite = await client.post(
        f"/api/v1/tenants/{tenant_b.id}/invitations",
        json={"email": "attacker.collab@example.com", "role_name": "admin"},
        headers=spoofed_headers,
    )
    assert res_invite.status_code == 403

    # 5. Audit logs access denied
    res_audit = await client.get(
        f"/api/v1/tenants/{tenant_b.id}/audit-logs",
        headers=spoofed_headers,
    )
    assert res_audit.status_code == 403


@pytest.mark.asyncio
async def test_tenant_scoped_repository_enforces_partitioning(
    db_session: AsyncSession, test_user_factory
):
    """MANDATORY RELEASE GATE: Prove TenantScopedRepository queries are strictly isolated."""

    # Check TenantMembership isolation through query scoping
    user_a, tenant_a, _ = await test_user_factory(
        email="repo.a@example.com",
        password="RepoPassword#2026",
    )
    user_b, tenant_b, _ = await test_user_factory(
        email="repo.b@example.com",
        password="RepoPassword#2026",
    )

    repo_a = TenantScopedRepository(TenantMembership, db_session)
    repo_b = TenantScopedRepository(TenantMembership, db_session)

    # Under Tenant A context
    token_ta = current_tenant_id_ctx.set(tenant_a.id)
    token_ua = current_user_id_ctx.set(user_a.id)
    await set_db_tenant_context(db_session, tenant_a.id, user_a.id)

    records_a = await repo_a.list_all()
    assert len(records_a) >= 1
    for r in records_a:
        assert r.tenant_id == tenant_a.id
        assert r.tenant_id != tenant_b.id

    # Switch to Tenant B context
    current_tenant_id_ctx.set(tenant_b.id)
    current_user_id_ctx.set(user_b.id)
    await set_db_tenant_context(db_session, tenant_b.id, user_b.id)

    records_b = await repo_b.list_all()
    assert len(records_b) >= 1
    for r in records_b:
        assert r.tenant_id == tenant_b.id
        assert r.tenant_id != tenant_a.id

    # Attempt cross-tenant update by ID: Tenant B tries to modify Tenant A's membership
    a_membership_id = records_a[0].id
    tamper_success = await repo_b.update_by_id(a_membership_id, status="suspended")
    assert tamper_success is False, "Cross-tenant update must return False and affect 0 rows."

    # Attempt cross-tenant delete by ID: Tenant B tries to delete Tenant A's membership
    delete_success = await repo_b.delete_by_id(a_membership_id, soft=False)
    assert delete_success is False, "Cross-tenant delete must return False and affect 0 rows."

    # Reset context
    current_tenant_id_ctx.reset(token_ta)
    current_user_id_ctx.reset(token_ua)


@pytest.mark.asyncio
async def test_database_connection_session_context_and_sanitization(
    db_session: AsyncSession,
):
    """MANDATORY RELEASE GATE: Verify set_config binds app.current_tenant_id locally and clears upon commit."""
    tenant_id = uuid.uuid4()

    # 1. Apply tenant context to session
    await set_db_tenant_context(db_session, tenant_id)

    # 2. Verify setting in current transaction
    result = await db_session.execute(
        text("SELECT current_setting('app.current_tenant_id', true);")
    )
    setting_val = result.scalar()
    assert setting_val == str(tenant_id)

    # 3. Commit transaction (set_config with is_local=true expires)
    await db_session.commit()

    # 4. In next transaction on same connection, setting should be empty or null
    result_after = await db_session.execute(
        text("SELECT current_setting('app.current_tenant_id', true);")
    )
    setting_val_after = result_after.scalar()
    assert setting_val_after == "" or setting_val_after is None
