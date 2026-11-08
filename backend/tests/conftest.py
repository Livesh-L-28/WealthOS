"""Pytest configuration and test fixtures for WealthOS Backend."""

import os
import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import pool, text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

# Ensure testing environment variables are active
os.environ["ENVIRONMENT"] = "testing"
os.environ["DEBUG"] = "true"
os.environ["LOG_LEVEL"] = "DEBUG"
os.environ["POSTGRES_DB"] = "wealthos_test"

from app.core.database import get_session_factory
from app.domains.identity.models import User
from app.domains.identity.passwords import hash_password
from app.domains.identity.tokens import create_access_token
from app.domains.tenants.models import Tenant
from app.domains.tenants.service import create_personal_tenant
from app.main import create_app

SYSTEM_PERMISSIONS = [
    ("tenant:read", "tenant", "View workspace metadata and plan"),
    ("tenant:update", "tenant", "Update workspace name and preferences"),
    ("tenant:delete", "tenant", "Archive or delete the workspace"),
    ("tenant:transfer", "tenant", "Transfer workspace ownership"),
    ("members:read", "members", "List workspace members and invitations"),
    ("members:invite", "members", "Invite new members to workspace"),
    ("members:manage", "members", "Update member roles, suspend or remove members"),
    ("roles:read", "roles", "View workspace roles and permissions"),
    ("roles:manage", "roles", "Create and modify custom roles"),
    ("security:read", "security", "View security settings and MFA status"),
    ("security:manage", "security", "Configure workspace security policies"),
    ("audit:read", "audit", "Inspect security audit logs"),
    ("audit:export", "audit", "Export security audit trail"),
]

SYSTEM_ROLES = [
    (
        "owner",
        "Workspace Owner with full administrative control",
        [p[0] for p in SYSTEM_PERMISSIONS],
    ),
    (
        "admin",
        "Workspace Administrator managing members, security, and roles",
        [
            "tenant:read",
            "tenant:update",
            "members:read",
            "members:invite",
            "members:manage",
            "roles:read",
            "roles:manage",
            "security:read",
            "security:manage",
            "audit:read",
            "audit:export",
        ],
    ),
    (
        "member",
        "Standard Workspace Member with read and collaborative access",
        ["tenant:read", "members:read"],
    ),
    (
        "viewer",
        "Read-Only Workspace Observer",
        ["tenant:read", "members:read"],
    ),
]


async def _ensure_rbac_seeded(conn) -> None:
    """Ensure built-in system permissions and roles exist."""
    res = await conn.execute(text("SELECT count(*) FROM roles WHERE is_system_role = true;"))
    count = res.scalar()
    if count >= 4:
        return

    # Seed permissions
    perm_id_map: dict[str, str] = {}
    for p_name, domain, desc in SYSTEM_PERMISSIONS:
        existing = await conn.execute(
            text("SELECT id FROM permissions WHERE name = :n"), {"n": p_name}
        )
        p_row = existing.first()
        if p_row:
            perm_id_map[p_name] = str(p_row[0])
        else:
            p_id = str(uuid.uuid4())
            perm_id_map[p_name] = p_id
            await conn.execute(
                text(
                    "INSERT INTO permissions (id, name, domain, description, created_at) VALUES (:id, :name, :domain, :desc, now())"
                ),
                {"id": p_id, "name": p_name, "domain": domain, "desc": desc},
            )

    # Seed roles & role_permissions
    for r_name, r_desc, role_perms in SYSTEM_ROLES:
        existing = await conn.execute(
            text("SELECT id FROM roles WHERE name = :n AND is_system_role = true"), {"n": r_name}
        )
        r_row = existing.first()
        if not r_row:
            r_id = str(uuid.uuid4())
            await conn.execute(
                text(
                    "INSERT INTO roles (id, tenant_id, name, description, is_system_role, created_at, updated_at) VALUES (:id, NULL, :name, :desc, true, now(), now())"
                ),
                {"id": r_id, "name": r_name, "desc": r_desc},
            )
            for p_name in role_perms:
                p_id = perm_id_map.get(p_name)
                if p_id:
                    await conn.execute(
                        text(
                            "INSERT INTO role_permissions (role_id, permission_id) VALUES (:rid, :pid) ON CONFLICT DO NOTHING"
                        ),
                        {"rid": r_id, "pid": p_id},
                    )


