"""WealthOS AI Financial Copilot Schemas."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class CreateConversationRequest(BaseModel):
    """Payload to create a new Copilot conversation."""

    title: str = Field(
        default="Financial Inquiry",
        min_length=1,
        max_length=255,
        description="Conversation thread title",
    )


class CopilotMessageItem(BaseModel):
    """Single message item schema."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    conversation_id: uuid.UUID
    role: str
    content: str
    tool_calls: dict[str, Any] | None = None
    citations: list[dict[str, Any]] | None = None
    feedback: str | None = None
    created_at: datetime


class ConversationResponse(BaseModel):
    """Conversation thread response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    user_id: uuid.UUID
    title: str
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    messages: list[CopilotMessageItem] = []


class SendMessageRequest(BaseModel):
    """User message payload for the Copilot."""

    message: str = Field(
        ...,
        min_length=1,
        max_length=4000,
        description="User financial query or command",
    )


class SendMessageResponse(BaseModel):
    """Copilot response payload with grounded citations and deterministic tool execution."""

    conversation_id: uuid.UUID
    message_id: uuid.UUID
    role: str = "assistant"
    content: str
    tools_executed: list[str] = []
    citations: list[dict[str, Any]] = []
    is_grounded: bool = True


class CopilotToolSpec(BaseModel):
    """Description of an allowlisted read-only Copilot tool."""

    name: str
    description: str
    parameters: dict[str, Any]
    is_read_only: bool = True
