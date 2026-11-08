"""WealthOS AI Financial Copilot — Domain Service Layer.

Orchestrates conversational sessions, prompt injection sanitization,
deterministic read-only tool invocation, and grounded response synthesis.
"""

import re
import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.logging import get_logger
from app.domains.copilot.models import CopilotConversation, CopilotMessage
from app.domains.copilot.tools import AVAILABLE_TOOLS

logger = get_logger("wealthos.copilot.service")

# Regex heuristics for detecting prompt injections, jailbreaks, and destructive instructions
ADVERSARIAL_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior)\s+instructions", re.IGNORECASE),
    re.compile(r"system\s+prompt", re.IGNORECASE),
    re.compile(r"drop\s+table", re.IGNORECASE),
    re.compile(r"delete\s+from", re.IGNORECASE),
    re.compile(r"transfer\s+(\$|inr|\d+)", re.IGNORECASE),
    re.compile(r"bypass\s+(rls|security)", re.IGNORECASE),
    re.compile(r"select\s+\*\s+from\s+users", re.IGNORECASE),
    re.compile(r"create\s+user", re.IGNORECASE),
    re.compile(r"grant\s+all", re.IGNORECASE),
    re.compile(r"admin\s+override", re.IGNORECASE),
]


class CopilotSecurityViolationError(ValueError):
    """Raised when an adversarial prompt injection or write command is detected."""

    pass


