"""Integration tests for Chart of Accounts management, hierarchy validation, and standard template seeding."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenant_context import set_db_tenant_context
from app.domains.accounting.domain.accounting_rules import AccountType, NormalBalance
from app.domains.accounting.domain.exceptions import CircularAccountHierarchyError
from app.domains.accounting.schemas.account import (
    CreateAccountRequest,
    UpdateAccountRequest,
)
from app.domains.accounting.services.chart_of_accounts import ChartOfAccountsService


@pytest.mark.asyncio
async def test_create_account_and_normal_balance_defaults(
    db_session: AsyncSession,
    test_user_factory,
):
    """Verify account creation and automatic normal balance defaulting."""
    user, tenant, _ = await test_user_factory(email="coa.test1@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    # Asset -> DEBIT default
    req_asset = CreateAccountRequest(
        account_code="1020",
        account_name="HDFC Bank",
        account_type=AccountType.ASSET,
    )
    asset = await ChartOfAccountsService.create_account(db_session, tenant.id, req_asset)
    assert asset.account_code == "1020"
    assert asset.account_type == AccountType.ASSET.value
    assert asset.normal_balance == NormalBalance.DEBIT.value

    # Liability -> CREDIT default
    req_liab = CreateAccountRequest(
        account_code="2010",
        account_name="HDFC Credit Card",
        account_type=AccountType.LIABILITY,
    )
    liab = await ChartOfAccountsService.create_account(db_session, tenant.id, req_liab)
    assert liab.normal_balance == NormalBalance.CREDIT.value

    # Income -> CREDIT default
    req_inc = CreateAccountRequest(
        account_code="4010",
        account_name="Tech Salary",
        account_type=AccountType.INCOME,
    )
    inc = await ChartOfAccountsService.create_account(db_session, tenant.id, req_inc)
    assert inc.normal_balance == NormalBalance.CREDIT.value

    # Expense -> DEBIT default
    req_exp = CreateAccountRequest(
        account_code="5010",
        account_name="Apartment Rent",
        account_type=AccountType.EXPENSE,
    )
    exp = await ChartOfAccountsService.create_account(db_session, tenant.id, req_exp)
    assert exp.normal_balance == NormalBalance.DEBIT.value


@pytest.mark.asyncio
async def test_circular_reference_prevention(
    db_session: AsyncSession,
    test_user_factory,
):
    """Verify that circular parent-child account assignments are strictly blocked."""
    user, tenant, _ = await test_user_factory(email="coa.cycle@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user.id)

    # Create root A
    a = await ChartOfAccountsService.create_account(
        db_session,
        tenant.id,
        CreateAccountRequest(
            account_code="1000", account_name="Node A", account_type=AccountType.ASSET
        ),
    )
    # Create child B under A
    b = await ChartOfAccountsService.create_account(
        db_session,
        tenant.id,
        CreateAccountRequest(
            account_code="1010",
            account_name="Node B",
            account_type=AccountType.ASSET,
            parent_account_id=a.id,
        ),
    )
    # Create child C under B
    c = await ChartOfAccountsService.create_account(
        db_session,
        tenant.id,
        CreateAccountRequest(
            account_code="1020",
            account_name="Node C",
            account_type=AccountType.ASSET,
            parent_account_id=b.id,
        ),
    )

    # 1. Attempt self-parenting on A
    with pytest.raises(CircularAccountHierarchyError, match="cannot be its own parent"):
        await ChartOfAccountsService.update_account(
            db_session,
            tenant.id,
            a.id,
            UpdateAccountRequest(parent_account_id=a.id),
        )

    # 2. Attempt indirect circular reference: make A child of C (A -> B -> C -> A)
    with pytest.raises(CircularAccountHierarchyError, match="Circular reference detected"):
        await ChartOfAccountsService.update_account(
            db_session,
            tenant.id,
            a.id,
            UpdateAccountRequest(parent_account_id=c.id),
        )


@pytest.mark.asyncio
async def test_seed_standard_chart_of_accounts_idempotency(
    client: AsyncClient,
    test_user_factory,
):
    """Verify that standard Chart of Accounts template seeds standard accounts idempotently."""
    user, tenant, token = await test_user_factory(email="coa.seed@example.com")
    headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(tenant.id)}

    # Seed 1st time
    res1 = await client.post("/api/v1/accounting/accounts/seed", headers=headers)
    assert res1.status_code == 201
    accounts1 = res1.json()
    assert len(accounts1) == 52

    # Seed 2nd time (must be idempotent: no crash, 0 new accounts created)
    res2 = await client.post("/api/v1/accounting/accounts/seed", headers=headers)
    assert res2.status_code == 201
    accounts2 = res2.json()
    assert len(accounts2) == 0

    # Verify listing
    res_list = await client.get("/api/v1/accounting/accounts", headers=headers)
    assert res_list.status_code == 200
    all_accounts = res_list.json()
    assert len(all_accounts) == 52

    codes = [a["account_code"] for a in all_accounts]
    assert "1000" in codes
    assert "1020" in codes
    assert "2010" in codes
    assert "3010" in codes
    assert "4010" in codes
    assert "5010" in codes
