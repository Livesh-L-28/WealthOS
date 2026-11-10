"""WealthOS Personal Financial Digital Twin API Endpoints."""

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.security import TenantContext, get_current_tenant_context
from app.domains.twin.schemas import TwinRefreshRequest, TwinSnapshotResponse
from app.domains.twin.service import TwinService

router = APIRouter()


@router.get("/snapshot", response_model=TwinSnapshotResponse)
async def get_twin_snapshot(
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
    force_recompute: bool = Query(False, description="Force real-time recalculation"),
):
    """Retrieve or recompute the current Personal Financial Digital Twin snapshot."""
    snapshot = await TwinService.get_or_create_snapshot(
        session=session,
        tenant_id=context.tenant.id,
        user_id=context.user.id,
        force_recompute=force_recompute,
    )
    return snapshot


@router.post("/refresh", response_model=TwinSnapshotResponse, status_code=status.HTTP_200_OK)
async def refresh_twin_snapshot(
    payload: TwinRefreshRequest,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
):
    """Explicitly trigger recomputation and snapshot generation for the Digital Twin."""
    snapshot = await TwinService.recompute_twin_snapshot(
        session=session,
        tenant_id=context.tenant.id,
        user_id=context.user.id,
    )
    return snapshot