@pytest.fixture(scope="session")
def app():
    """Create test application instance."""
    return create_app()


_test_admin_engine: AsyncEngine | None = None


def get_test_admin_engine() -> AsyncEngine:
    global _test_admin_engine
    if _test_admin_engine is None:
        from app.core.config import settings

        _test_admin_engine = create_async_engine(
            settings.get_database_admin_url(),
            poolclass=pool.NullPool,
        )
    return _test_admin_engine


@pytest.fixture(autouse=True)
async def clean_database():
    """Clean test tables before each test execution, preserving system RBAC."""
    admin_engine = get_test_admin_engine()
    tables = [
        "provider_sync_cursors",
        "provider_connections",
        "provider_credentials",
        "provider_consents",
        "financial_providers",
        "notifications",
        "notification_preferences",
        "notification_events",
        "copilot_messages",
        "copilot_conversations",
        "budget_allocations",
        "budgets",
        "goal_contributions",
        "financial_goals",
        "forecast_runs",
        "passive_income_records",
        "investment_holding_lots",
        "reconciliation_sessions",
        "financial_documents",
        "assets",
        "liabilities",
        "financial_accounts",
        "reconciliation_records",
        "accounting_idempotency_records",
        "journal_lines",
        "journal_entries",
        "accounting_periods",
        "accounts",
        "security_audit_logs",
        "system_audit_logs",
        "tenant_invitations",
        "membership_roles",
        "tenant_memberships",
        "mfa_recovery_codes",
        "mfa_credentials",
        "refresh_tokens",
        "user_sessions",
        "password_reset_tokens",
        "email_verification_tokens",
        "user_credentials",
        "tenants",
        "users",
    ]
    async with admin_engine.begin() as conn:
        await conn.execute(text("SET LOCAL wealthos.allow_audit_cleanup = 'on';"))
        for tbl in tables:
            await conn.execute(text(f"DELETE FROM {tbl};"))
        await conn.execute(text("DELETE FROM roles WHERE is_system_role = false;"))
        await _ensure_rbac_seeded(conn)
    yield


_test_admin_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_test_admin_session_factory() -> async_sessionmaker[AsyncSession]:
    global _test_admin_session_factory
    if _test_admin_session_factory is None:
        admin_eng = get_test_admin_engine()
        _test_admin_session_factory = async_sessionmaker(
            bind=admin_eng,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    return _test_admin_session_factory


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide an isolated database session for testing using the application role."""
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@pytest.fixture
async def client(app) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def test_user_factory(db_session: AsyncSession):
    """Factory fixture for creating fully registered test users with workspaces."""

    async def _create_user(
        email: str = "testuser@example.com",
        password: str = "EnterpriseSecret!2026",
        first_name: str = "Test",
        last_name: str = "User",
        status: str = "active",
    ) -> tuple[User, Tenant, str]:
        user_id = uuid.uuid4()
        user = User(
            id=user_id,
            email=email.lower().strip(),
            first_name=first_name,
            last_name=last_name,
            status=status,
            is_superuser=False,
        )
        db_session.add(user)
        await db_session.flush()

        from app.domains.identity.models import UserCredential

        cred = UserCredential(
            id=uuid.uuid4(),
            user_id=user.id,
            password_hash=hash_password(password),
        )
        db_session.add(cred)
        await db_session.flush()

        # Provision personal tenant
        tenant = await create_personal_tenant(db_session, user)

        # Issue access token
        from app.domains.identity.models import UserSession

        session_id = uuid.uuid4()
        user_session = UserSession(
            id=session_id,
            user_id=user.id,
            is_active=True,
            expires_at=datetime.now(UTC) + timedelta(days=7),
        )
        db_session.add(user_session)
        await db_session.flush()

        token = create_access_token(
            user_id=user.id,
            session_id=session_id,
            tenant_id=tenant.id,
        )

        await db_session.commit()

        return user, tenant, token

    return _create_user
