"""PostgreSQL Row-Level Security (RLS) and Audit Hardening

Revision ID: 0003_rls_and_security_hardening
Revises: 0002_auth_and_tenant_security
Create Date: 2026-11-07 20:30:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003_rls_and_security_hardening"
down_revision: str | None = "0002_auth_and_tenant_security"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Provision non-superuser application runtime role if not present
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wealthos_app') THEN
                CREATE ROLE wealthos_app WITH LOGIN PASSWORD 'wealthos_app_dev_password_change_in_prod' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
            END IF;
        END
        $$;
        """
    )

    # 2. Grant permissions on schema and tables to application role
    op.execute("GRANT USAGE ON SCHEMA public TO wealthos_app;")
    op.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO wealthos_app;"
    )
    op.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO wealthos_app;")
    op.execute(
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wealthos_app;"
    )
    op.execute(
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO wealthos_app;"
    )

    # 3. Create audit log immutability trigger function
    op.execute(
        """
        CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
        RETURNS TRIGGER AS $$
        BEGIN
            IF current_user = 'wealthos_admin' AND current_setting('wealthos.allow_audit_cleanup', true) = 'on' THEN
                RETURN OLD;
            END IF;
            RAISE EXCEPTION 'Audit log entries are immutable and append-only. UPDATE and DELETE operations are strictly prohibited.';
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    # 4. Attach triggers to audit tables
    op.execute("DROP TRIGGER IF EXISTS trg_security_audit_logs_immutable ON security_audit_logs;")
    op.execute(
        """
        CREATE TRIGGER trg_security_audit_logs_immutable
        BEFORE UPDATE OR DELETE ON security_audit_logs
        FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
        """
    )

    op.execute("DROP TRIGGER IF EXISTS trg_system_audit_logs_immutable ON system_audit_logs;")
    op.execute(
        """
        CREATE TRIGGER trg_system_audit_logs_immutable
        BEFORE UPDATE OR DELETE ON system_audit_logs
        FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
        """
    )

    # 5. Revoke UPDATE and DELETE on audit logs from application role
    op.execute("REVOKE UPDATE, DELETE ON security_audit_logs FROM wealthos_app;")
    op.execute("REVOKE UPDATE, DELETE ON system_audit_logs FROM wealthos_app;")

    # 6. Enable and FORCE Row-Level Security on tenant-owned & tenant-scoped tables
    rls_tables = [
        "tenant_memberships",
        "membership_roles",
        "tenant_invitations",
        "roles",
        "tenants",
        "security_audit_logs",
        "system_audit_logs",
    ]

    for table in rls_tables:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;")

    # 7. Create explicit RLS policies bound to app.current_tenant_id and app.current_user_id

    # Table: tenant_memberships
    op.execute(
        """
        CREATE POLICY tenant_memberships_select_policy ON tenant_memberships
        FOR SELECT
        USING (
            (NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
            OR
            (NULLIF(current_setting('app.current_user_id', true), '') IS NOT NULL AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
        );
        """
    )
    op.execute(
        """
        CREATE POLICY tenant_memberships_insert_policy ON tenant_memberships
        FOR INSERT
        WITH CHECK (
            (NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
            OR
            (NULLIF(current_setting('app.current_user_id', true), '') IS NOT NULL AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
        );
        """
    )
    op.execute(
        """
        CREATE POLICY tenant_memberships_update_policy ON tenant_memberships
        FOR UPDATE
        USING (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        )
        WITH CHECK (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )
    op.execute(
        """
        CREATE POLICY tenant_memberships_delete_policy ON tenant_memberships
        FOR DELETE
        USING (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )

    # Table: membership_roles (join table scoped via tenant_memberships)
    op.execute(
        """
        CREATE POLICY membership_roles_select_policy ON membership_roles
        FOR SELECT
        USING (
            membership_id IN (SELECT id FROM tenant_memberships)
        );
        """
    )
    op.execute(
        """
        CREATE POLICY membership_roles_insert_policy ON membership_roles
        FOR INSERT
        WITH CHECK (
            membership_id IN (SELECT id FROM tenant_memberships)
        );
        """
    )
    op.execute(
        """
        CREATE POLICY membership_roles_update_policy ON membership_roles
        FOR UPDATE
        USING (
            membership_id IN (SELECT id FROM tenant_memberships)
        )
        WITH CHECK (
            membership_id IN (SELECT id FROM tenant_memberships)
        );
        """
    )
    op.execute(
        """
        CREATE POLICY membership_roles_delete_policy ON membership_roles
        FOR DELETE
        USING (
            membership_id IN (SELECT id FROM tenant_memberships)
        );
        """
    )

    # Table: tenant_invitations
    op.execute(
        """
        CREATE POLICY tenant_invitations_select_policy ON tenant_invitations
        FOR SELECT
        USING (
            (NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
            OR
            (NULLIF(current_setting('app.current_user_id', true), '') IS NOT NULL AND email = (SELECT email FROM users WHERE id = NULLIF(current_setting('app.current_user_id', true), '')::uuid))
        );
        """
    )
    op.execute(
        """
        CREATE POLICY tenant_invitations_insert_policy ON tenant_invitations
        FOR INSERT
        WITH CHECK (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )
    op.execute(
        """
        CREATE POLICY tenant_invitations_update_policy ON tenant_invitations
        FOR UPDATE
        USING (
            (NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
            OR
            (NULLIF(current_setting('app.current_user_id', true), '') IS NOT NULL AND email = (SELECT email FROM users WHERE id = NULLIF(current_setting('app.current_user_id', true), '')::uuid))
        )
        WITH CHECK (
            (NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
            OR
            (NULLIF(current_setting('app.current_user_id', true), '') IS NOT NULL AND email = (SELECT email FROM users WHERE id = NULLIF(current_setting('app.current_user_id', true), '')::uuid))
        );
        """
    )
    op.execute(
        """
        CREATE POLICY tenant_invitations_delete_policy ON tenant_invitations
        FOR DELETE
        USING (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )

    # Table: roles (allows system roles where tenant_id is NULL, or tenant-owned roles)
    op.execute(
        """
        CREATE POLICY roles_select_policy ON roles
        FOR SELECT
        USING (
            (is_system_role = true AND tenant_id IS NULL)
            OR
            (NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
        );
        """
    )
    op.execute(
        """
        CREATE POLICY roles_insert_policy ON roles
        FOR INSERT
        WITH CHECK (
            is_system_role = false
            AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
            AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )
    op.execute(
        """
        CREATE POLICY roles_update_policy ON roles
        FOR UPDATE
        USING (
            is_system_role = false
            AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
            AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        )
        WITH CHECK (
            is_system_role = false
            AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
            AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )
    op.execute(
        """
        CREATE POLICY roles_delete_policy ON roles
        FOR DELETE
        USING (
            is_system_role = false
            AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
            AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )

    # Table: tenants
    op.execute(
        """
        CREATE POLICY tenants_select_policy ON tenants
        FOR SELECT
        USING (
            (NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
            OR
            (NULLIF(current_setting('app.current_user_id', true), '') IS NOT NULL AND id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid))
        );
        """
    )
    op.execute(
        """
        CREATE POLICY tenants_insert_policy ON tenants
        FOR INSERT
        WITH CHECK (true);
        """
    )
    op.execute(
        """
        CREATE POLICY tenants_update_policy ON tenants
        FOR UPDATE
        USING (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        )
        WITH CHECK (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )
    op.execute(
        """
        CREATE POLICY tenants_delete_policy ON tenants
        FOR DELETE
        USING (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )

    # Table: security_audit_logs
    op.execute(
        """
        CREATE POLICY security_audit_logs_select_policy ON security_audit_logs
        FOR SELECT
        USING (
            (NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
            OR
            (tenant_id IS NULL AND NULLIF(current_setting('app.current_user_id', true), '') IS NOT NULL AND user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
        );
        """
    )
    op.execute(
        """
        CREATE POLICY security_audit_logs_insert_policy ON security_audit_logs
        FOR INSERT
        WITH CHECK (true);
        """
    )
    op.execute(
        """
        CREATE POLICY security_audit_logs_update_policy ON security_audit_logs
        FOR UPDATE
        USING (false)
        WITH CHECK (false);
        """
    )
    op.execute(
        """
        CREATE POLICY security_audit_logs_delete_policy ON security_audit_logs
        FOR DELETE
        USING (false);
        """
    )

    # Table: system_audit_logs
    op.execute(
        """
        CREATE POLICY system_audit_logs_select_policy ON system_audit_logs
        FOR SELECT
        USING (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )
    op.execute(
        """
        CREATE POLICY system_audit_logs_insert_policy ON system_audit_logs
        FOR INSERT
        WITH CHECK (true);
        """
    )
    op.execute(
        """
        CREATE POLICY system_audit_logs_update_policy ON system_audit_logs
        FOR UPDATE
        USING (false)
        WITH CHECK (false);
        """
    )
    op.execute(
        """
        CREATE POLICY system_audit_logs_delete_policy ON system_audit_logs
        FOR DELETE
        USING (false);
        """
    )


def downgrade() -> None:
    # 1. Drop policies
    policies = [
        ("tenant_memberships", "tenant_memberships_select_policy"),
        ("tenant_memberships", "tenant_memberships_insert_policy"),
        ("tenant_memberships", "tenant_memberships_update_policy"),
        ("tenant_memberships", "tenant_memberships_delete_policy"),
        ("membership_roles", "membership_roles_select_policy"),
        ("membership_roles", "membership_roles_insert_policy"),
        ("membership_roles", "membership_roles_update_policy"),
        ("membership_roles", "membership_roles_delete_policy"),
        ("tenant_invitations", "tenant_invitations_select_policy"),
        ("tenant_invitations", "tenant_invitations_insert_policy"),
        ("tenant_invitations", "tenant_invitations_update_policy"),
        ("tenant_invitations", "tenant_invitations_delete_policy"),
        ("roles", "roles_select_policy"),
        ("roles", "roles_insert_policy"),
        ("roles", "roles_update_policy"),
        ("roles", "roles_delete_policy"),
        ("tenants", "tenants_select_policy"),
        ("tenants", "tenants_insert_policy"),
        ("tenants", "tenants_update_policy"),
        ("tenants", "tenants_delete_policy"),
        ("security_audit_logs", "security_audit_logs_select_policy"),
        ("security_audit_logs", "security_audit_logs_insert_policy"),
        ("security_audit_logs", "security_audit_logs_update_policy"),
        ("security_audit_logs", "security_audit_logs_delete_policy"),
        ("system_audit_logs", "system_audit_logs_select_policy"),
        ("system_audit_logs", "system_audit_logs_insert_policy"),
        ("system_audit_logs", "system_audit_logs_update_policy"),
        ("system_audit_logs", "system_audit_logs_delete_policy"),
    ]
    for table, policy in policies:
        op.execute(f"DROP POLICY IF EXISTS {policy} ON {table};")

    # 2. Disable RLS
    rls_tables = [
        "tenant_memberships",
        "membership_roles",
        "tenant_invitations",
        "roles",
        "tenants",
        "security_audit_logs",
        "system_audit_logs",
    ]
    for table in rls_tables:
        op.execute(f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")

    # 3. Drop triggers
    op.execute("DROP TRIGGER IF EXISTS trg_security_audit_logs_immutable ON security_audit_logs;")
    op.execute("DROP TRIGGER IF EXISTS trg_system_audit_logs_immutable ON system_audit_logs;")
    op.execute("DROP FUNCTION IF EXISTS prevent_audit_log_modification();")
