"""WealthOS Synchronization & Offline-First API Router."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.logging import get_logger
from app.core.security import TenantContext, get_current_tenant_context
from app.domains.sync.schemas import (
    DeviceRegistrationRequest,
    DeviceRegistrationResponse,
    SyncBatchRequest,
    SyncBatchResponse,
    SyncConflictItem,
    SyncConflictResolutionRequest,
    SyncConflictResolutionResponse,
    SyncDeltaResponse,
    SyncOperationStatusResponse,
    SyncSessionCreate,
    SyncSessionResponse,
)
from app.domains.sync.service import SyncService

logger = get_logger("wealthos.sync")

router = APIRouter()


@router.post(
    "/sessions",
    response_model=SyncSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create synchronization session",
)
async def create_sync_session(
    body: SyncSessionCreate,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> SyncSessionResponse:
    """Establish an authenticated, tenant-scoped sync session for an offline-first client."""
    service = SyncService(session)
    res = await service.create_session(
        tenant_id=str(context.tenant.id),
        device_id=body.device_id,
        platform=body.platform,
        client_version=body.client_version,
    )
    return SyncSessionResponse(**res)


@router.post(
    "/operations",
    response_model=SyncBatchResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit batched offline operations",
)
async def submit_offline_batch(
    body: SyncBatchRequest,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> SyncBatchResponse:
    """Ingest, validate, and execute an ordered batch of offline mutations with idempotency guarantees."""
    service = SyncService(session)
    res = await service.process_batch(
        tenant_id=str(context.tenant.id),
        user_id=str(context.user.id),
        session_id=body.session_id,
        operations=body.operations,
    )
    return SyncBatchResponse(**res)


@router.get(
    "/operations/{operation_id}",
    response_model=SyncOperationStatusResponse,
    summary="Lookup offline operation status",
)
async def get_operation_status(
    operation_id: str,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> SyncOperationStatusResponse:
    """Retrieve execution and confirmation status for a previously submitted offline operation."""
    service = SyncService(session)
    res = await service.get_operation_status(
        tenant_id=str(context.tenant.id),
        operation_id=operation_id,
    )
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Operation {operation_id} not found in active tenant scope",
        )
    return SyncOperationStatusResponse(**res)


@router.get(
    "/conflicts",
    response_model=list[SyncConflictItem],
    summary="List active synchronization conflicts",
)
async def list_conflicts(
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> list[SyncConflictItem]:
    """Retrieve all unresolved synchronization conflicts requiring user review."""
    service = SyncService(session)
    conflicts = await service.list_conflicts(tenant_id=str(context.tenant.id))
    return [SyncConflictItem(**c) for c in conflicts]


@router.post(
    "/conflicts/{conflict_id}/resolve",
    response_model=SyncConflictResolutionResponse,
    summary="Resolve synchronization conflict",
)
async def resolve_conflict(
    conflict_id: str,
    body: SyncConflictResolutionRequest,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> SyncConflictResolutionResponse:
    """Deterministically resolve a sync conflict using chosen strategy."""
    service = SyncService(session)
    try:
        res = await service.resolve_conflict(
            tenant_id=str(context.tenant.id),
            conflict_id=conflict_id,
            strategy=body.resolution_strategy,
            merged_payload=body.merged_payload,
        )
        return SyncConflictResolutionResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/delta",
    response_model=SyncDeltaResponse,
    summary="Incremental delta synchronization",
)
async def get_delta(
    since_cursor: str | None = Query(None, description="Client's last confirmed cursor token"),
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> SyncDeltaResponse:
    """Fetch incremental chronological server-side changes since the specified cursor."""
    service = SyncService(session)
    res = await service.get_delta(tenant_id=str(context.tenant.id), since_cursor=since_cursor)
    return SyncDeltaResponse(**res)


@router.post(
    "/devices",
    response_model=DeviceRegistrationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register client device",
)
async def register_device(
    body: DeviceRegistrationRequest,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> DeviceRegistrationResponse:
    """Register a mobile or web client device for synchronization tracking."""
    service = SyncService(session)
    res = await service.register_device(
        tenant_id=str(context.tenant.id),
        user_id=str(context.user.id),
        device_id=body.device_id,
        device_name=body.device_name,
        platform=body.platform,
        app_version=body.app_version,
    )
    return DeviceRegistrationResponse(**res)


@router.post(
    "/devices/{device_id}/revoke",
    response_model=DeviceRegistrationResponse,
    summary="Revoke client device",
)
async def revoke_device(
    device_id: str,
    context: TenantContext = Depends(get_current_tenant_context),
    session: AsyncSession = Depends(get_db_session),
) -> DeviceRegistrationResponse:
    """Revoke authorization for a client device, halting future sync sessions."""
    service = SyncService(session)
    try:
        res = await service.revoke_device(
            tenant_id=str(context.tenant.id),
            device_id=device_id,
        )
        return DeviceRegistrationResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

