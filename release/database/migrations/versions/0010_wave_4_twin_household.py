"""Wave 4: Financial Copilot, Personal Financial Digital Twin, and Household Wealth Management.

Revision ID: 0010_wave_4_intelligence
Revises: 0009_wave_3_intelligence
Create Date: 2026-11-08 15:10:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0010_wave_4_intelligence"
down_revision: str | None = "0009_wave_3_intelligence"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # =========================================================================
    # 1. PHASE 10: Personal Financial Digital Twin
    # =========================================================================
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS financial_twin_snapshots (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            snapshot_date DATE NOT NULL,
            net_worth NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            liquid_net_worth NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            monthly_income NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            monthly_expenses NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            monthly_savings NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            debt_obligations NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            risk_health_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
            data_freshness_status VARCHAR(20) NOT NULL DEFAULT 'CURRENT',
            metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
            source_references JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_twin_freshness CHECK (data_freshness_status IN ('CURRENT', 'STALE', 'INCOMPLETE'))
        );
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_financial_twin_tenant_user ON financial_twin_snapshots(tenant_id, user_id);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_financial_twin_date ON financial_twin_snapshots(tenant_id, snapshot_date DESC);"
    )
    op.execute("ALTER TABLE financial_twin_snapshots ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE financial_twin_snapshots FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'financial_twin_snapshots' AND policyname = 'financial_twin_snapshots_tenant_isolation'
            ) THEN
                CREATE POLICY financial_twin_snapshots_tenant_isolation ON financial_twin_snapshots
                    USING (
                        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                        AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                    )
                    WITH CHECK (
                        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                        AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                    );
            END IF;
        END $$;
        """
    )

    # =========================================================================
    # 2. PHASE 11: Household Wealth Management
    # =========================================================================

    # 2.1 Households
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS households (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
            owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_households_tenant ON households(tenant_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_households_owner ON households(tenant_id, owner_user_id);")
    op.execute("ALTER TABLE households ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE households FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'households' AND policyname = 'households_tenant_isolation'
            ) THEN
                CREATE POLICY households_tenant_isolation ON households
                    USING (
                        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                        AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                    )
                    WITH CHECK (
                        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                        AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                    );
            END IF;
        END $$;
        """
    )

    # 2.2 Household Memberships
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS household_memberships (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
            status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
            joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_household_membership UNIQUE (household_id, user_id),
            CONSTRAINT chk_household_role CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')),
            CONSTRAINT chk_household_member_status CHECK (status IN ('ACTIVE', 'INVITED', 'SUSPENDED'))
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_household_memberships_tenant ON household_memberships(tenant_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_household_memberships_user ON household_memberships(tenant_id, user_id);")
    op.execute("ALTER TABLE household_memberships ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE household_memberships FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'household_memberships' AND policyname = 'household_memberships_tenant_isolation'
            ) THEN
                CREATE POLICY household_memberships_tenant_isolation ON household_memberships
                    USING (
                        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                        AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                    )
                    WITH CHECK (
                        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                        AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                    );
            END IF;
        END $$;
        """
    )

    # 2.3 Household Invitations
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS household_invitations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
            email VARCHAR(255) NOT NULL,
            token_hash VARCHAR(255) NOT NULL UNIQUE,
            role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
            expires_at TIMESTAMPTZ NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_invitation_role CHECK (role IN ('ADMIN', 'MEMBER', 'VIEWER')),
            CONSTRAINT chk_invitation_status CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'))
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_household_invitations_tenant ON household_invitations(tenant_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_household_invitations_token ON household_invitations(token_hash);")
    op.execute("ALTER TABLE household_invitations ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE household_invitations FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'household_invitations' AND policyname = 'household_invitations_tenant_isolation'
            ) THEN
                CREATE POLICY household_invitations_tenant_isolation ON household_invitations
                    USING (
                        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                        AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                    )
                    WITH CHECK (
                        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                        AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                    );
            END IF;
        END $$;
        """
    )

    # 2.4 Household Shared Resources
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS household_shared_resources (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
            owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            resource_type VARCHAR(30) NOT NULL,
            resource_id UUID NOT NULL,
            visibility VARCHAR(30) NOT NULL DEFAULT 'HOUSEHOLD_SHARED',
            allocation_percentage NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_household_resource UNIQUE (household_id, resource_type, resource_id),
            CONSTRAINT chk_resource_type CHECK (resource_type IN ('ACCOUNT', 'BUDGET', 'LIABILITY', 'GOAL', 'ASSET')),
            CONSTRAINT chk_visibility_scope CHECK (visibility IN ('PERSONAL_ONLY', 'HOUSEHOLD_SHARED', 'LIMITED_SHARED')),
            CONSTRAINT chk_allocation_pct CHECK (allocation_percentage >= 0.00 AND allocation_percentage <= 100.00)
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_household_resources_tenant ON household_shared_resources(tenant_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_household_resources_lookup ON household_shared_resources(household_id, resource_type);")
    op.execute("ALTER TABLE household_shared_resources ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE household_shared_resources FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'household_shared_resources' AND policyname = 'household_shared_resources_tenant_isolation'
            ) THEN
                CREATE POLICY household_shared_resources_tenant_isolation ON household_shared_resources
                    USING (
                        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                        AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                    )
                    WITH CHECK (
                        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                        AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                    );
            END IF;
        END $$;
        """
    )

    # 2.5 Household Goals
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS household_goals (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
            name VARCHAR(150) NOT NULL,
            target_amount NUMERIC(18, 4) NOT NULL,
            current_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            target_date DATE NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_household_goal_status CHECK (status IN ('ACTIVE', 'COMPLETED', 'ARCHIVED'))
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_household_goals_tenant ON household_goals(tenant_id, household_id);")
    op.execute("ALTER TABLE household_goals ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE household_goals FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'household_goals' AND policyname = 'household_goals_tenant_isolation'
            ) THEN
                CREATE POLICY household_goals_tenant_isolation ON household_goals
                    USING (
                        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                        AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                    )
                    WITH CHECK (
                        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                        AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                    );
            END IF;
        END $$;
        """
    )

    # 2.6 Household Goal Contributions
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS household_contributions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            goal_id UUID NOT NULL REFERENCES household_goals(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            amount NUMERIC(18, 4) NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            contribution_date DATE NOT NULL,
            note VARCHAR(255),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_contribution_positive CHECK (amount > 0)
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_household_contrib_tenant ON household_contributions(tenant_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_household_contrib_goal ON household_contributions(goal_id, user_id);")
    op.execute("ALTER TABLE household_contributions ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE household_contributions FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'household_contributions' AND policyname = 'household_contributions_tenant_isolation'
            ) THEN
                CREATE POLICY household_contributions_tenant_isolation ON household_contributions
                    USING (
                        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                        AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                    )
                    WITH CHECK (
                        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                        AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                    );
            END IF;
        END $$;
        """
    )

    # 2.7 Household Internal Settlements
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS household_settlements (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
            payer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            payee_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            amount NUMERIC(18, 4) NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            settlement_date DATE NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
            description VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_settlement_distinct_users CHECK (payer_user_id <> payee_user_id),
            CONSTRAINT chk_settlement_positive CHECK (amount > 0),
            CONSTRAINT chk_settlement_status CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED'))
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_household_settlements_tenant ON household_settlements(tenant_id, household_id);")
    op.execute("ALTER TABLE household_settlements ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE household_settlements FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'household_settlements' AND policyname = 'household_settlements_tenant_isolation'
            ) THEN
                CREATE POLICY household_settlements_tenant_isolation ON household_settlements
                    USING (
                        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                        AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                    )
                    WITH CHECK (
                        NULLIF(current_setting('app.current_tenant_id', true), '') IS NOT NULL
                        AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
                    );
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS household_settlements CASCADE;")
    op.execute("DROP TABLE IF EXISTS household_contributions CASCADE;")
    op.execute("DROP TABLE IF EXISTS household_goals CASCADE;")
    op.execute("DROP TABLE IF EXISTS household_shared_resources CASCADE;")
    op.execute("DROP TABLE IF EXISTS household_invitations CASCADE;")
    op.execute("DROP TABLE IF EXISTS household_memberships CASCADE;")
    op.execute("DROP TABLE IF EXISTS households CASCADE;")
    op.execute("DROP TABLE IF EXISTS financial_twin_snapshots CASCADE;")
