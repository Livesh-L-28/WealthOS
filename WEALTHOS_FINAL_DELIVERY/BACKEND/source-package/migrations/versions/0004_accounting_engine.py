"""Double-Entry Accounting Engine Tables, Immutability Triggers, and RLS Policies

Revision ID: 0004_accounting_engine
Revises: 0003_rls_and_security_hardening
Create Date: 2026-11-07 21:30:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0004_accounting_engine"
down_revision: str | None = "0003_rls_and_security_hardening"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # -------------------------------------------------------------------------
    # 1. Create Core Accounting Tables
    # -------------------------------------------------------------------------

    # Table: accounts (Chart of Accounts)
    op.execute(
        """
        CREATE TABLE accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
            account_code VARCHAR(50) NOT NULL,
            account_name VARCHAR(255) NOT NULL,
            description TEXT NULL,
            account_type VARCHAR(50) NOT NULL,
            normal_balance VARCHAR(10) NOT NULL,
            parent_account_id UUID NULL REFERENCES accounts(id) ON DELETE RESTRICT,
            currency_code VARCHAR(3) NOT NULL DEFAULT 'INR',
            is_system_account BOOLEAN NOT NULL DEFAULT FALSE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            is_control_account BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_tenant_account_code UNIQUE (tenant_id, account_code),
            CONSTRAINT chk_account_type CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
            CONSTRAINT chk_normal_balance CHECK (normal_balance IN ('DEBIT', 'CREDIT'))
        );
        """
    )
    op.execute("CREATE INDEX idx_accounts_tenant ON accounts(tenant_id);")
    op.execute("CREATE INDEX idx_accounts_tenant_type ON accounts(tenant_id, account_type);")
    op.execute("CREATE INDEX idx_accounts_parent ON accounts(parent_account_id);")

    # Table: accounting_periods
    op.execute(
        """
        CREATE TABLE accounting_periods (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
            period_name VARCHAR(100) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
            closed_at TIMESTAMPTZ NULL,
            closed_by UUID NULL REFERENCES users(id) ON DELETE RESTRICT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_tenant_period_name UNIQUE (tenant_id, period_name),
            CONSTRAINT chk_period_dates CHECK (start_date <= end_date),
            CONSTRAINT chk_period_status CHECK (status IN ('OPEN', 'CLOSED'))
        );
        """
    )
    op.execute("CREATE INDEX idx_accounting_periods_tenant ON accounting_periods(tenant_id);")
    op.execute(
        "CREATE INDEX idx_accounting_periods_dates ON accounting_periods(tenant_id, start_date, end_date);"
    )

    # Table: journal_entries
    op.execute(
        """
        CREATE TABLE journal_entries (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
            entry_number VARCHAR(50) NOT NULL,
            entry_date DATE NOT NULL,
            posting_date TIMESTAMPTZ NULL,
            description TEXT NOT NULL,
            reference VARCHAR(100) NULL,
            source_type VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
            source_id VARCHAR(100) NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
            functional_currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            total_debit NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            total_credit NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            idempotency_key VARCHAR(100) NULL,
            created_by UUID NULL REFERENCES users(id) ON DELETE RESTRICT,
            posted_by UUID NULL REFERENCES users(id) ON DELETE RESTRICT,
            posted_at TIMESTAMPTZ NULL,
            reversal_of_entry_id UUID NULL REFERENCES journal_entries(id) ON DELETE RESTRICT,
            reversed_by_entry_id UUID NULL REFERENCES journal_entries(id) ON DELETE RESTRICT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_tenant_entry_number UNIQUE (tenant_id, entry_number),
            CONSTRAINT chk_journal_status CHECK (status IN ('DRAFT', 'POSTED', 'REVERSED'))
        );
        """
    )
    op.execute(
        "CREATE INDEX idx_journal_entries_tenant_date ON journal_entries(tenant_id, entry_date DESC);"
    )
    op.execute(
        "CREATE INDEX idx_journal_entries_tenant_status ON journal_entries(tenant_id, status);"
    )
    op.execute(
        "CREATE INDEX idx_journal_entries_reversal_of ON journal_entries(reversal_of_entry_id);"
    )
    op.execute(
        "CREATE UNIQUE INDEX uq_tenant_journal_idempotency ON journal_entries(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;"
    )

    # Table: journal_lines
    op.execute(
        """
        CREATE TABLE journal_lines (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
            journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE RESTRICT,
            account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
            description TEXT NULL,
            line_number INTEGER NOT NULL,
            debit_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            credit_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            transaction_currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            transaction_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            exchange_rate NUMERIC(18, 8) NOT NULL DEFAULT 1.00000000,
            functional_debit_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            functional_credit_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_journal_line_number UNIQUE (journal_entry_id, line_number),
            CONSTRAINT chk_debit_credit_positive CHECK (debit_amount >= 0 AND credit_amount >= 0),
            CONSTRAINT chk_single_sided_amount CHECK ((debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0)),
            CONSTRAINT chk_exchange_rate_positive CHECK (exchange_rate > 0),
            CONSTRAINT chk_functional_debit_credit_positive CHECK (functional_debit_amount >= 0 AND functional_credit_amount >= 0),
            CONSTRAINT chk_single_sided_functional CHECK ((functional_debit_amount > 0 AND functional_credit_amount = 0) OR (functional_credit_amount > 0 AND functional_debit_amount = 0))
        );
        """
    )
    op.execute("CREATE INDEX idx_journal_lines_tenant ON journal_lines(tenant_id);")
    op.execute("CREATE INDEX idx_journal_lines_entry ON journal_lines(journal_entry_id);")
    op.execute("CREATE INDEX idx_journal_lines_account ON journal_lines(account_id);")

    # Table: accounting_idempotency_records
    op.execute(
        """
        CREATE TABLE accounting_idempotency_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
            idempotency_key VARCHAR(100) NOT NULL,
            request_fingerprint VARCHAR(64) NOT NULL,
            operation_type VARCHAR(50) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
            journal_entry_id UUID NULL REFERENCES journal_entries(id) ON DELETE RESTRICT,
            response_payload JSONB NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_tenant_idempotency_key UNIQUE (tenant_id, idempotency_key),
            CONSTRAINT chk_idempotency_status CHECK (status IN ('PENDING', 'COMMITTED', 'FAILED'))
        );
        """
    )
    op.execute(
        "CREATE INDEX idx_idempotency_tenant_key ON accounting_idempotency_records(tenant_id, idempotency_key);"
    )

    # Table: reconciliation_records
    op.execute(
        """
        CREATE TABLE reconciliation_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
            source_reference VARCHAR(100) NOT NULL,
            account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
            journal_entry_id UUID NULL REFERENCES journal_entries(id) ON DELETE RESTRICT,
            expected_amount NUMERIC(18, 4) NOT NULL,
            posted_amount NUMERIC(18, 4) NULL,
            currency_code VARCHAR(3) NOT NULL DEFAULT 'INR',
            status VARCHAR(30) NOT NULL DEFAULT 'UNMATCHED',
            matched_at TIMESTAMPTZ NULL,
            matched_by UUID NULL REFERENCES users(id) ON DELETE RESTRICT,
            discrepancy_reason TEXT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_reconciliation_status CHECK (status IN ('UNMATCHED', 'MATCHED', 'PARTIALLY_MATCHED', 'DISCREPANCY'))
        );
        """
    )
    op.execute("CREATE INDEX idx_reconciliation_tenant ON reconciliation_records(tenant_id);")
    op.execute("CREATE INDEX idx_reconciliation_account ON reconciliation_records(account_id);")
    op.execute(
        "CREATE INDEX idx_reconciliation_journal ON reconciliation_records(journal_entry_id);"
    )

    # -------------------------------------------------------------------------
    # 2. Database Immutability Triggers
    # -------------------------------------------------------------------------

    # Function: Prevent modification of posted journal entries
    op.execute(
        """
        CREATE OR REPLACE FUNCTION prevent_posted_journal_modification()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Allow test cleanup if administrative override is active
            IF current_user = 'wealthos_admin' AND current_setting('wealthos.allow_audit_cleanup', true) = 'on' THEN
                IF TG_OP = 'DELETE' THEN
                    RETURN OLD;
                ELSE
                    RETURN NEW;
                END IF;
            END IF;

            -- Handle DELETE
            IF TG_OP = 'DELETE' THEN
                IF OLD.status IN ('POSTED', 'REVERSED') THEN
                    RAISE EXCEPTION 'Posted or reversed journal entries are immutable and cannot be deleted. Entry ID: %', OLD.id;
                END IF;
                RETURN OLD;
            END IF;

            -- Handle UPDATE
            IF TG_OP = 'UPDATE' THEN
                -- If original was already POSTED or REVERSED
                IF OLD.status IN ('POSTED', 'REVERSED') THEN
                    -- Only allow setting reversed_by_entry_id or transitioning POSTED -> REVERSED
                    IF OLD.status = 'POSTED' AND NEW.status = 'REVERSED' AND NEW.reversed_by_entry_id IS NOT NULL THEN
                        -- Validate core financial attributes were NOT tampered with
                        IF OLD.entry_date <> NEW.entry_date OR
                           OLD.total_debit <> NEW.total_debit OR
                           OLD.total_credit <> NEW.total_credit OR
                           OLD.functional_currency <> NEW.functional_currency OR
                           OLD.tenant_id <> NEW.tenant_id OR
                           OLD.entry_number <> NEW.entry_number THEN
                            RAISE EXCEPTION 'Financial attributes cannot be modified during journal reversal. Entry ID: %', OLD.id;
                        END IF;
                        RETURN NEW;
                    ELSE
                        RAISE EXCEPTION 'Posted or reversed journal entries are immutable and cannot be modified. Entry ID: %', OLD.id;
                    END IF;
                END IF;
            END IF;

            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    op.execute("DROP TRIGGER IF EXISTS trg_journal_entries_immutable ON journal_entries;")
    op.execute(
        """
        CREATE TRIGGER trg_journal_entries_immutable
        BEFORE UPDATE OR DELETE ON journal_entries
        FOR EACH ROW EXECUTE FUNCTION prevent_posted_journal_modification();
        """
    )

    # Function: Prevent insert/update/delete on lines belonging to a posted journal entry
    op.execute(
        """
        CREATE OR REPLACE FUNCTION prevent_posted_journal_lines_modification()
        RETURNS TRIGGER AS $$
        DECLARE
            parent_status VARCHAR(20);
        BEGIN
            -- Allow test cleanup if administrative override is active
            IF current_user = 'wealthos_admin' AND current_setting('wealthos.allow_audit_cleanup', true) = 'on' THEN
                IF TG_OP = 'DELETE' THEN
                    RETURN OLD;
                ELSE
                    RETURN NEW;
                END IF;
            END IF;

            IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
                SELECT status INTO parent_status FROM journal_entries WHERE id = NEW.journal_entry_id;
                IF parent_status IN ('POSTED', 'REVERSED') THEN
                    RAISE EXCEPTION 'Cannot insert or modify journal lines for a posted or reversed entry. Journal ID: %', NEW.journal_entry_id;
                END IF;
                RETURN NEW;
            ELSIF TG_OP = 'DELETE' THEN
                SELECT status INTO parent_status FROM journal_entries WHERE id = OLD.journal_entry_id;
                IF parent_status IN ('POSTED', 'REVERSED') THEN
                    RAISE EXCEPTION 'Cannot delete journal lines belonging to a posted or reversed entry. Journal ID: %', OLD.journal_entry_id;
                END IF;
                RETURN OLD;
            END IF;

            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    op.execute("DROP TRIGGER IF EXISTS trg_journal_lines_immutable ON journal_lines;")
    op.execute(
        """
        CREATE TRIGGER trg_journal_lines_immutable
        BEFORE INSERT OR UPDATE OR DELETE ON journal_lines
        FOR EACH ROW EXECUTE FUNCTION prevent_posted_journal_lines_modification();
        """
    )

    # -------------------------------------------------------------------------
    # 3. Grant Application Role Permissions
    # -------------------------------------------------------------------------
    tables = [
        "accounts",
        "accounting_periods",
        "journal_entries",
        "journal_lines",
        "accounting_idempotency_records",
        "reconciliation_records",
    ]
    for tbl in tables:
        op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {tbl} TO wealthos_app;")

    # -------------------------------------------------------------------------
    # 4. Enable and FORCE Row-Level Security
    # -------------------------------------------------------------------------
    for tbl in tables:
        op.execute(f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE {tbl} FORCE ROW LEVEL SECURITY;")

    # Table: accounts policies
    op.execute(
        """
        CREATE POLICY accounts_select_policy ON accounts
        FOR SELECT
        USING (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )
    op.execute(
        """
        CREATE POLICY accounts_insert_policy ON accounts
        FOR INSERT
        WITH CHECK (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )
    op.execute(
        """
        CREATE POLICY accounts_update_policy ON accounts
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
        CREATE POLICY accounts_delete_policy ON accounts
        FOR DELETE
        USING (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )

    # Table: accounting_periods policies
    op.execute(
        """
        CREATE POLICY accounting_periods_select_policy ON accounting_periods
        FOR SELECT
        USING (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )
    op.execute(
        """
        CREATE POLICY accounting_periods_insert_policy ON accounting_periods
        FOR INSERT
        WITH CHECK (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )
    op.execute(
        """
        CREATE POLICY accounting_periods_update_policy ON accounting_periods
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
        CREATE POLICY accounting_periods_delete_policy ON accounting_periods
        FOR DELETE
        USING (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )

    # Table: journal_entries policies
    op.execute(
        """
        CREATE POLICY journal_entries_select_policy ON journal_entries
        FOR SELECT
        USING (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )
    op.execute(
        """
        CREATE POLICY journal_entries_insert_policy ON journal_entries
        FOR INSERT
        WITH CHECK (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )
    op.execute(
        """
        CREATE POLICY journal_entries_update_policy ON journal_entries
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
        CREATE POLICY journal_entries_delete_policy ON journal_entries
        FOR DELETE
        USING (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )

    # Table: journal_lines policies
    op.execute(
        """
        CREATE POLICY journal_lines_select_policy ON journal_lines
        FOR SELECT
        USING (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )
    op.execute(
        """
        CREATE POLICY journal_lines_insert_policy ON journal_lines
        FOR INSERT
        WITH CHECK (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )
    op.execute(
        """
        CREATE POLICY journal_lines_update_policy ON journal_lines
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
        CREATE POLICY journal_lines_delete_policy ON journal_lines
        FOR DELETE
        USING (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )

    # Table: accounting_idempotency_records policies
    op.execute(
        """
        CREATE POLICY accounting_idempotency_select_policy ON accounting_idempotency_records
        FOR SELECT
        USING (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )
    op.execute(
        """
        CREATE POLICY accounting_idempotency_insert_policy ON accounting_idempotency_records
        FOR INSERT
        WITH CHECK (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )
    op.execute(
        """
        CREATE POLICY accounting_idempotency_update_policy ON accounting_idempotency_records
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
        CREATE POLICY accounting_idempotency_delete_policy ON accounting_idempotency_records
        FOR DELETE
        USING (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )

    # Table: reconciliation_records policies
    op.execute(
        """
        CREATE POLICY reconciliation_records_select_policy ON reconciliation_records
        FOR SELECT
        USING (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )
    op.execute(
        """
        CREATE POLICY reconciliation_records_insert_policy ON reconciliation_records
        FOR INSERT
        WITH CHECK (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )
    op.execute(
        """
        CREATE POLICY reconciliation_records_update_policy ON reconciliation_records
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
        CREATE POLICY reconciliation_records_delete_policy ON reconciliation_records
        FOR DELETE
        USING (
            NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        );
        """
    )

    # -------------------------------------------------------------------------
    # 5. Seed RBAC Permissions for Accounting Engine
    # -------------------------------------------------------------------------
    accounting_permissions = [
        ("accounting:accounts:read", "accounting", "View chart of accounts and balances"),
        ("accounting:accounts:create", "accounting", "Create new accounts in chart of accounts"),
        ("accounting:accounts:update", "accounting", "Update account metadata and status"),
        ("accounting:journals:read", "accounting", "View journal entries and lines"),
        ("accounting:journals:create", "accounting", "Draft new journal entries"),
        ("accounting:journals:post", "accounting", "Post journal entries to general ledger"),
        ("accounting:journals:reverse", "accounting", "Reverse posted journal entries"),
        ("accounting:ledger:read", "accounting", "Inspect general ledger and account ledgers"),
        ("accounting:reports:read", "accounting", "Run trial balance and financial reports"),
        ("accounting:periods:manage", "accounting", "Close and reopen accounting periods"),
    ]

    for p_name, p_domain, p_desc in accounting_permissions:
        op.execute(
            f"""
            INSERT INTO permissions (id, name, domain, description, created_at)
            VALUES (gen_random_uuid(), '{p_name}', '{p_domain}', '{p_desc}', now())
            ON CONFLICT (name) DO NOTHING;
            """
        )

    # Map permissions to roles:
    # owner: all accounting permissions
    # admin: all accounting permissions
    # member: read accounts, read journals, create journals, read ledger, read reports
    # viewer: read accounts, read journals, read ledger, read reports
    owner_perms = [p[0] for p in accounting_permissions]
    admin_perms = [p[0] for p in accounting_permissions]
    member_perms = [
        "accounting:accounts:read",
        "accounting:journals:read",
        "accounting:journals:create",
        "accounting:ledger:read",
        "accounting:reports:read",
    ]
    viewer_perms = [
        "accounting:accounts:read",
        "accounting:journals:read",
        "accounting:ledger:read",
        "accounting:reports:read",
    ]

    role_mappings = [
        ("owner", owner_perms),
        ("admin", admin_perms),
        ("member", member_perms),
        ("viewer", viewer_perms),
    ]

    for role_name, perms in role_mappings:
        for perm_name in perms:
            op.execute(
                f"""
                INSERT INTO role_permissions (role_id, permission_id)
                SELECT r.id, p.id
                FROM roles r, permissions p
                WHERE r.name = '{role_name}' AND r.is_system_role = true
                  AND p.name = '{perm_name}'
                ON CONFLICT DO NOTHING;
                """
            )


def downgrade() -> None:
    # 1. Remove RBAC permissions
    op.execute("DELETE FROM permissions WHERE domain = 'accounting';")

    # 2. Drop policies
    tables = [
        "accounts",
        "accounting_periods",
        "journal_entries",
        "journal_lines",
        "accounting_idempotency_records",
        "reconciliation_records",
    ]
    for tbl in tables:
        for action in ["select", "insert", "update", "delete"]:
            op.execute(f"DROP POLICY IF EXISTS {tbl}_{action}_policy ON {tbl};")
        op.execute(f"ALTER TABLE {tbl} NO FORCE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE {tbl} DISABLE ROW LEVEL SECURITY;")

    # 3. Drop triggers
    op.execute("DROP TRIGGER IF EXISTS trg_journal_lines_immutable ON journal_lines;")
    op.execute("DROP FUNCTION IF EXISTS prevent_posted_journal_lines_modification();")

    op.execute("DROP TRIGGER IF EXISTS trg_journal_entries_immutable ON journal_entries;")
    op.execute("DROP FUNCTION IF EXISTS prevent_posted_journal_modification();")

    # 4. Drop tables in reverse order
    op.execute("DROP TABLE IF EXISTS reconciliation_records CASCADE;")
    op.execute("DROP TABLE IF EXISTS accounting_idempotency_records CASCADE;")
    op.execute("DROP TABLE IF EXISTS journal_lines CASCADE;")
    op.execute("DROP TABLE IF EXISTS journal_entries CASCADE;")
    op.execute("DROP TABLE IF EXISTS accounting_periods CASCADE;")
    op.execute("DROP TABLE IF EXISTS accounts CASCADE;")
