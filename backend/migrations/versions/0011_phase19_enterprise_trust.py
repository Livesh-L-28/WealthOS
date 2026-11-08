"""Phase 19: Enterprise Trust, Financial Integrity, Resilience, Identity & Compliance.

Revision ID: 0011_phase19_enterprise_trust
Revises: 0010_wave_4_intelligence
Create Date: 2026-11-08 18:25:00.000000

Workstreams implemented:
- Workstream 1: Transactional Outbox, Idempotency, and Financial Data Lineage.
- Workstream 4: WebAuthn Passkeys, Device Registry, and Scoped API Keys.
- Workstream 6: Tenant Resource Quotas & Rate Limits.
- Workstream 8: Purpose-Specific Data Consent Governance.
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0011_phase19_enterprise_trust"
down_revision: str | None = "0010_wave_4_intelligence"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # -------------------------------------------------------------------------
    # 1. Transactional Outbox Events (Workstream 1.1)
    # -------------------------------------------------------------------------
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS outbox_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            aggregate_type VARCHAR(50) NOT NULL,
            aggregate_id VARCHAR(100) NOT NULL,
            event_type VARCHAR(100) NOT NULL,
            event_version INT NOT NULL DEFAULT 1,
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
            retry_count INT NOT NULL DEFAULT 0,
            max_retries INT NOT NULL DEFAULT 5,
            last_error TEXT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            processed_at TIMESTAMPTZ NULL,
            CONSTRAINT chk_outbox_status CHECK (status IN ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED'))
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_outbox_tenant_status ON outbox_events(tenant_id, status);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_outbox_created_at ON outbox_events(created_at);")
    op.execute("ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;")
    op.execute(
        """
        CREATE POLICY outbox_tenant_isolation ON outbox_events FOR ALL TO wealthos_app
            USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
        """
    )

    # -------------------------------------------------------------------------
    # 2. Universal API Idempotency Records (Workstream 1.2)
    # -------------------------------------------------------------------------
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS api_idempotency_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            idempotency_key VARCHAR(128) NOT NULL,
            operation VARCHAR(100) NOT NULL,
            request_hash VARCHAR(64) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
            response_code INT NULL,
            response_body JSONB NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL,
            CONSTRAINT uq_idempotency_tenant_key UNIQUE (tenant_id, idempotency_key),
            CONSTRAINT chk_idempotency_status CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED'))
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_idempotency_lookup ON api_idempotency_records(tenant_id, idempotency_key);")
    op.execute("ALTER TABLE api_idempotency_records ENABLE ROW LEVEL SECURITY;")
    op.execute(
        """
        CREATE POLICY idempotency_tenant_isolation ON api_idempotency_records FOR ALL TO wealthos_app
            USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
        """
    )

    # -------------------------------------------------------------------------
    # 3. Financial Data Lineage (Workstream 1.6)
    # -------------------------------------------------------------------------
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS financial_data_lineage (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            entity_type VARCHAR(50) NOT NULL,
            entity_id UUID NOT NULL,
            source_type VARCHAR(50) NOT NULL,
            source_id VARCHAR(100) NULL,
            batch_id VARCHAR(100) NULL,
            transformation_rule VARCHAR(100) NULL,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_data_lineage_entity ON financial_data_lineage(tenant_id, entity_type, entity_id);")
    op.execute("ALTER TABLE financial_data_lineage ENABLE ROW LEVEL SECURITY;")
    op.execute(
        """
        CREATE POLICY lineage_tenant_isolation ON financial_data_lineage FOR ALL TO wealthos_app
            USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
        """
    )

    # -------------------------------------------------------------------------
    # 4. Trusted Device Registry (Workstream 4.2)
    # -------------------------------------------------------------------------
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS device_registries (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            device_fingerprint VARCHAR(128) NOT NULL,
            device_name VARCHAR(100) NOT NULL,
            device_type VARCHAR(50) NOT NULL DEFAULT 'WEB_DESKTOP',
            client_ip VARCHAR(45) NULL,
            is_trusted BOOLEAN NOT NULL DEFAULT TRUE,
            is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
            revoked_at TIMESTAMPTZ NULL,
            last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_device_registry_user ON device_registries(user_id, device_fingerprint);")

    # -------------------------------------------------------------------------
    # 5. WebAuthn Passkey Credentials (Workstream 4.1)
    # -------------------------------------------------------------------------
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS webauthn_credentials (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            credential_id VARCHAR(255) UNIQUE NOT NULL,
            public_key TEXT NOT NULL,
            sign_count INT NOT NULL DEFAULT 0,
            aaguid VARCHAR(36) NULL,
            credential_name VARCHAR(100) NOT NULL DEFAULT 'Passkey',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_used_at TIMESTAMPTZ NULL
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_webauthn_user ON webauthn_credentials(user_id);")

    # -------------------------------------------------------------------------
    # 6. Scoped Developer API Keys (Workstream 4.6)
    # -------------------------------------------------------------------------
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS user_api_keys (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            key_name VARCHAR(100) NOT NULL,
            key_prefix VARCHAR(12) NOT NULL,
            key_hash VARCHAR(64) NOT NULL,
            scopes JSONB NOT NULL DEFAULT '["read"]'::jsonb,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            expires_at TIMESTAMPTZ NULL,
            last_used_at TIMESTAMPTZ NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_api_keys_lookup ON user_api_keys(tenant_id, key_hash);")
    op.execute("ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;")
    op.execute(
        """
        CREATE POLICY api_keys_tenant_isolation ON user_api_keys FOR ALL TO wealthos_app
            USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
        """
    )

    # -------------------------------------------------------------------------
    # 7. Tenant Resource Quotas (Workstream 6.2)
    # -------------------------------------------------------------------------
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS tenant_resource_quotas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            tier_name VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
            max_daily_ocr_documents INT NOT NULL DEFAULT 100,
            max_daily_ai_requests INT NOT NULL DEFAULT 500,
            max_daily_report_exports INT NOT NULL DEFAULT 50,
            max_concurrent_syncs INT NOT NULL DEFAULT 5,
            used_ocr_count INT NOT NULL DEFAULT 0,
            used_ai_count INT NOT NULL DEFAULT 0,
            used_report_count INT NOT NULL DEFAULT 0,
            quota_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_tenant_quotas ON tenant_resource_quotas(tenant_id);")
    op.execute("ALTER TABLE tenant_resource_quotas ENABLE ROW LEVEL SECURITY;")
    op.execute(
        """
        CREATE POLICY quotas_tenant_isolation ON tenant_resource_quotas FOR ALL TO wealthos_app
            USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
        """
    )

    # -------------------------------------------------------------------------
    # 8. Purpose-Specific Data Consent Governance (Workstream 8.2)
    # -------------------------------------------------------------------------
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS data_consent_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            purpose VARCHAR(50) NOT NULL,
            consent_version VARCHAR(20) NOT NULL DEFAULT '1.0',
            status VARCHAR(20) NOT NULL DEFAULT 'GRANTED',
            granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            revoked_at TIMESTAMPTZ NULL,
            expires_at TIMESTAMPTZ NULL,
            audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            CONSTRAINT chk_consent_status CHECK (status IN ('GRANTED', 'REVOKED', 'EXPIRED'))
        );
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_consent_tenant_user ON data_consent_records(tenant_id, user_id, purpose);")
    op.execute("ALTER TABLE data_consent_records ENABLE ROW LEVEL SECURITY;")
    op.execute(
        """
        CREATE POLICY consent_tenant_isolation ON data_consent_records FOR ALL TO wealthos_app
            USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS data_consent_records CASCADE;")
    op.execute("DROP TABLE IF EXISTS tenant_resource_quotas CASCADE;")
    op.execute("DROP TABLE IF EXISTS user_api_keys CASCADE;")
    op.execute("DROP TABLE IF EXISTS webauthn_credentials CASCADE;")
    op.execute("DROP TABLE IF EXISTS device_registries CASCADE;")
    op.execute("DROP TABLE IF EXISTS financial_data_lineage CASCADE;")
    op.execute("DROP TABLE IF EXISTS api_idempotency_records CASCADE;")
    op.execute("DROP TABLE IF EXISTS outbox_events CASCADE;")
