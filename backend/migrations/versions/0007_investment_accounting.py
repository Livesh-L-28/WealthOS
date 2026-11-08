"""Wave 1 Phase 3: Professional Investment Accounting & FIFO Lots

Revision ID: 0007_investment_accounting
Revises: 0006_financial_control_centre
Create Date: 2026-11-08 11:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0007_investment_accounting"
down_revision: str | None = "0006_financial_control_centre"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Table: investment_transactions
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS investment_transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
            instrument_id UUID NOT NULL REFERENCES financial_instruments(id) ON DELETE RESTRICT,
            transaction_type VARCHAR(30) NOT NULL,
            trade_date DATE NOT NULL,
            settlement_date DATE NULL,
            quantity NUMERIC(18, 4) NOT NULL,
            unit_price NUMERIC(18, 4) NOT NULL,
            gross_amount NUMERIC(18, 4) NOT NULL,
            fee_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            tax_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            net_amount NUMERIC(18, 4) NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            realized_pnl NUMERIC(18, 4) NULL,
            allocated_cost_basis NUMERIC(18, 4) NULL,
            notes TEXT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_invest_tx_tenant ON investment_transactions(tenant_id, account_id, instrument_id);")

    # Enable RLS on investment_transactions
    op.execute("ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE investment_transactions FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'investment_transactions' AND policyname = 'investment_transactions_tenant_isolation'
            ) THEN
                CREATE POLICY investment_transactions_tenant_isolation ON investment_transactions
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

    # 2. Table: corporate_actions
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS corporate_actions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            instrument_id UUID NOT NULL REFERENCES financial_instruments(id) ON DELETE CASCADE,
            action_type VARCHAR(30) NOT NULL,
            record_date DATE NOT NULL,
            ratio_numerator NUMERIC(18, 4) NOT NULL,
            ratio_denominator NUMERIC(18, 4) NOT NULL,
            description TEXT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_corp_actions_inst ON corporate_actions(instrument_id);")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS corporate_actions CASCADE;")
    op.execute("DROP TABLE IF EXISTS investment_transactions CASCADE;")
