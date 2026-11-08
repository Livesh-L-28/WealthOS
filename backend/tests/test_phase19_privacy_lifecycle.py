"""WealthOS Phase 19 Workstream 8: Privacy, Consent & Data Lifecycle Tests.

Validates granular purpose-specific consent granting and revocation,
statutory financial retention holds (8-year audit invariance), and automated purge eligibility.
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.identity.models import User
from app.domains.privacy.consent_service import (
    ConsentPurpose,
    DataConsentService,
)
from app.domains.privacy.lifecycle_engine import DataLifecycleEngine
from app.domains.tenants.models import Tenant


@pytest.fixture
async def privacy_test_context(db_session: AsyncSession):
    """Seed test tenant and user for privacy tests."""
    tenant = Tenant(
        id=uuid.uuid4(),
        name="Privacy Workspace",
        slug=f"privacy-ws-{uuid.uuid4().hex[:6]}",
        status="ACTIVE",
    )
    db_session.add(tenant)

    user = User(
        id=uuid.uuid4(),
        email=f"privacy-user-{uuid.uuid4().hex[:6]}@wealthos.test",
        first_name="Grace",
        last_name="Hopper",
        status="active",
    )
    db_session.add(user)
    await db_session.flush()

    await db_session.execute(
        text("SELECT set_config('app.current_tenant_id', :tid, false);"),
        {"tid": str(tenant.id)},
    )
    return {"tenant_id": tenant.id, "user_id": user.id}


@pytest.mark.asyncio
async def test_data_consent_lifecycle(
    db_session: AsyncSession,
    privacy_test_context: dict,
):
    """Verify purpose-specific consent granting, verification, and revocation."""
    tenant_id = privacy_test_context["tenant_id"]
    user_id = privacy_test_context["user_id"]
    consent_svc = DataConsentService(db_session)

    # 1. Grant consent for Account Aggregation & AI Copilot
    await consent_svc.grant_consent(tenant_id, user_id, ConsentPurpose.ACCOUNT_AGGREGATION)
    await consent_svc.grant_consent(tenant_id, user_id, ConsentPurpose.AI_COPILOT_PROCESSING)

    assert await consent_svc.has_active_consent(tenant_id, user_id, ConsentPurpose.ACCOUNT_AGGREGATION) is True
    assert await consent_svc.has_active_consent(tenant_id, user_id, ConsentPurpose.AI_COPILOT_PROCESSING) is True
    assert await consent_svc.has_active_consent(tenant_id, user_id, ConsentPurpose.TAX_PREPARATION_EXPORT) is False

    # 2. Revoke Account Aggregation
    revoked = await consent_svc.revoke_consent(
        tenant_id, user_id, ConsentPurpose.ACCOUNT_AGGREGATION, reason="USER_OPTOUT"
    )
    assert revoked is True

    # Account Aggregation revoked, AI Copilot remains active
    assert await consent_svc.has_active_consent(tenant_id, user_id, ConsentPurpose.ACCOUNT_AGGREGATION) is False
    assert await consent_svc.has_active_consent(tenant_id, user_id, ConsentPurpose.AI_COPILOT_PROCESSING) is True

    # 3. Retrieve Consent Audit Matrix
    matrix = await consent_svc.get_user_consent_matrix(tenant_id, user_id)
    assert len(matrix) >= 2


def test_data_lifecycle_statutory_retention_holds():
    """Verify statutory retention hold shields general ledger records from premature deletion."""
    # Case 1: Journal entries at 500 days (Must NOT be purgeable under 8-year statutory hold)
    eval_ledger = DataLifecycleEngine.evaluate_purge_eligibility("journal_entries", record_age_days=500)
    assert eval_ledger["is_purge_eligible"] is False
    assert "Statutory retention hold active" in eval_ledger["reason"]

    # Case 2: Financial documents at 1200 days (> 1095 days / 3 years retention)
    eval_doc = DataLifecycleEngine.evaluate_purge_eligibility("financial_documents", record_age_days=1200)
    assert eval_doc["is_purge_eligible"] is True

    # Case 3: Active regulatory dispute blocks even expired document purges
    eval_dispute = DataLifecycleEngine.evaluate_purge_eligibility(
        "financial_documents", record_age_days=1200, has_active_dispute=True
    )
    assert eval_dispute["is_purge_eligible"] is False
    assert "regulatory inquiry hold" in eval_dispute["reason"]

    # Case 4: Unknown entity fails closed
    eval_unknown = DataLifecycleEngine.evaluate_purge_eligibility("unregistered_entity", record_age_days=9999)
    assert eval_unknown["is_purge_eligible"] is False
    assert "Unknown entity type" in eval_unknown["reason"]

    # Case 5: Complete retention matrix inventory
    matrix = DataLifecycleEngine.get_retention_matrix()
    assert len(matrix) >= 7
    statutory_types = {item["entity_type"] for item in matrix if item["is_statutory_hold"]}
    assert "journal_entries" in statutory_types
    assert "investment_holding_lots" in statutory_types
    assert "passive_income_records" in statutory_types
