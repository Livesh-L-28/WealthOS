"""Wave 1 Phase 1: Financial Control Centre, Discrepancy Auditing & Data Quality

Revision ID: 0006_financial_control_centre
Revises: 0005_financial_foundation
Create Date: 2026-11-08 10:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0006_financial_control_centre"
down_revision: str | None = "0005_financial_foundation"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Additive enhancements to reconciliation_records
    op.execute(
        """
        ALTER TABLE reconciliation_records
            ADD COLUMN IF NOT EXISTS severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
            ADD COLUMN IF NOT EXISTS difference NUMERIC(18, 4) NULL,
            ADD COLUMN IF NOT EXISTS resolution_status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
            ADD COLUMN IF NOT EXISTS resolution_notes TEXT NULL,
            ADD COLUMN IF NOT EXISTS discrepancy_category VARCHAR(50) NOT NULL DEFAULT 'AMOUNT_MISMATCH',
            ADD COLUMN IF NOT EXISTS session_id UUID NULL REFERENCES reconciliation_sessions(id) ON DELETE SET NULL;
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_recon_records_severity ON reconciliation_records(tenant_id, severity);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_recon_records_res_status ON reconciliation_records(tenant_id, resolution_status);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_recon_records_session ON reconciliation_records(session_id);")

    # 2. Table: reconciliation_audit_events
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS reconciliation_audit_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            reconciliation_record_id UUID NOT NULL REFERENCES reconciliation_records(id) ON DELETE CASCADE,
            action VARCHAR(50) NOT NULL,
            actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
            notes TEXT NULL,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_recon_audit_tenant ON reconciliation_audit_events(tenant_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_recon_audit_record ON reconciliation_audit_events(reconciliation_record_id);")

    # Enable RLS on reconciliation_audit_events
    op.execute("ALTER TABLE reconciliation_audit_events ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE reconciliation_audit_events FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'reconciliation_audit_events' AND policyname = 'reconciliation_audit_tenant_isolation'
            ) THEN
                CREATE POLICY reconciliation_audit_tenant_isolation ON reconciliation_audit_events
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

    # 3. Table: data_quality_metrics
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS data_quality_metrics (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            account_id UUID NULL REFERENCES accounts(id) ON DELETE CASCADE,
            source_name VARCHAR(100) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'VERIFIED',
            last_sync_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            unreconciled_count INTEGER NOT NULL DEFAULT 0,
            discrepancy_count INTEGER NOT NULL DEFAULT 0,
            freshness_seconds INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_data_quality_tenant_source_acct UNIQUE (tenant_id, source_name, account_id)
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_data_quality_tenant ON data_quality_metrics(tenant_id);")

    # Enable RLS on data_quality_metrics
    op.execute("ALTER TABLE data_quality_metrics ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE data_quality_metrics FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'data_quality_metrics' AND policyname = 'data_quality_tenant_isolation'
            ) THEN
                CREATE POLICY data_quality_tenant_isolation ON data_quality_metrics
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
    op.execute("DROP TABLE IF EXISTS data_quality_metrics CASCADE;")
    op.execute("DROP TABLE IF EXISTS reconciliation_audit_events CASCADE;")
    op.execute(
        """
        ALTER TABLE reconciliation_records
            DROP COLUMN IF EXISTS severity,
            DROP COLUMN IF EXISTS difference,
            DROP COLUMN IF EXISTS resolution_status,
            DROP COLUMN IF EXISTS resolution_notes,
            DROP COLUMN IF EXISTS discrepancy_category,
            DROP COLUMN IF EXISTS session_id;
        """
    )
