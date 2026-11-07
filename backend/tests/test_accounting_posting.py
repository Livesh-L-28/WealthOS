"""Integration tests for atomic journal posting and audit event dispatch."""

from datetime import date
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.audit.models import SecurityAuditLog


@pytest.fixture
async def setup_tenant_and_accounts(client: AsyncClient, test_user_factory):
    user, tenant, token = await test_user_factory(email="posting.flow@example.com")
    headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(tenant.id)}

    await client.post("/api/v1/accounting/accounts/seed", headers=headers)
    res_list = await client.get("/api/v1/accounting/accounts", headers=headers)
    account_map = {a["account_code"]: a["id"] for a in res_list.json()}
    return user, tenant, headers, account_map


@pytest.mark.asyncio
async def test_draft_to_posted_lifecycle_and_audit_event(
    client: AsyncClient,
    db_session: AsyncSession,
    setup_tenant_and_accounts,
):
    """Test full DRAFT -> POSTED lifecycle with immutable audit log verification."""
    user, tenant, headers, accts = setup_tenant_and_accounts

    # 1. Create DRAFT journal entry
    draft_res = await client.post(
        "/api/v1/accounting/journals",
        headers=headers,
        json={
            "entry_date": str(date.today()),
            "description": "Consulting invoice receivable",
            "source_type": "INVOICE",
            "lines": [
                {
                    "account_id": accts["1020"],
                    "debit_amount": "50000.0000",
                    "credit_amount": "0.0000",
                },
                {
                    "account_id": accts["4020"],
                    "debit_amount": "0.0000",
                    "credit_amount": "50000.0000",
                },
            ],
        },
    )
    assert draft_res.status_code == 201
    draft_data = draft_res.json()
    assert draft_data["status"] == "DRAFT"
    assert draft_data["posted_at"] is None
    entry_id = draft_data["id"]

    # 2. Post the DRAFT entry
    post_res = await client.post(f"/api/v1/accounting/journals/{entry_id}/post", headers=headers)
    assert post_res.status_code == 200
    posted_data = post_res.json()
    assert posted_data["status"] == "POSTED"
    assert posted_data["posted_at"] is not None
    assert posted_data["posted_by"] == str(user.id)
    assert Decimal(posted_data["total_debit"]) == Decimal("50000.0000")

    # 3. Attempt to delete posted entry (must be rejected)
    del_res = await client.delete(f"/api/v1/accounting/journals/{entry_id}", headers=headers)
    assert del_res.status_code == 400

    # 4. Verify Security Audit Log was emitted
    from app.core.tenant_context import set_db_tenant_context

    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)
    audit_stmt = select(SecurityAuditLog).where(
        SecurityAuditLog.tenant_id == tenant.id,
        SecurityAuditLog.event_type == "accounting.journal_posted",
    )
    audit_res = await db_session.execute(audit_stmt)
    audit_entry = audit_res.scalar_one_or_none()
    assert audit_entry is not None
    assert audit_entry.status == "success"
    assert audit_entry.details["journal_entry_id"] == entry_id
