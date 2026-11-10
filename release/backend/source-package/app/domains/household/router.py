"""WealthOS Household Wealth Management REST API Endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.security import TenantContext, get_current_tenant_context
from app.domains.household.schemas import (
    HouseholdConsolidatedNetWorthResponse,
    HouseholdContributionCreate,
    HouseholdContributionResponse,
    HouseholdCreate,
    HouseholdGoalCreate,
    HouseholdGoalResponse,
    HouseholdInvitationAccept,
    HouseholdInvitationCreate,
    HouseholdInvitationResponse,
    HouseholdMemberResponse,
    HouseholdResourceShareRequest,
    HouseholdResponse,
    HouseholdSettlementCreate,
    HouseholdSettlementResponse,
    HouseholdSharedResourceResponse,
)
from app.domains.household.service import HouseholdPermissionDeniedError, HouseholdService

router = APIRouter()


@router.post("", response_model=HouseholdResponse, status_code=status.HTTP_201_CREATED)
async def create_household(
    payload: HouseholdCreate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
):
    """Create a new multi-user household collaborative workspace."""
    hh = await HouseholdService.create_household(
        session=session,
        tenant_id=context.tenant.id,
        user_id=context.user.id,
        payload=payload,
    )
    return hh


@router.post("/{household_id}/invitations", response_model=HouseholdInvitationResponse, status_code=status.HTTP_201_CREATED)
async def invite_household_member(
    household_id: uuid.UUID,
    payload: HouseholdInvitationCreate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
):
    """Generate a secure cryptographic invitation to join household (OWNER/ADMIN only)."""
    try:
        inv, raw_token = await HouseholdService.invite_member(
            session=session,
            tenant_id=context.tenant.id,
            current_user_id=context.user.id,
            household_id=household_id,
            payload=payload,
        )
        resp = HouseholdInvitationResponse.model_validate(inv)
        resp.invitation_token = raw_token
        return resp
    except HouseholdPermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


@router.post("/invitations/accept", response_model=HouseholdMemberResponse, status_code=status.HTTP_200_OK)
async def accept_household_invitation(
    payload: HouseholdInvitationAccept,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
):
    """Accept an invitation using cryptographic token and join household."""
    try:
        membership = await HouseholdService.accept_invitation(
            session=session,
            tenant_id=context.tenant.id,
            user_id=context.user.id,
            token=payload.token,
        )
        return membership
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/{household_id}/resources", response_model=HouseholdSharedResourceResponse, status_code=status.HTTP_201_CREATED)
async def share_household_resource(
    household_id: uuid.UUID,
    payload: HouseholdResourceShareRequest,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
):
    """Share a financial account, liability, or asset with the household."""
    try:
        res = await HouseholdService.share_resource(
            session=session,
            tenant_id=context.tenant.id,
            current_user_id=context.user.id,
            household_id=household_id,
            payload=payload,
        )
        return res
    except HouseholdPermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


@router.get("/{household_id}/net-worth", response_model=HouseholdConsolidatedNetWorthResponse)
async def get_household_net_worth(
    household_id: uuid.UUID,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
):
    """Calculate consolidated deduplicated net worth for the household."""
    try:
        await HouseholdService.verify_member_role(
            session, household_id, context.user.id, {"OWNER", "ADMIN", "MEMBER", "VIEWER"}
        )
        res = await HouseholdService.calculate_consolidated_net_worth(
            session=session,
            tenant_id=context.tenant.id,
            household_id=household_id,
        )
        return res
    except HouseholdPermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post("/{household_id}/goals", response_model=HouseholdGoalResponse, status_code=status.HTTP_201_CREATED)
async def create_household_goal(
    household_id: uuid.UUID,
    payload: HouseholdGoalCreate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
):
    """Create a shared household goal."""
    try:
        goal = await HouseholdService.create_shared_goal(
            session=session,
            tenant_id=context.tenant.id,
            current_user_id=context.user.id,
            household_id=household_id,
            payload=payload,
        )
        return goal
    except HouseholdPermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


@router.post("/{household_id}/goals/{goal_id}/contributions", response_model=HouseholdContributionResponse, status_code=status.HTTP_201_CREATED)
async def contribute_to_household_goal(
    household_id: uuid.UUID,
    goal_id: uuid.UUID,
    payload: HouseholdContributionCreate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
):
    """Contribute money to a shared household goal."""
    try:
        contrib = await HouseholdService.contribute_to_goal(
            session=session,
            tenant_id=context.tenant.id,
            current_user_id=context.user.id,
            household_id=household_id,
            goal_id=goal_id,
            payload=payload,
        )
        return contrib
    except HouseholdPermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


@router.post("/{household_id}/settlements", response_model=HouseholdSettlementResponse, status_code=status.HTTP_201_CREATED)
async def record_household_settlement(
    household_id: uuid.UUID,
    payload: HouseholdSettlementCreate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
):
    """Record transfer-neutral reimbursement between members."""
    try:
        settlement = await HouseholdService.record_settlement(
            session=session,
            tenant_id=context.tenant.id,
            current_user_id=context.user.id,
            household_id=household_id,
            payload=payload,
        )
        return settlement
    except HouseholdPermissionDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