class CopilotService:
    """Service managing AI Financial Copilot interactions."""

    @staticmethod
    async def create_conversation(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        title: str = "Financial Inquiry",
    ) -> CopilotConversation:
        """Create a new conversational thread scoped to tenant and user."""
        conv = CopilotConversation(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            user_id=user_id,
            title=title.strip()[:255] or "Financial Inquiry",
        )
        conv.messages = []
        session.add(conv)
        await session.flush()
        return conv

    @staticmethod
    async def list_conversations(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 50,
    ) -> list[CopilotConversation]:
        """List active conversation threads for current user within tenant."""
        stmt = (
            select(CopilotConversation)
            .options(selectinload(CopilotConversation.messages))
            .where(
                CopilotConversation.tenant_id == tenant_id,
                CopilotConversation.user_id == user_id,
                CopilotConversation.is_archived == False,  # noqa: E712
            )
            .order_by(CopilotConversation.updated_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_conversation(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        conversation_id: uuid.UUID,
    ) -> CopilotConversation | None:
        """Fetch a conversation and its messages scoped to tenant."""
        stmt = (
            select(CopilotConversation)
            .options(selectinload(CopilotConversation.messages))
            .where(
                CopilotConversation.id == conversation_id,
                CopilotConversation.tenant_id == tenant_id,
            )
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    def inspect_for_prompt_injection(user_text: str) -> None:
        """Scan input for prompt injection, jailbreaks, or destructive commands."""
        for pattern in ADVERSARIAL_PATTERNS:
            if pattern.search(user_text):
                logger.warning(
                    f"Prompt injection / destructive instruction detected: '{user_text}'"
                )
                raise CopilotSecurityViolationError(
                    "I cannot fulfill this request. I am a read-only financial assistant and "
                    "cannot execute state mutations, system modifications, or security bypass commands."
                )

    @staticmethod
    async def process_user_query(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        conversation_id: uuid.UUID,
        message_text: str,
    ) -> dict[str, Any]:
        """Execute grounded Copilot response with read-only tools and citation tracking."""
        # 1. Verify conversation exists and belongs to tenant
        conv = await CopilotService.get_conversation(session, tenant_id, conversation_id)
        if not conv:
            raise ValueError(f"Conversation {conversation_id} not found for active workspace.")

        # 2. Defense-in-depth prompt injection inspection
        try:
            CopilotService.inspect_for_prompt_injection(message_text)
        except CopilotSecurityViolationError as exc:
            # Store user message and refusal response
            user_msg = CopilotMessage(
                tenant_id=tenant_id,
                conversation_id=conversation_id,
                role="user",
                content=message_text,
            )
            session.add(user_msg)
            assistant_msg = CopilotMessage(
                tenant_id=tenant_id,
                conversation_id=conversation_id,
                role="assistant",
                content=str(exc),
                tool_calls={"blocked_attempt": True},
            )
            session.add(assistant_msg)
            await session.flush()
            return {
                "conversation_id": conversation_id,
                "message_id": assistant_msg.id,
                "role": "assistant",
                "content": str(exc),
                "tools_executed": [],
                "citations": [],
                "is_grounded": True,
            }

        # 3. Store User Message
        user_msg = CopilotMessage(
            tenant_id=tenant_id,
            conversation_id=conversation_id,
            role="user",
            content=message_text,
        )
        session.add(user_msg)

        # 4. Intent Classification & Deterministic Tool Execution
        tools_executed: list[str] = []
        citations: list[dict[str, Any]] = []
        content_parts: list[str] = []
        lower_query = message_text.lower()

        # Tool 1: Net Worth
        if any(w in lower_query for w in ["net worth", "assets", "liabilities", "wealth"]):
            nw_data = await AVAILABLE_TOOLS["get_net_worth"]["handler"](session, tenant_id)
            tools_executed.append("get_net_worth")
            citations.append({"source": "assets_and_liabilities_ledger", "data": nw_data})
            content_parts.append(
                f"Your current estimated net worth is ₹{Decimal(nw_data['net_worth']):,.2f} "
                f"(Total Assets: ₹{Decimal(nw_data['total_assets']):,.2f}, "
                f"Total Liabilities: ₹{Decimal(nw_data['total_liabilities']):,.2f})."
            )

        # Tool 2: Account Balances
        if any(w in lower_query for w in ["account", "balance", "bank", "savings", "checking"]):
            bal_data = await AVAILABLE_TOOLS["get_account_balances"]["handler"](session, tenant_id)
            tools_executed.append("get_account_balances")
            citations.append({"source": "financial_accounts", "data": bal_data})
            acc_list = ", ".join(
                [
                    f"{a['name']} ({a['mask']}): ₹{Decimal(a['balance']):,.2f}"
                    for a in bal_data["accounts"]
                ]
            )
            content_parts.append(
                f"Your account balances total ₹{Decimal(bal_data['total_balance']):,.2f} across "
                f"{len(bal_data['accounts'])} accounts: {acc_list}."
                if bal_data["accounts"]
                else "You currently have no registered financial accounts."
            )

        # Tool 3: Budgets & Utilization
        if any(w in lower_query for w in ["budget", "spending", "limit", "utilization"]):
            b_data = await AVAILABLE_TOOLS["get_budget_status"]["handler"](session, tenant_id)
            tools_executed.append("get_budget_status")
            citations.append({"source": "budget_allocations", "data": b_data})
            if b_data["allocations"]:
                b_lines = "; ".join(
                    [
                        f"{a['category']}: ₹{Decimal(a['spent']):,.2f} spent of ₹{Decimal(a['allocated']):,.2f} ({a['utilization_pct']})"
                        for a in b_data["allocations"]
                    ]
                )
                content_parts.append(f"Active budget tracking: {b_lines}.")
            else:
                content_parts.append("No active budget allocations found for this period.")

        # Tool 4: Financial Goals
        if any(w in lower_query for w in ["goal", "target", "milestone", "save"]):
            g_data = await AVAILABLE_TOOLS["get_financial_goals"]["handler"](session, tenant_id)
            tools_executed.append("get_financial_goals")
            citations.append({"source": "financial_goals", "data": g_data})
            if g_data["goals"]:
                g_lines = "; ".join(
                    [
                        f"{g['name']}: ₹{Decimal(g['current_amount']):,.2f} of ₹{Decimal(g['target_amount']):,.2f} ({g['progress_pct']})"
                        for g in g_data["goals"]
                    ]
                )
                content_parts.append(f"Goal progress: {g_lines}.")
            else:
                content_parts.append("No active financial goals found.")

        # Tool 5: Investments & Holdings
        if any(w in lower_query for w in ["stock", "share", "portfolio", "holding", "invest"]):
            h_data = await AVAILABLE_TOOLS["get_investment_holdings"]["handler"](session, tenant_id)
            tools_executed.append("get_investment_holdings")
            citations.append({"source": "investment_holding_lots", "data": h_data})
            if h_data["holdings"]:
                content_parts.append(
                    f"Your investment portfolio value is ₹{Decimal(h_data['total_portfolio_value']):,.2f} "
                    f"across {len(h_data['holdings'])} open positions."
                )
            else:
                content_parts.append("No active investment holdings currently recorded.")

        # Fallback if no specific financial tool matched
        if not content_parts:
            content_parts.append(
                "I am your WealthOS Financial Copilot. I can answer inquiries regarding your "
                "net worth, bank balances, budget utilization, financial goals, and investment holdings."
            )

        final_response_text = "\n\n".join(content_parts)

        # 5. Store Assistant Message with citations and executed tools
        assistant_msg = CopilotMessage(
            tenant_id=tenant_id,
            conversation_id=conversation_id,
            role="assistant",
            content=final_response_text,
            tool_calls={"tools": tools_executed},
            citations=citations,
        )
        session.add(assistant_msg)
        await session.flush()

        return {
            "conversation_id": conversation_id,
            "message_id": assistant_msg.id,
            "role": "assistant",
            "content": final_response_text,
            "tools_executed": tools_executed,
            "citations": citations,
            "is_grounded": True,
        }
