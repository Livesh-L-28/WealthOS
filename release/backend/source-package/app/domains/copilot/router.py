"""WealthOS AI Financial Copilot REST API Endpoints.

Provides strictly audited, read-only conversational copilot endpoints
governed by multi-tenant RBAC and tenant-isolated Row-Level Security.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.logging import get_logger
from app.core.security import TenantContext, require_permission
from app.domains.copilot.schemas import (
    ConversationResponse,
    CopilotToolSpec,
    CreateConversationRequest,
    SendMessageRequest,
    SendMessageResponse,
)
from app.domains.copilot.service import CopilotService
from app.domains.copilot.tools import AVAILABLE_TOOLS

logger = get_logger("wealthos.api.copilot")

router = APIRouter()


@router.post(
    "/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Copilot conversation thread",
)
async def create_conversation(
    payload: CreateConversationRequest,
    context: TenantContext = Depends(require_permission("copilot:chat")),
    session: AsyncSession = Depends(get_db_session),
) -> ConversationResponse:
    """Create a new conversational session thread."""
    conv = await CopilotService.create_conversation(
        session=session,
        tenant_id=context.tenant.id,
        user_id=context.user.id,
        title=payload.title,
    )
    return ConversationResponse.model_validate(conv)


@router.get(
    "/conversations",
    response_model=list[ConversationResponse],
    summary="List active Copilot conversations",
)
async def list_conversations(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    context: TenantContext = Depends(require_permission("copilot:chat")),
    session: AsyncSession = Depends(get_db_session),
) -> list[ConversationResponse]:
    """List conversation threads for active user."""
    convs = await CopilotService.list_conversations(
        session=session,
        tenant_id=context.tenant.id,
        user_id=context.user.id,
        skip=skip,
        limit=limit,
    )
    return [ConversationResponse.model_validate(c) for c in convs]


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationResponse,
    summary="Retrieve a conversation and its messages",
)
async def get_conversation(
    conversation_id: uuid.UUID,
    context: TenantContext = Depends(require_permission("copilot:chat")),
    session: AsyncSession = Depends(get_db_session),
) -> ConversationResponse:
    """Retrieve full conversation thread and grounded messages."""
    conv = await CopilotService.get_conversation(
        session=session,
        tenant_id=context.tenant.id,
        conversation_id=conversation_id,
    )
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied.",
        )
    return ConversationResponse.model_validate(conv)


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=SendMessageResponse,
    summary="Send message to AI Financial Copilot and execute read-only tools",
)
async def send_message(
    conversation_id: uuid.UUID,
    payload: SendMessageRequest,
    context: TenantContext = Depends(require_permission("copilot:chat")),
    session: AsyncSession = Depends(get_db_session),
) -> SendMessageResponse:
    """Submit a query to Copilot, invoke deterministic read-only tools, and return answer."""
    try:
        result = await CopilotService.process_user_query(
            session=session,
            tenant_id=context.tenant.id,
            user_id=context.user.id,
            conversation_id=conversation_id,
            message_text=payload.message,
        )
        return SendMessageResponse(**result)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.get(
    "/tools",
    response_model=list[CopilotToolSpec],
    summary="List allowlisted read-only Copilot tools",
)
async def list_tools(
    context: TenantContext = Depends(require_permission("copilot:chat")),
) -> list[CopilotToolSpec]:
    """Retrieve allowlisted read-only tools and parameters available to the Copilot."""
    tools: list[CopilotToolSpec] = []
    for name, spec in AVAILABLE_TOOLS.items():
        tools.append(
            CopilotToolSpec(
                name=name,
                description=spec["description"],
                parameters=spec["parameters"],
                is_read_only=True,
            )
        )
    return tools
