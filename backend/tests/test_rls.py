"""Mandatory Release Gate: Direct PostgreSQL Row-Level Security (RLS) Isolation Tests.

Empirically verifies in live PostgreSQL that:
1. Application role `wealthos_app` has NOSUPERUSER and NOBYPASSRLS privileges.
2. Tenant-scoped tables enforce FORCE ROW LEVEL SECURITY.
3. Cross-tenant SELECT, UPDATE, DELETE queries return 0 rows at the database engine level.
4. Cross-tenant INSERT queries are rejected with RLS policy violations.
5. Missing tenant context denies all access (fail-closed).
6. Connection pool state reset cleanses transaction-local settings preventing leakage.
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenant_context import reset_db_session_state, set_db_tenant_context
from app.domains.identity.crypto import hash_token


@pytest.mark.asyncio
async def test_application_role_security_attributes(db_session: AsyncSession):
    """Verify that runtime application role cannot bypass Row-Level Security."""
    result = await db_session.execute(
        text(
            """
            SELECT rolname, rolsuper, rolbypassrls
            FROM pg_roles
            WHERE rolname = current_user;
            """
        )
    )
    row = result.first()
    assert row is not None
    current_role, is_superuser, bypass_rls = row
    assert current_role == "wealthos_app", f"Tests must connect as wealthos_app, got {current_role}"
    assert is_superuser is False, "wealthos_app must have NOSUPERUSER"
    assert bypass_rls is False, "wealthos_app must have NOBYPASSRLS"


@pytest.mark.asyncio
async def test_tenant_tables_have_rls_and_force_enabled(db_session: AsyncSession):
    """Verify that all tenant-owned and audit tables have rowsecurity and forcerowsecurity enabled."""
    expected_tables = {
        "tenant_memberships",
        "membership_roles",
        "tenant_invitations",
        "roles",
        "tenants",
        "security_audit_logs",
        "system_audit_logs",
    }

    result = await db_session.execute(
        text(
            """
            SELECT relname, relrowsecurity, relforcerowsecurity
            FROM pg_class
            WHERE relname = ANY(:tables) AND relkind = 'r';
            """
        ),
        {"tables": list(expected_tables)},
    )
    rows = result.fetchall()
    found_tables = {}
    for name, rls, force_rls in rows:
        found_tables[name] = (rls, force_rls)

    for tbl in expected_tables:
        assert tbl in found_tables, f"Table {tbl} not found in pg_class"
        rls, force_rls = found_tables[tbl]
        assert rls is True, f"Table {tbl} does not have relrowsecurity=True"
        assert force_rls is True, f"Table {tbl} does not have relforcerowsecurity=True"


@pytest.mark.asyncio
async def test_missing_tenant_context_denies_access_fail_closed(
    db_session: AsyncSession, test_user_factory
):
    """Verify fail-closed behavior: without app.current_tenant_id and app.current_user_id, zero rows are accessible."""
    # Create valid user and workspace
    await test_user_factory(
        email="failclosed.rls@example.com",
        password="FailClosed#2026",
    )

    # Ensure transaction context is completely cleared
    await reset_db_session_state(db_session)

    # Query tenant_memberships with no context
    memberships = (
        await db_session.execute(text("SELECT count(*) FROM tenant_memberships;"))
    ).scalar()
    assert memberships == 0, "Missing context must return 0 tenant_memberships"

    # Query tenant_invitations with no context
    invitations = (
        await db_session.execute(text("SELECT count(*) FROM tenant_invitations;"))
    ).scalar()
    assert invitations == 0, "Missing context must return 0 tenant_invitations"

    # Query audit logs with no context
    audits = (await db_session.execute(text("SELECT count(*) FROM security_audit_logs;"))).scalar()
    assert audits == 0, "Missing context must return 0 security_audit_logs"


@pytest.mark.asyncio
async def test_cross_tenant_select_rejected_at_engine_level(
    db_session: AsyncSession, test_user_factory
):
    """Verify that Tenant A's connection cannot SELECT Tenant B's rows via raw SQL."""
    user_a, tenant_a, _ = await test_user_factory(
        email="rls.tenant.a@example.com",
        password="PasswordA#2026",
    )
    user_b, tenant_b, _ = await test_user_factory(
        email="rls.tenant.b@example.com",
        password="PasswordB#2026",
    )

    # Switch session context to Tenant A
    await set_db_tenant_context(db_session, tenant_a.id, user_a.id)

    # 1. Tenant A querying memberships of Tenant B
    b_memberships = (
        await db_session.execute(
            text("SELECT id FROM tenant_memberships WHERE tenant_id = :b_id;"),
            {"b_id": str(tenant_b.id)},
        )
    ).fetchall()
    assert len(b_memberships) == 0, "Tenant A cannot SELECT Tenant B memberships"

    # 2. Tenant A querying tenant record of Tenant B
    b_tenants = (
        await db_session.execute(
            text("SELECT id FROM tenants WHERE id = :b_id;"),
            {"b_id": str(tenant_b.id)},
        )
    ).fetchall()
    assert len(b_tenants) == 0, "Tenant A cannot SELECT Tenant B tenant record"


@pytest.mark.asyncio
async def test_cross_tenant_mutation_rejected_at_engine_level(
    db_session: AsyncSession, test_user_factory
):
    """Verify that Tenant A cannot UPDATE, DELETE, or INSERT Tenant B records."""
    user_a, tenant_a, _ = await test_user_factory(
        email="mutate.tenant.a@example.com",
        password="PasswordA#2026",
    )
    user_b, tenant_b, _ = await test_user_factory(
        email="mutate.tenant.b@example.com",
        password="PasswordB#2026",
    )

    # Bind session context to Tenant A
    await set_db_tenant_context(db_session, tenant_a.id, user_a.id)

    # 1. UPDATE Tenant B membership -> must affect 0 rows
    update_res = await db_session.execute(
        text("UPDATE tenant_memberships SET status = 'suspended' WHERE tenant_id = :b_id;"),
        {"b_id": str(tenant_b.id)},
    )
    assert update_res.rowcount == 0, "Cross-tenant UPDATE must affect 0 rows under RLS"

    # 2. DELETE Tenant B membership -> must affect 0 rows
    delete_res = await db_session.execute(
        text("DELETE FROM tenant_memberships WHERE tenant_id = :b_id;"),
        {"b_id": str(tenant_b.id)},
    )
    assert delete_res.rowcount == 0, "Cross-tenant DELETE must affect 0 rows under RLS"

    # 3. INSERT invitation for Tenant B -> must fail PostgreSQL RLS WITH CHECK policy
    role_res = await db_session.execute(
        text("SELECT id FROM roles WHERE name = 'member' AND is_system_role = true LIMIT 1;")
    )
    role_id = role_res.scalar_one()

    with pytest.raises(ProgrammingError) as exc_info:
        await db_session.execute(
            text(
                """
                INSERT INTO tenant_invitations (
                    id, tenant_id, inviter_id, role_id, email, token_hash, status, expires_at, created_at
                ) VALUES (
                    :id, :tenant_id, :inviter_id, :role_id, :email, :token_hash, :status, :expires_at, now()
                );
                """
            ),
            {
                "id": str(uuid.uuid4()),
                "tenant_id": str(tenant_b.id),  # Attacker attempts to insert into Tenant B
                "inviter_id": str(user_a.id),
                "role_id": str(role_id),
                "email": "infiltrator@example.com",
                "token_hash": hash_token("random_token_123"),
                "status": "pending",
                "expires_at": datetime.now(UTC) + timedelta(days=7),
            },
        )
        await db_session.flush()

    assert "violates row-level security policy" in str(exc_info.value).lower()
    await db_session.rollback()


@pytest.mark.asyncio
async def test_connection_pool_tenant_context_sanitization(db_session: AsyncSession):
    """Verify reset_db_session_state completely clears tenant and user variables."""
    dummy_tenant_id = uuid.uuid4()
    dummy_user_id = uuid.uuid4()

    # Apply context
    await set_db_tenant_context(db_session, dummy_tenant_id, dummy_user_id)

    # Verify settings are present in session
    t_val = (
        await db_session.execute(text("SELECT current_setting('app.current_tenant_id', true);"))
    ).scalar()
    u_val = (
        await db_session.execute(text("SELECT current_setting('app.current_user_id', true);"))
    ).scalar()
    assert t_val == str(dummy_tenant_id)
    assert u_val == str(dummy_user_id)

    # Sanitize session before returning to pool
    await reset_db_session_state(db_session)

    # Verify settings are cleared
    t_val_after = (
        await db_session.execute(text("SELECT current_setting('app.current_tenant_id', true);"))
    ).scalar()
    u_val_after = (
        await db_session.execute(text("SELECT current_setting('app.current_user_id', true);"))
    ).scalar()
    assert t_val_after in ("", None)
    assert u_val_after in ("", None)
