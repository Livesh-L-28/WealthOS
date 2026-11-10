"""Wave 3: Financial Planning, India Tax Readiness, and Financial Risk Intelligence.

Revision ID: 0009_wave_3_intelligence
Revises: 0008_wave_2_intelligence
Create Date: 2026-11-08 14:35:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0009_wave_3_intelligence"
down_revision: str | None = "0008_wave_2_intelligence"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # =========================================================================
    # 1. PHASE 7: Financial Planning & Forecasting Additions
    # =========================================================================
    op.execute(
        """
        ALTER TABLE financial_goals
            ADD COLUMN IF NOT EXISTS monthly_contribution NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            ADD COLUMN IF NOT EXISTS inflation_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0600,
            ADD COLUMN IF NOT EXISTS expected_return_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.1000,
            ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
            ADD COLUMN IF NOT EXISTS linked_account_id UUID NULL REFERENCES accounts(id) ON DELETE SET NULL;
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS retirement_profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            current_age INT NOT NULL,
            retirement_age INT NOT NULL,
            life_expectancy INT NOT NULL DEFAULT 85,
            monthly_expenses_current NUMERIC(18, 4) NOT NULL,
            inflation_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0600,
            pre_retirement_return NUMERIC(5, 4) NOT NULL DEFAULT 0.1000,
            post_retirement_return NUMERIC(5, 4) NOT NULL DEFAULT 0.0700,
            existing_corpus NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            monthly_contribution NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_retirement_tenant UNIQUE (tenant_id)
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_retire_tenant ON retirement_profiles(tenant_id);")
    op.execute("ALTER TABLE retirement_profiles ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE retirement_profiles FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'retirement_profiles' AND policyname = 'retire_tenant_isolation'
            ) THEN
                CREATE POLICY retire_tenant_isolation ON retirement_profiles
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
    # 2. PHASE 8: India Tax Readiness
    # =========================================================================
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS tax_profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            financial_year VARCHAR(10) NOT NULL,
            assessment_year VARCHAR(10) NOT NULL,
            tax_regime VARCHAR(20) NOT NULL DEFAULT 'NEW',
            taxpayer_category VARCHAR(30) NOT NULL DEFAULT 'INDIVIDUAL',
            residential_status VARCHAR(30) NOT NULL DEFAULT 'RESIDENT',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_tax_profile_fy UNIQUE (tenant_id, financial_year),
            CONSTRAINT chk_tax_regime CHECK (tax_regime IN ('NEW', 'OLD')),
            CONSTRAINT chk_taxpayer_cat CHECK (taxpayer_category IN ('INDIVIDUAL', 'SENIOR_CITIZEN', 'SUPER_SENIOR'))
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_tax_profiles_tenant ON tax_profiles(tenant_id);")
    op.execute("ALTER TABLE tax_profiles ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE tax_profiles FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'tax_profiles' AND policyname = 'tax_profiles_tenant_isolation'
            ) THEN
                CREATE POLICY tax_profiles_tenant_isolation ON tax_profiles
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

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS tax_computations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            profile_id UUID NOT NULL REFERENCES tax_profiles(id) ON DELETE CASCADE,
            financial_year VARCHAR(10) NOT NULL,
            rule_version VARCHAR(20) NOT NULL DEFAULT '2026.1',
            gross_total_income NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            total_deductions NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            taxable_income NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            tax_on_income NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            rebate_87a NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            surcharge NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            cess NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            total_tax_liability NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            tds_credits NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            net_tax_payable NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            computation_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
            status VARCHAR(20) NOT NULL DEFAULT 'PROVISIONAL',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_tax_comp_tenant ON tax_computations(tenant_id, profile_id);")
    op.execute("ALTER TABLE tax_computations ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE tax_computations FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'tax_computations' AND policyname = 'tax_comp_tenant_isolation'
            ) THEN
                CREATE POLICY tax_comp_tenant_isolation ON tax_computations
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
    # 3. PHASE 9: Financial Risk Intelligence
    # =========================================================================
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS risk_assessments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            assessment_date DATE NOT NULL,
            health_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
            liquidity_ratio NUMERIC(8, 4) NOT NULL DEFAULT 0.0000,
            debt_service_ratio NUMERIC(8, 4) NOT NULL DEFAULT 0.0000,
            emergency_coverage_months NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
            portfolio_concentration_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
            data_quality_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
            risk_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_risk_assess_tenant ON risk_assessments(tenant_id, assessment_date);")
    op.execute("ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE risk_assessments FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'risk_assessments' AND policyname = 'risk_assess_tenant_isolation'
            ) THEN
                CREATE POLICY risk_assess_tenant_isolation ON risk_assessments
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

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS risk_alerts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            alert_key VARCHAR(100) NOT NULL,
            risk_category VARCHAR(50) NOT NULL,
            severity VARCHAR(20) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
            status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
            resolution_notes TEXT NULL,
            triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            resolved_at TIMESTAMPTZ NULL,
            CONSTRAINT uq_risk_alert_key UNIQUE (tenant_id, alert_key),
            CONSTRAINT chk_risk_severity CHECK (severity IN ('INFORMATIONAL', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
            CONSTRAINT chk_alert_status CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'SNOOZED'))
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_risk_alerts_tenant ON risk_alerts(tenant_id, status);")
    op.execute("ALTER TABLE risk_alerts ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE risk_alerts FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'risk_alerts' AND policyname = 'risk_alerts_tenant_isolation'
            ) THEN
                CREATE POLICY risk_alerts_tenant_isolation ON risk_alerts
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
    op.execute("DROP TABLE IF EXISTS risk_alerts CASCADE;")
    op.execute("DROP TABLE IF EXISTS risk_assessments CASCADE;")
    op.execute("DROP TABLE IF EXISTS tax_computations CASCADE;")
    op.execute("DROP TABLE IF EXISTS tax_profiles CASCADE;")
    op.execute("DROP TABLE IF EXISTS retirement_profiles CASCADE;")
    op.execute(
        """
        ALTER TABLE financial_goals
            DROP COLUMN IF EXISTS linked_account_id,
            DROP COLUMN IF EXISTS priority,
            DROP COLUMN IF EXISTS expected_return_rate,
            DROP COLUMN IF EXISTS inflation_rate,
            DROP COLUMN IF EXISTS monthly_contribution;
        """
    )
