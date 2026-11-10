"""Wave 2: Budgets, Liabilities, and Universal Financial Document Intelligence.

Revision ID: 0008_wave_2_intelligence
Revises: 0007_investment_accounting
Create Date: 2026-11-08 14:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0008_wave_2_intelligence"
down_revision: str | None = "0007_investment_accounting"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # =========================================================================
    # 1. PHASE 4: Budget Revisions & Threshold Alerts
    # =========================================================================
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS budget_revisions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
            revision_number INT NOT NULL,
            previous_amount NUMERIC(18, 4) NOT NULL,
            revised_amount NUMERIC(18, 4) NOT NULL,
            reason TEXT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_budget_revision UNIQUE (budget_id, revision_number)
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_budget_revisions_tenant ON budget_revisions(tenant_id);")
    op.execute("ALTER TABLE budget_revisions ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE budget_revisions FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'budget_revisions' AND policyname = 'budget_revisions_tenant_isolation'
            ) THEN
                CREATE POLICY budget_revisions_tenant_isolation ON budget_revisions
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
        CREATE TABLE IF NOT EXISTS budget_alerts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
            allocation_id UUID NULL REFERENCES budget_allocations(id) ON DELETE CASCADE,
            threshold_percent NUMERIC(5, 2) NOT NULL,
            current_percent NUMERIC(5, 2) NOT NULL,
            spent_amount NUMERIC(18, 4) NOT NULL,
            allocated_amount NUMERIC(18, 4) NOT NULL,
            alert_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
            triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_budget_alert_threshold UNIQUE (budget_id, allocation_id, threshold_percent)
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_budget_alerts_tenant ON budget_alerts(tenant_id);")
    op.execute("ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE budget_alerts FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'budget_alerts' AND policyname = 'budget_alerts_tenant_isolation'
            ) THEN
                CREATE POLICY budget_alerts_tenant_isolation ON budget_alerts
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
    # 2. PHASE 5: Liability Amortization Schedules & Credit Cards
    # =========================================================================
    op.execute("ALTER TABLE liabilities DROP CONSTRAINT IF EXISTS chk_liability_type;")
    op.execute(
        """
        ALTER TABLE liabilities
            ADD CONSTRAINT chk_liability_type
            CHECK (liability_type IN ('MORTGAGE', 'HOME_LOAN', 'VEHICLE_LOAN', 'PERSONAL_LOAN', 'EDUCATION_LOAN', 'CREDIT_LINE', 'CREDIT_CARD', 'OTHER'));
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS loan_payment_schedules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            liability_id UUID NOT NULL REFERENCES liabilities(id) ON DELETE CASCADE,
            installment_number INT NOT NULL,
            due_date DATE NOT NULL,
            expected_payment NUMERIC(18, 4) NOT NULL,
            principal_component NUMERIC(18, 4) NOT NULL,
            interest_component NUMERIC(18, 4) NOT NULL,
            fee_component NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            remaining_principal NUMERIC(18, 4) NOT NULL,
            payment_status VARCHAR(30) NOT NULL DEFAULT 'UPCOMING',
            paid_date DATE NULL,
            actual_paid_amount NUMERIC(18, 4) NULL,
            transaction_id UUID NULL REFERENCES financial_transactions(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_liability_installment UNIQUE (liability_id, installment_number)
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_loan_sched_tenant ON loan_payment_schedules(tenant_id, liability_id);")
    op.execute("ALTER TABLE loan_payment_schedules ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE loan_payment_schedules FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'loan_payment_schedules' AND policyname = 'loan_schedules_tenant_isolation'
            ) THEN
                CREATE POLICY loan_schedules_tenant_isolation ON loan_payment_schedules
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
        CREATE TABLE IF NOT EXISTS credit_card_statements (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            liability_id UUID NOT NULL REFERENCES liabilities(id) ON DELETE CASCADE,
            statement_date DATE NOT NULL,
            due_date DATE NOT NULL,
            statement_balance NUMERIC(18, 4) NOT NULL,
            minimum_due NUMERIC(18, 4) NOT NULL,
            credit_limit NUMERIC(18, 4) NOT NULL,
            available_credit NUMERIC(18, 4) NOT NULL,
            finance_charges NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_card_stmt_tenant ON credit_card_statements(tenant_id, liability_id);")
    op.execute("ALTER TABLE credit_card_statements ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE credit_card_statements FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'credit_card_statements' AND policyname = 'card_statements_tenant_isolation'
            ) THEN
                CREATE POLICY card_statements_tenant_isolation ON credit_card_statements
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
    # 3. PHASE 6: Document Extractions, Provenance & Approvals
    # =========================================================================
    op.execute("ALTER TABLE financial_documents DROP CONSTRAINT IF EXISTS chk_doc_status;")
    op.execute(
        """
        ALTER TABLE financial_documents
            ADD CONSTRAINT chk_doc_status
            CHECK (processing_status IN ('PENDING', 'PROCESSING', 'EXTRACTED', 'NEEDS_REVIEW', 'READY_FOR_APPROVAL', 'APPROVED', 'REJECTED', 'POSTED', 'FAILED', 'CANCELLED', 'RECONCILED'));
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS document_extractions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            document_id UUID NOT NULL REFERENCES financial_documents(id) ON DELETE CASCADE,
            schema_version VARCHAR(20) NOT NULL DEFAULT 'v1',
            document_type VARCHAR(50) NOT NULL,
            reporting_start DATE NULL,
            reporting_end DATE NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            confidence_score NUMERIC(5, 4) NOT NULL DEFAULT 1.0000,
            validation_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
            approval_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
            extracted_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
            provenance_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            reviewed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
            reviewed_at TIMESTAMPTZ NULL,
            posted_at TIMESTAMPTZ NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_doc_extract_tenant ON document_extractions(tenant_id, document_id);")
    op.execute("ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE document_extractions FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'document_extractions' AND policyname = 'doc_extractions_tenant_isolation'
            ) THEN
                CREATE POLICY doc_extractions_tenant_isolation ON document_extractions
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
        CREATE TABLE IF NOT EXISTS document_approval_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            document_id UUID NOT NULL REFERENCES financial_documents(id) ON DELETE CASCADE,
            extraction_id UUID NOT NULL REFERENCES document_extractions(id) ON DELETE CASCADE,
            action VARCHAR(30) NOT NULL,
            actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
            notes TEXT NULL,
            audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_doc_approvals_tenant ON document_approval_events(tenant_id, document_id);")
    op.execute("ALTER TABLE document_approval_events ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE document_approval_events FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'document_approval_events' AND policyname = 'doc_approvals_tenant_isolation'
            ) THEN
                CREATE POLICY doc_approvals_tenant_isolation ON document_approval_events
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
    op.execute("DROP TABLE IF EXISTS document_approval_events CASCADE;")
    op.execute("DROP TABLE IF EXISTS document_extractions CASCADE;")
    op.execute("DROP TABLE IF EXISTS credit_card_statements CASCADE;")
    op.execute("DROP TABLE IF EXISTS loan_payment_schedules CASCADE;")
    op.execute("DROP TABLE IF EXISTS budget_alerts CASCADE;")
    op.execute("DROP TABLE IF EXISTS budget_revisions CASCADE;")

