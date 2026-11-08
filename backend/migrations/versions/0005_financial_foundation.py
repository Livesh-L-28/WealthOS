"""Consolidated Financial Intelligence Foundation Tables, RLS Policies & RBAC

Revision ID: 0005_financial_intelligence_foundation
Revises: 0004_accounting_engine
Create Date: 2026-11-08 07:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0005_financial_foundation"
down_revision: str | None = "0004_accounting_engine"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # =========================================================================
    # 1. STAGE 2: Financial Accounts, Categories, Merchants, Transactions
    # =========================================================================

    # Table: financial_institutions (System & tenant bank directory)
    op.execute(
        """
        CREATE TABLE financial_institutions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            code VARCHAR(50) NOT NULL UNIQUE,
            institution_type VARCHAR(50) NOT NULL DEFAULT 'BANK',
            logo_url TEXT NULL,
            country_code VARCHAR(3) NOT NULL DEFAULT 'IND',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX idx_institutions_code ON financial_institutions(code);")

    # Table: transaction_categories
    op.execute(
        """
        CREATE TABLE transaction_categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            parent_id UUID NULL REFERENCES transaction_categories(id) ON DELETE SET NULL,
            name VARCHAR(100) NOT NULL,
            code VARCHAR(50) NOT NULL,
            category_type VARCHAR(20) NOT NULL DEFAULT 'EXPENSE',
            icon VARCHAR(50) NULL,
            is_system BOOLEAN NOT NULL DEFAULT FALSE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_tenant_category_code UNIQUE (tenant_id, code),
            CONSTRAINT chk_category_type CHECK (category_type IN ('INCOME', 'EXPENSE', 'TRANSFER', 'INVESTMENT'))
        );
        """
    )
    op.execute("CREATE INDEX idx_tx_categories_tenant ON transaction_categories(tenant_id);")

    # Table: transaction_merchants
    op.execute(
        """
        CREATE TABLE transaction_merchants (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            clean_name VARCHAR(255) NOT NULL,
            category_id UUID NULL REFERENCES transaction_categories(id) ON DELETE SET NULL,
            website VARCHAR(255) NULL,
            logo_url TEXT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_tenant_merchant_name UNIQUE (tenant_id, clean_name)
        );
        """
    )
    op.execute("CREATE INDEX idx_tx_merchants_tenant ON transaction_merchants(tenant_id);")

    # Table: financial_accounts
    op.execute(
        """
        CREATE TABLE financial_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            institution_id UUID NULL REFERENCES financial_institutions(id) ON DELETE SET NULL,
            account_name VARCHAR(255) NOT NULL,
            account_number_mask VARCHAR(20) NOT NULL,
            account_type VARCHAR(50) NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            current_balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            available_balance NUMERIC(18, 4) NULL,
            gl_account_id UUID NULL REFERENCES accounts(id) ON DELETE SET NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_fin_account_type CHECK (account_type IN ('SAVINGS', 'CURRENT', 'CREDIT_CARD', 'CASH', 'DEMAT', 'LOAN'))
        );
        """
    )
    op.execute("CREATE INDEX idx_fin_accounts_tenant ON financial_accounts(tenant_id);")

    # Table: financial_transactions
    op.execute(
        """
        CREATE TABLE financial_transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
            transaction_date TIMESTAMPTZ NOT NULL,
            value_date TIMESTAMPTZ NULL,
            amount NUMERIC(18, 4) NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            direction VARCHAR(10) NOT NULL,
            description TEXT NOT NULL,
            category_id UUID NULL REFERENCES transaction_categories(id) ON DELETE SET NULL,
            merchant_id UUID NULL REFERENCES transaction_merchants(id) ON DELETE SET NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'POSTED',
            gl_journal_entry_id UUID NULL REFERENCES journal_entries(id) ON DELETE SET NULL,
            reconciliation_status VARCHAR(20) NOT NULL DEFAULT 'UNRECONCILED',
            source VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
            external_id VARCHAR(255) NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_tx_direction CHECK (direction IN ('DEBIT', 'CREDIT')),
            CONSTRAINT chk_tx_status CHECK (status IN ('PENDING', 'POSTED', 'CANCELLED', 'REVERSED')),
            CONSTRAINT chk_tx_recon CHECK (reconciliation_status IN ('UNRECONCILED', 'MATCHED', 'MANUALLY_VERIFIED', 'DISCREPANCY'))
        );
        """
    )
    op.execute(
        "CREATE INDEX idx_tx_tenant_date ON financial_transactions(tenant_id, transaction_date DESC);"
    )
    op.execute("CREATE INDEX idx_tx_account ON financial_transactions(account_id);")

    # Table: account_transfers
    op.execute(
        """
        CREATE TABLE account_transfers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            source_account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE RESTRICT,
            destination_account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE RESTRICT,
            source_transaction_id UUID NULL REFERENCES financial_transactions(id) ON DELETE SET NULL,
            destination_transaction_id UUID NULL REFERENCES financial_transactions(id) ON DELETE SET NULL,
            transfer_date TIMESTAMPTZ NOT NULL,
            amount NUMERIC(18, 4) NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            exchange_rate NUMERIC(18, 8) NOT NULL DEFAULT 1.00000000,
            fee_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_diff_accounts CHECK (source_account_id <> destination_account_id)
        );
        """
    )
    op.execute("CREATE INDEX idx_transfers_tenant ON account_transfers(tenant_id);")

    # Table: recurring_transaction_rules
    op.execute(
        """
        CREATE TABLE recurring_transaction_rules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
            category_id UUID NULL REFERENCES transaction_categories(id) ON DELETE SET NULL,
            merchant_id UUID NULL REFERENCES transaction_merchants(id) ON DELETE SET NULL,
            name VARCHAR(255) NOT NULL,
            expected_amount NUMERIC(18, 4) NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            direction VARCHAR(10) NOT NULL,
            recurrence_interval VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
            next_due_date DATE NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_rec_interval CHECK (recurrence_interval IN ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL'))
        );
        """
    )
    op.execute("CREATE INDEX idx_recurring_tenant ON recurring_transaction_rules(tenant_id);")

    # =========================================================================
    # 2. STAGE 3: Assets, Liabilities, Financial Instruments & FIFO Holdings
    # =========================================================================

    # Table: assets
    op.execute(
        """
        CREATE TABLE assets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            asset_class VARCHAR(50) NOT NULL,
            purchase_date DATE NOT NULL,
            purchase_price NUMERIC(18, 4) NOT NULL,
            current_valuation NUMERIC(18, 4) NOT NULL,
            valuation_date TIMESTAMPTZ NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            gl_account_id UUID NULL REFERENCES accounts(id) ON DELETE SET NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_asset_class CHECK (asset_class IN ('REAL_ESTATE', 'VEHICLE', 'PRECIOUS_METALS', 'FIXED_DEPOSIT', 'COMMODITY', 'OTHER'))
        );
        """
    )
    op.execute("CREATE INDEX idx_assets_tenant ON assets(tenant_id);")

    # Table: liabilities
    op.execute(
        """
        CREATE TABLE liabilities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            liability_type VARCHAR(50) NOT NULL,
            lender_name VARCHAR(255) NOT NULL,
            initial_principal NUMERIC(18, 4) NOT NULL,
            current_principal NUMERIC(18, 4) NOT NULL,
            interest_rate NUMERIC(7, 4) NOT NULL,
            tenure_months INT NOT NULL,
            emi_amount NUMERIC(18, 4) NOT NULL,
            start_date DATE NOT NULL,
            maturity_date DATE NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            gl_account_id UUID NULL REFERENCES accounts(id) ON DELETE SET NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_liability_type CHECK (liability_type IN ('MORTGAGE', 'HOME_LOAN', 'VEHICLE_LOAN', 'PERSONAL_LOAN', 'EDUCATION_LOAN', 'CREDIT_LINE', 'OTHER'))
        );
        """
    )
    op.execute("CREATE INDEX idx_liabilities_tenant ON liabilities(tenant_id);")

    # Table: financial_instruments
    op.execute(
        """
        CREATE TABLE financial_instruments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            symbol VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            isin VARCHAR(20) NULL UNIQUE,
            instrument_type VARCHAR(50) NOT NULL,
            exchange VARCHAR(20) NOT NULL DEFAULT 'NSE',
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            current_price NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            price_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_instrument_symbol_exchange UNIQUE (symbol, exchange),
            CONSTRAINT chk_instrument_type CHECK (instrument_type IN ('EQUITY', 'MUTUAL_FUND', 'ETF', 'BOND', 'GOLD_ETF', 'COMMODITY', 'CRYPTO'))
        );
        """
    )
    op.execute("CREATE INDEX idx_instruments_symbol ON financial_instruments(symbol);")

    # Table: investment_holding_lots (FIFO Engine)
    op.execute(
        """
        CREATE TABLE investment_holding_lots (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
            instrument_id UUID NOT NULL REFERENCES financial_instruments(id) ON DELETE RESTRICT,
            purchase_date DATE NOT NULL,
            quantity NUMERIC(18, 4) NOT NULL,
            purchase_price NUMERIC(18, 4) NOT NULL,
            cost_basis NUMERIC(18, 4) NOT NULL,
            remaining_quantity NUMERIC(18, 4) NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            lot_status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_lot_quantity CHECK (remaining_quantity >= 0.0000),
            CONSTRAINT chk_lot_status CHECK (lot_status IN ('OPEN', 'PARTIALLY_DISPOSED', 'CLOSED'))
        );
        """
    )
    op.execute(
        "CREATE INDEX idx_holding_lots_tenant ON investment_holding_lots(tenant_id, account_id, instrument_id);"
    )

    # Table: passive_income_records
    op.execute(
        """
        CREATE TABLE passive_income_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
            income_type VARCHAR(50) NOT NULL,
            instrument_id UUID NULL REFERENCES financial_instruments(id) ON DELETE SET NULL,
            asset_id UUID NULL REFERENCES assets(id) ON DELETE SET NULL,
            declaration_date DATE NULL,
            payment_date DATE NOT NULL,
            gross_amount NUMERIC(18, 4) NOT NULL,
            tax_withheld NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            net_amount NUMERIC(18, 4) NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
            transaction_id UUID NULL REFERENCES financial_transactions(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_passive_type CHECK (income_type IN ('DIVIDEND', 'INTEREST', 'RENTAL', 'ROYALTY', 'DISTRIBUTION', 'OTHER')),
            CONSTRAINT chk_passive_status CHECK (status IN ('EXPECTED', 'RECEIVED', 'RECONCILED', 'CANCELLED'))
        );
        """
    )
    op.execute("CREATE INDEX idx_passive_income_tenant ON passive_income_records(tenant_id);")

    # =========================================================================
    # 3. STAGE 4: Document Intelligence & Reconciliation
    # =========================================================================

    # Table: financial_documents
    op.execute(
        """
        CREATE TABLE financial_documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            filename VARCHAR(255) NOT NULL,
            file_size_bytes BIGINT NOT NULL,
            mime_type VARCHAR(100) NOT NULL,
            storage_path TEXT NOT NULL,
            file_hash VARCHAR(64) NOT NULL,
            document_type VARCHAR(50) NOT NULL DEFAULT 'STATEMENT',
            processing_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
            ocr_text TEXT NULL,
            extracted_data JSONB NULL,
            error_message TEXT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_doc_status CHECK (processing_status IN ('PENDING', 'PROCESSING', 'EXTRACTED', 'FAILED', 'RECONCILED'))
        );
        """
    )
    op.execute("CREATE INDEX idx_findocs_tenant ON financial_documents(tenant_id);")

    # Table: reconciliation_sessions
    op.execute(
        """
        CREATE TABLE reconciliation_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            document_id UUID NULL REFERENCES financial_documents(id) ON DELETE SET NULL,
            session_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            total_records INT NOT NULL DEFAULT 0,
            matched_records INT NOT NULL DEFAULT 0,
            discrepancy_count INT NOT NULL DEFAULT 0,
            status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_recon_status CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'DISCREPANCIES_FLAGGED', 'CANCELLED'))
        );
        """
    )
    op.execute("CREATE INDEX idx_recon_sessions_tenant ON reconciliation_sessions(tenant_id);")

    # =========================================================================
    # 4. STAGE 5: Financial Analytics Snapshots
    # =========================================================================

    # Table: analytics_snapshots
    op.execute(
        """
        CREATE TABLE analytics_snapshots (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            snapshot_type VARCHAR(50) NOT NULL DEFAULT 'MONTHLY',
            snapshot_date DATE NOT NULL,
            net_worth NUMERIC(18, 4) NOT NULL,
            total_assets NUMERIC(18, 4) NOT NULL,
            total_liabilities NUMERIC(18, 4) NOT NULL,
            liquid_cash NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            monthly_income NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            monthly_expenses NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            savings_rate NUMERIC(7, 4) NOT NULL DEFAULT 0.0000,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            metrics_data JSONB NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_tenant_snapshot_date UNIQUE (tenant_id, snapshot_type, snapshot_date)
        );
        """
    )
    op.execute(
        "CREATE INDEX idx_analytics_tenant ON analytics_snapshots(tenant_id, snapshot_date DESC);"
    )

    # =========================================================================
    # 5. STAGE 6: AI Financial Copilot
    # =========================================================================

    # Table: copilot_conversations
    op.execute(
        """
        CREATE TABLE copilot_conversations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL DEFAULT 'Financial Inquiry',
            is_archived BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX idx_copilot_conv_tenant ON copilot_conversations(tenant_id, user_id);")

    # Table: copilot_messages
    op.execute(
        """
        CREATE TABLE copilot_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            conversation_id UUID NOT NULL REFERENCES copilot_conversations(id) ON DELETE CASCADE,
            role VARCHAR(20) NOT NULL,
            content TEXT NOT NULL,
            tool_calls JSONB NULL,
            citations JSONB NULL,
            feedback VARCHAR(20) NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_copilot_role CHECK (role IN ('user', 'assistant', 'system', 'tool'))
        );
        """
    )
    op.execute(
        "CREATE INDEX idx_copilot_msg_conv ON copilot_messages(conversation_id, created_at ASC);"
    )

    # =========================================================================
    # 6. STAGE 7: Budgets, Goals, Forecasts & Scenarios
    # =========================================================================

    # Table: budgets
    op.execute(
        """
        CREATE TABLE budgets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            period_type VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            total_amount NUMERIC(18, 4) NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_budget_period CHECK (period_type IN ('MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM'))
        );
        """
    )
    op.execute("CREATE INDEX idx_budgets_tenant ON budgets(tenant_id);")

    # Table: budget_allocations
    op.execute(
        """
        CREATE TABLE budget_allocations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
            category_id UUID NOT NULL REFERENCES transaction_categories(id) ON DELETE RESTRICT,
            allocated_amount NUMERIC(18, 4) NOT NULL,
            spent_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            rollover_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_budget_category UNIQUE (budget_id, category_id)
        );
        """
    )
    op.execute("CREATE INDEX idx_allocations_budget ON budget_allocations(budget_id);")

    # Table: financial_goals
    op.execute(
        """
        CREATE TABLE financial_goals (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(50) NOT NULL DEFAULT 'SAVINGS',
            target_amount NUMERIC(18, 4) NOT NULL,
            current_amount NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            target_date DATE NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_goal_status CHECK (status IN ('IN_PROGRESS', 'ACHIEVED', 'AT_RISK', 'PAUSED', 'CANCELLED'))
        );
        """
    )
    op.execute("CREATE INDEX idx_goals_tenant ON financial_goals(tenant_id);")

    # Table: goal_contributions
    op.execute(
        """
        CREATE TABLE goal_contributions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            goal_id UUID NOT NULL REFERENCES financial_goals(id) ON DELETE CASCADE,
            transaction_id UUID NULL REFERENCES financial_transactions(id) ON DELETE SET NULL,
            contribution_date DATE NOT NULL,
            amount NUMERIC(18, 4) NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX idx_contributions_goal ON goal_contributions(goal_id);")

    # Table: forecast_runs
    op.execute(
        """
        CREATE TABLE forecast_runs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            run_name VARCHAR(255) NOT NULL,
            horizon_months INT NOT NULL DEFAULT 36,
            baseline_date DATE NOT NULL,
            assumptions JSONB NOT NULL,
            projection_data JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX idx_forecast_runs_tenant ON forecast_runs(tenant_id);")

    # Table: financial_scenarios
    op.execute(
        """
        CREATE TABLE financial_scenarios (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            description TEXT NULL,
            scenario_inputs JSONB NOT NULL,
            simulation_results JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX idx_scenarios_tenant ON financial_scenarios(tenant_id);")

    # =========================================================================
    # 7. STAGE 8: Reports, Notifications & Financial Provider Integrations
    # =========================================================================

    # Table: report_definitions
    op.execute(
        """
        CREATE TABLE report_definitions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            report_code VARCHAR(50) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            supported_formats VARCHAR(50)[] NOT NULL DEFAULT '{"PDF", "XLSX", "CSV"}',
            parameter_schema JSONB NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )

    # Table: report_jobs
    op.execute(
        """
        CREATE TABLE report_jobs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            report_type VARCHAR(50) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
            parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
            reporting_currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            export_format VARCHAR(10) NOT NULL DEFAULT 'PDF',
            download_url TEXT NULL,
            expires_at TIMESTAMPTZ NULL,
            error_message TEXT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            completed_at TIMESTAMPTZ NULL,
            CONSTRAINT chk_rep_status CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
            CONSTRAINT chk_rep_format CHECK (export_format IN ('PDF', 'XLSX', 'CSV'))
        );
        """
    )
    op.execute("CREATE INDEX idx_report_jobs_tenant ON report_jobs(tenant_id);")

    # Table: report_schedules
    op.execute(
        """
        CREATE TABLE report_schedules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            report_type VARCHAR(50) NOT NULL,
            frequency VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
            cron_expression VARCHAR(50) NULL,
            format VARCHAR(10) NOT NULL DEFAULT 'PDF',
            currency VARCHAR(3) NOT NULL DEFAULT 'INR',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            last_run_at TIMESTAMPTZ NULL,
            next_run_at TIMESTAMPTZ NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX idx_report_sched_tenant ON report_schedules(tenant_id);")

    # Table: notification_events
    op.execute(
        """
        CREATE TABLE notification_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            event_type VARCHAR(100) NOT NULL,
            category VARCHAR(50) NOT NULL,
            priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
            source_id UUID NULL,
            payload JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_notif_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'))
        );
        """
    )
    op.execute("CREATE INDEX idx_notif_events_tenant ON notification_events(tenant_id);")

    # Table: notifications (In-App Inbox)
    op.execute(
        """
        CREATE TABLE notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            event_type VARCHAR(100) NOT NULL,
            category VARCHAR(50) NOT NULL,
            priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            action_url TEXT NULL,
            read_at TIMESTAMPTZ NULL,
            archived_at TIMESTAMPTZ NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX idx_notifications_user ON notifications(tenant_id, user_id, read_at);")

    # Table: notification_preferences
    op.execute(
        """
        CREATE TABLE notification_preferences (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            category VARCHAR(50) NOT NULL,
            channel VARCHAR(20) NOT NULL DEFAULT 'IN_APP',
            is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            frequency VARCHAR(20) NOT NULL DEFAULT 'IMMEDIATE',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_notif_user_cat_chan UNIQUE (tenant_id, user_id, category, channel)
        );
        """
    )
    op.execute("CREATE INDEX idx_notif_pref_user ON notification_preferences(tenant_id, user_id);")

    # Table: financial_providers
    op.execute(
        """
        CREATE TABLE financial_providers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            provider_key VARCHAR(50) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(50) NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
            supported_products VARCHAR(50)[] NOT NULL DEFAULT '{"BANK_ACCOUNTS", "TRANSACTIONS"}',
            auth_type VARCHAR(50) NOT NULL DEFAULT 'OAUTH2',
            capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_provider_status CHECK (status IN ('AVAILABLE', 'BETA', 'REQUIRES_CONFIGURATION', 'REQUIRES_APPROVAL', 'DEPRECATED'))
        );
        """
    )

    # Table: provider_consents
    op.execute(
        """
        CREATE TABLE provider_consents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            provider_id UUID NOT NULL REFERENCES financial_providers(id) ON DELETE CASCADE,
            scopes_granted VARCHAR(50)[] NOT NULL,
            purpose TEXT NOT NULL,
            valid_until TIMESTAMPTZ NOT NULL,
            revoked_at TIMESTAMPTZ NULL,
            dpdp_notice_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX idx_consents_tenant ON provider_consents(tenant_id, user_id);")

    # Table: provider_credentials (AES-256-GCM Envelope Encrypted)
    op.execute(
        """
        CREATE TABLE provider_credentials (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            provider_id UUID NOT NULL REFERENCES financial_providers(id) ON DELETE CASCADE,
            encrypted_data TEXT NOT NULL,
            iv VARCHAR(64) NOT NULL,
            auth_tag VARCHAR(64) NOT NULL,
            key_version INT NOT NULL DEFAULT 1,
            expires_at TIMESTAMPTZ NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX idx_cred_tenant ON provider_credentials(tenant_id, provider_id);")

    # Table: provider_connections
    op.execute(
        """
        CREATE TABLE provider_connections (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            provider_id UUID NOT NULL REFERENCES financial_providers(id) ON DELETE RESTRICT,
            status VARCHAR(30) NOT NULL DEFAULT 'CONNECTED',
            account_count INT NOT NULL DEFAULT 0,
            last_successful_sync_at TIMESTAMPTZ NULL,
            error_summary TEXT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_conn_status CHECK (status IN ('PENDING_AUTHORIZATION', 'CONNECTED', 'SYNCING', 'FAILED', 'EXPIRED', 'REVOKED'))
        );
        """
    )
    op.execute("CREATE INDEX idx_prov_conn_tenant ON provider_connections(tenant_id);")

    # Table: provider_sync_cursors
    op.execute(
        """
        CREATE TABLE provider_sync_cursors (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            connection_id UUID NOT NULL REFERENCES provider_connections(id) ON DELETE CASCADE,
            cursor_token TEXT NOT NULL,
            last_sync_timestamp TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_connection_cursor UNIQUE (connection_id)
        );
        """
    )
    op.execute("CREATE INDEX idx_cursors_tenant ON provider_sync_cursors(tenant_id);")

    # =========================================================================
    # 8. POSTGRESQL ROW-LEVEL SECURITY (FORCE RLS & RESTRICTIVE POLICIES)
    # =========================================================================

    tenant_tables = [
        "transaction_categories",
        "transaction_merchants",
        "financial_accounts",
        "financial_transactions",
        "account_transfers",
        "recurring_transaction_rules",
        "assets",
        "liabilities",
        "investment_holding_lots",
        "passive_income_records",
        "financial_documents",
        "reconciliation_sessions",
        "analytics_snapshots",
        "copilot_conversations",
        "copilot_messages",
        "budgets",
        "budget_allocations",
        "financial_goals",
        "goal_contributions",
        "forecast_runs",
        "financial_scenarios",
        "report_jobs",
        "report_schedules",
        "notification_events",
        "notifications",
        "notification_preferences",
        "provider_consents",
        "provider_credentials",
        "provider_connections",
        "provider_sync_cursors",
    ]

    for tbl in tenant_tables:
        op.execute(f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE {tbl} FORCE ROW LEVEL SECURITY;")
        op.execute(
            f"""
            CREATE POLICY {tbl}_tenant_isolation ON {tbl}
                AS RESTRICTIVE
                USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
                WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
            """
        )
        op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {tbl} TO wealthos_app;")

    # Global lookup tables (read-only for wealthos_app)
    global_tables = [
        "financial_institutions",
        "financial_instruments",
        "report_definitions",
        "financial_providers",
    ]
    for tbl in global_tables:
        op.execute(f"GRANT SELECT ON {tbl} TO wealthos_app;")

    # =========================================================================
    # 9. RBAC PERMISSIONS SEEDING ACROSS ALL DOMAINS
    # =========================================================================

    new_permissions = [
        # Finance
        ("finance:accounts:read", "Read financial accounts", "finance"),
        ("finance:accounts:write", "Create and modify financial accounts", "finance"),
        ("finance:transactions:read", "Read transactions", "finance"),
        ("finance:transactions:write", "Record transactions and transfers", "finance"),
        ("finance:categories:manage", "Manage categories and merchants", "finance"),
        # Portfolio
        ("portfolio:assets:read", "Read assets and liabilities", "portfolio"),
        ("portfolio:assets:write", "Create and update assets and liabilities", "portfolio"),
        ("portfolio:investments:read", "Read investment holdings and P&L", "portfolio"),
        ("portfolio:investments:write", "Execute investment transactions", "portfolio"),
        ("portfolio:passive_income:read", "Read passive income records", "portfolio"),
        # Documents
        ("documents:upload", "Upload financial documents", "documents"),
        ("documents:read", "Read financial documents and OCR data", "documents"),
        ("documents:reconcile", "Review and approve reconciliation", "documents"),
        # Analytics
        ("analytics:snapshots:read", "Read analytical dashboards and snapshots", "analytics"),
        # Copilot
        ("copilot:chat", "Interact with AI Financial Copilot", "copilot"),
        # Planning
        ("planning:budgets:read", "Read budgets and utilization", "planning"),
        ("planning:budgets:write", "Create and manage budgets", "planning"),
        ("planning:goals:read", "Read goals and milestones", "planning"),
        ("planning:goals:write", "Create goals and record contributions", "planning"),
        ("planning:forecasts:read", "Read forecasts and scenarios", "planning"),
        ("planning:forecasts:simulate", "Run scenario simulations", "planning"),
        # Reporting
        ("reporting:reports:read", "Read and download reports", "reporting"),
        ("reporting:reports:generate", "Generate and schedule reports", "reporting"),
        # Notifications
        ("notifications:read", "Read in-app notifications", "notifications"),
        ("notifications:preferences:manage", "Manage notification preferences", "notifications"),
        # Integrations
        ("integrations:providers:read", "Read connected providers and status", "integrations"),
        ("integrations:providers:manage", "Authorize and revoke providers", "integrations"),
        ("integrations:sync:trigger", "Trigger manual sync", "integrations"),
    ]

    for perm_name, desc, domain in new_permissions:
        op.execute(
            f"""
            INSERT INTO permissions (name, description, domain)
            VALUES ('{perm_name}', '{desc}', '{domain}')
            ON CONFLICT (name) DO NOTHING;
            """
        )

    # Role mappings
    all_perm_names = [p[0] for p in new_permissions]
    read_only_perm_names = [
        p[0] for p in new_permissions if ":read" in p[0] or p[0] == "copilot:chat"
    ]

    role_mappings = [
        ("owner", all_perm_names),
        ("admin", all_perm_names),
        ("member", all_perm_names),
        ("viewer", read_only_perm_names),
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
    domains = [
        "finance",
        "portfolio",
        "documents",
        "analytics",
        "copilot",
        "planning",
        "reporting",
        "notifications",
        "integrations",
    ]
    for dom in domains:
        op.execute(f"DELETE FROM permissions WHERE domain = '{dom}';")

    # 2. Drop RLS policies & disable RLS
    tenant_tables = [
        "provider_sync_cursors",
        "provider_connections",
        "provider_credentials",
        "provider_consents",
        "notification_preferences",
        "notifications",
        "notification_events",
        "report_schedules",
        "report_jobs",
        "financial_scenarios",
        "forecast_runs",
        "goal_contributions",
        "financial_goals",
        "budget_allocations",
        "budgets",
        "copilot_messages",
        "copilot_conversations",
        "analytics_snapshots",
        "reconciliation_sessions",
        "financial_documents",
        "passive_income_records",
        "investment_holding_lots",
        "liabilities",
        "assets",
        "recurring_transaction_rules",
        "account_transfers",
        "financial_transactions",
        "financial_accounts",
        "transaction_merchants",
        "transaction_categories",
    ]

    for tbl in tenant_tables:
        op.execute(f"DROP POLICY IF EXISTS {tbl}_tenant_isolation ON {tbl};")
        op.execute(f"ALTER TABLE {tbl} NO FORCE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE {tbl} DISABLE ROW LEVEL SECURITY;")

    # 3. Drop tables in reverse topological order
    all_tables = tenant_tables + [
        "financial_providers",
        "report_definitions",
        "financial_instruments",
        "financial_institutions",
    ]

    for tbl in all_tables:
        op.execute(f"DROP TABLE IF EXISTS {tbl} CASCADE;")
