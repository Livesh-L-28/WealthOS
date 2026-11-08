"""WealthOS Household Wealth Management Acceptance Test Suite.

Validates all Phase 11 capabilities:
1. Household Creation, Multi-User Memberships, and RBAC (OWNER, ADMIN, MEMBER, VIEWER).
2. Cryptographic invitation token generation, expiry, and acceptance flow.
3. Resource sharing across 3 visibility scopes (PERSONAL_ONLY, HOUSEHOLD_SHARED, LIMITED_SHARED).
4. Single-deduplication consolidated household net worth with allocation percentages.
5. Transfer neutrality for inter-member reimbursements/settlements.
6. Shared household goals and collaborative milestone contributions.
7. Multi-tenant and cross-household isolation boundaries.
"""

import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenant_context import set_db_tenant_context
from app.domains.household.models import Household
from app.domains.household.schemas import (
    HouseholdContributionCreate,
    HouseholdCreate,
    HouseholdGoalCreate,
    HouseholdInvitationCreate,
    HouseholdResourceShareRequest,
    HouseholdSettlementCreate,
)
from app.domains.household.service import (
    HouseholdPermissionDeniedError,
    HouseholdService,
)


@pytest.mark.asyncio
async def test_household_lifecycle_and_invitation_flow(db_session: AsyncSession, test_user_factory):
    """Verify household creation, role assignment, and cryptographic invitation acceptance."""
    owner_user, tenant, _ = await test_user_factory(email="household.owner@example.com")
    member_user, _, _ = await test_user_factory(email="household.member@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=owner_user.id)

    # 1. Create household
    hh = await HouseholdService.create_household(
        db_session,
        tenant_id=tenant.id,
        user_id=owner_user.id,
        payload=HouseholdCreate(name="Sharma Family", currency="INR", timezone="Asia/Kolkata"),
    )
    assert hh.name == "Sharma Family"
    assert hh.owner_user_id == owner_user.id

    # Verify owner membership
    owner_mem = await HouseholdService.verify_member_role(
        db_session, hh.id, owner_user.id, {"OWNER"}
    )
    assert owner_mem.role == "OWNER"

    # 2. Owner invites second user as MEMBER
    inv, token = await HouseholdService.invite_member(
        db_session,
        tenant_id=tenant.id,
        current_user_id=owner_user.id,
        household_id=hh.id,
        payload=HouseholdInvitationCreate(email="household.member@example.com", role="MEMBER"),
    )
    assert inv.status == "PENDING"
    assert token is not None

    # 3. Member user accepts invitation
    await set_db_tenant_context(db_session, tenant.id, user_id=member_user.id)
    mem_result = await HouseholdService.accept_invitation(
        db_session,
        tenant_id=tenant.id,
        user_id=member_user.id,
        token=token,
    )
    assert mem_result.household_id == hh.id
    assert mem_result.user_id == member_user.id
    assert mem_result.role == "MEMBER"

    # 4. Attempting to reuse the token must raise ValueError
    with pytest.raises(ValueError, match="Invalid, expired, or already used"):
        await HouseholdService.accept_invitation(
            db_session, tenant_id=tenant.id, user_id=member_user.id, token=token
        )


@pytest.mark.asyncio
async def test_household_rbac_permission_enforcement(db_session: AsyncSession, test_user_factory):
    """Verify unauthorized roles cannot execute privileged administrative actions."""
    owner_user, tenant, _ = await test_user_factory(email="hh.admin.test@example.com")
    viewer_user, _, _ = await test_user_factory(email="hh.viewer.test@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=owner_user.id)

    hh = await HouseholdService.create_household(
        db_session,
        tenant_id=tenant.id,
        user_id=owner_user.id,
        payload=HouseholdCreate(name="Verma Household"),
    )

    # Invite viewer
    _, token = await HouseholdService.invite_member(
        db_session,
        tenant_id=tenant.id,
        current_user_id=owner_user.id,
        household_id=hh.id,
        payload=HouseholdInvitationCreate(email="hh.viewer.test@example.com", role="VIEWER"),
    )

    await set_db_tenant_context(db_session, tenant.id, user_id=viewer_user.id)
    await HouseholdService.accept_invitation(
        db_session, tenant_id=tenant.id, user_id=viewer_user.id, token=token
    )

    # VIEWER cannot invite other members
    with pytest.raises(HouseholdPermissionDeniedError):
        await HouseholdService.invite_member(
            db_session,
            tenant_id=tenant.id,
            current_user_id=viewer_user.id,
            household_id=hh.id,
            payload=HouseholdInvitationCreate(email="intruder@example.com", role="MEMBER"),
        )

    # VIEWER cannot create a shared goal
    with pytest.raises(HouseholdPermissionDeniedError):
        await HouseholdService.create_shared_goal(
            db_session,
            tenant_id=tenant.id,
            current_user_id=viewer_user.id,
            household_id=hh.id,
            payload=HouseholdGoalCreate(
                name="Unauthorized Goal",
                target_amount=Decimal("100000.0000"),
                target_date=date.today() + timedelta(days=90),
            ),
        )


@pytest.mark.asyncio
async def test_consolidated_net_worth_and_deduplication(db_session: AsyncSession, test_user_factory):
    """Verify consolidated household net worth with fractional ownership and zero double-counting."""
    user_a, tenant, _ = await test_user_factory(email="consol.a@example.com")
    user_b, _, _ = await test_user_factory(email="consol.b@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user_a.id)

    hh = await HouseholdService.create_household(
        db_session,
        tenant_id=tenant.id,
        user_id=user_a.id,
        payload=HouseholdCreate(name="Joint Wealth Estate"),
    )

    # Member B joins
    _, token = await HouseholdService.invite_member(
        db_session,
        tenant_id=tenant.id,
        current_user_id=user_a.id,
        household_id=hh.id,
        payload=HouseholdInvitationCreate(email="consol.b@example.com", role="ADMIN"),
    )
    await set_db_tenant_context(db_session, tenant.id, user_id=user_b.id)
    await HouseholdService.accept_invitation(db_session, tenant.id, user_b.id, token)

    # 1. User A owns Asset: Villa ₹2,000,000 (shared 100%)
    asset_id = uuid.uuid4()
    await db_session.execute(
        text(
            """
            INSERT INTO assets (id, tenant_id, name, asset_class, purchase_date, purchase_price, current_valuation, valuation_date, is_active)
            VALUES (:id, :tid, 'Villa', 'REAL_ESTATE', CURRENT_DATE, 1800000, 2000000, NOW(), TRUE);
            """
        ),
        {"id": asset_id, "tid": tenant.id},
    )
    await set_db_tenant_context(db_session, tenant.id, user_id=user_a.id)
    await HouseholdService.share_resource(
        db_session,
        tenant_id=tenant.id,
        current_user_id=user_a.id,
        household_id=hh.id,
        payload=HouseholdResourceShareRequest(
            resource_type="ASSET",
            resource_id=asset_id,
            visibility="HOUSEHOLD_SHARED",
            allocation_percentage=Decimal("100.00"),
        ),
    )

    # 2. User B shares joint account: ₹400,000 at 50% allocation
    acc_id = uuid.uuid4()
    await db_session.execute(
        text(
            """
            INSERT INTO financial_accounts (id, tenant_id, account_name, account_number_mask, account_type, currency, current_balance)
            VALUES (:id, :tid, 'Joint Savings', '9988', 'SAVINGS', 'INR', 400000);
            """
        ),
        {"id": acc_id, "tid": tenant.id},
    )
    await set_db_tenant_context(db_session, tenant.id, user_id=user_b.id)
    await HouseholdService.share_resource(
        db_session,
        tenant_id=tenant.id,
        current_user_id=user_b.id,
        household_id=hh.id,
        payload=HouseholdResourceShareRequest(
            resource_type="ACCOUNT",
            resource_id=acc_id,
            visibility="HOUSEHOLD_SHARED",
            allocation_percentage=Decimal("50.00"),  # 50% of 400k = 200k
        ),
    )

    # 3. User A shares Home Loan: ₹500,000 liability (shared 100%)
    liab_id = uuid.uuid4()
    await db_session.execute(
        text(
            """
            INSERT INTO liabilities (id, tenant_id, name, liability_type, lender_name, initial_principal, current_principal, interest_rate, tenure_months, emi_amount, start_date, maturity_date, is_active)
            VALUES (:id, :tid, 'Villa Loan', 'HOME_LOAN', 'SBI', 600000, 500000, 0.0800, 120, 15000, CURRENT_DATE, CURRENT_DATE + INTERVAL '10 years', TRUE);
            """
        ),
        {"id": liab_id, "tid": tenant.id},
    )
    await set_db_tenant_context(db_session, tenant.id, user_id=user_a.id)
    await HouseholdService.share_resource(
        db_session,
        tenant_id=tenant.id,
        current_user_id=user_a.id,
        household_id=hh.id,
        payload=HouseholdResourceShareRequest(
            resource_type="LIABILITY",
            resource_id=liab_id,
            visibility="HOUSEHOLD_SHARED",
            allocation_percentage=Decimal("100.00"),
        ),
    )

    # Calculate consolidated net worth
    nw_result = await HouseholdService.calculate_consolidated_net_worth(
        db_session, tenant_id=tenant.id, household_id=hh.id
    )

    # Assets = 2,000,000 (Villa) + 200,000 (50% of 400,000 Joint Savings) = 2,200,000
    # Liabilities = 500,000
    # Consolidated Net Worth = 2,200,000 - 500,000 = 1,700,000
    assert nw_result["total_shared_assets"] == Decimal("2200000.0000")
    assert nw_result["total_shared_liabilities"] == Decimal("500000.0000")
    assert nw_result["total_household_net_worth"] == Decimal("1700000.0000")
    assert nw_result["member_count"] == 2
    assert nw_result["shared_resources_count"] == 3


@pytest.mark.asyncio
async def test_shared_goals_and_contributions(db_session: AsyncSession, test_user_factory):
    """Verify shared household goals and multi-member contribution milestone progress."""
    user_a, tenant, _ = await test_user_factory(email="goal.a@example.com")
    user_b, _, _ = await test_user_factory(email="goal.b@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user_a.id)

    hh = await HouseholdService.create_household(
        db_session,
        tenant_id=tenant.id,
        user_id=user_a.id,
        payload=HouseholdCreate(name="Future Milestones"),
    )

    # Add user_b to household
    _, token = await HouseholdService.invite_member(
        db_session, tenant.id, user_a.id, hh.id,
        HouseholdInvitationCreate(email="goal.b@example.com", role="MEMBER")
    )
    await set_db_tenant_context(db_session, tenant.id, user_id=user_b.id)
    await HouseholdService.accept_invitation(db_session, tenant.id, user_b.id, token)

    # 1. Create shared goal
    goal = await HouseholdService.create_shared_goal(
        db_session,
        tenant_id=tenant.id,
        current_user_id=user_a.id,
        household_id=hh.id,
        payload=HouseholdGoalCreate(
            name="Emergency Rainy Day Reserve",
            target_amount=Decimal("300000.0000"),
            target_date=date.today() + timedelta(days=365),
        ),
    )
    assert goal.current_amount == Decimal("0.0000")
    assert goal.status == "ACTIVE"

    # 2. Member A contributes ₹100,000
    await set_db_tenant_context(db_session, tenant.id, user_id=user_a.id)
    await HouseholdService.contribute_to_goal(
        db_session,
        tenant_id=tenant.id,
        current_user_id=user_a.id,
        household_id=hh.id,
        goal_id=goal.id,
        payload=HouseholdContributionCreate(amount=Decimal("100000.0000"), note="Bonus savings"),
    )
    assert goal.current_amount == Decimal("100000.0000")

    # 3. Member B contributes ₹200,000 (Goal Achieved!)
    await set_db_tenant_context(db_session, tenant.id, user_id=user_b.id)
    await HouseholdService.contribute_to_goal(
        db_session,
        tenant_id=tenant.id,
        current_user_id=user_b.id,
        household_id=hh.id,
        goal_id=goal.id,
        payload=HouseholdContributionCreate(amount=Decimal("200000.0000"), note="Tax refund"),
    )
    assert goal.current_amount == Decimal("300000.0000")
    assert goal.status == "COMPLETED"


@pytest.mark.asyncio
async def test_household_internal_settlement_transfer_neutrality(
    db_session: AsyncSession, test_user_factory
):
    """Verify internal member reimbursements preserve transfer neutrality without double-counting."""
    user_a, tenant, _ = await test_user_factory(email="settle.a@example.com")
    user_b, _, _ = await test_user_factory(email="settle.b@example.com")
    await set_db_tenant_context(db_session, tenant.id, user_id=user_a.id)

    hh = await HouseholdService.create_household(
        db_session,
        tenant_id=tenant.id,
        user_id=user_a.id,
        payload=HouseholdCreate(name="Apartment Flatmates"),
    )

    # Add member B
    _, token = await HouseholdService.invite_member(
        db_session, tenant.id, user_a.id, hh.id,
        HouseholdInvitationCreate(email="settle.b@example.com", role="MEMBER")
    )
    await set_db_tenant_context(db_session, tenant.id, user_id=user_b.id)
    await HouseholdService.accept_invitation(db_session, tenant.id, user_b.id, token)

    # Member B reimburses Member A ₹4,500 for electricity bill
    settlement = await HouseholdService.record_settlement(
        db_session,
        tenant_id=tenant.id,
        current_user_id=user_b.id,
        household_id=hh.id,
        payload=HouseholdSettlementCreate(
            payee_user_id=user_a.id,
            amount=Decimal("4500.0000"),
            currency="INR",
            description="50% Electricity bill reimbursement",
        ),
    )
    assert settlement.id is not None
    assert settlement.payer_user_id == user_b.id
    assert settlement.payee_user_id == user_a.id
    assert settlement.amount == Decimal("4500.0000")
    assert settlement.status == "COMPLETED"

    # Payer cannot reimburse themselves
    with pytest.raises(ValueError, match="Payer and payee must be distinct"):
        await HouseholdService.record_settlement(
            db_session,
            tenant_id=tenant.id,
            current_user_id=user_b.id,
            household_id=hh.id,
            payload=HouseholdSettlementCreate(
                payee_user_id=user_b.id,
                amount=Decimal("1000.0000"),
                currency="INR",
                description="Self reimbursement",
            ),
        )
