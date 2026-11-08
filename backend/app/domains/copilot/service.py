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
    re.compile(r"show\s+all\s+tenants", re.IGNORECASE),
    re.compile(r"sudo\s+", re.IGNORECASE),
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

        # Tool: What-If Simulation
        if any(w in lower_query for w in ["what if", "simulate", "scenario", "prepay", "afford"]):
            sim_data = await AVAILABLE_TOOLS["simulate_what_if"]["handler"](session, tenant_id)
            tools_executed.append("simulate_what_if")
            citations.append({"source": "what_if_simulation_engine", "data": sim_data})
            baseline = sim_data["baseline"]
            cut_scen = sim_data["simulated"]["expense_cut_scenario"]
            content_parts.append(
                f"### What-If Financial Simulation\n"
                f"- **Current Baseline**: Net Worth: ₹{Decimal(baseline['current_net_worth']):,.2f}, "
                f"Liquid Cash: ₹{Decimal(baseline['liquid_cash']):,.2f}, Monthly Burn: ₹{Decimal(baseline['monthly_burn']):,.2f}.\n"
                f"- **10% Expense Reduction**: Monthly burn drops to ₹{Decimal(cut_scen['simulated_monthly_burn']):,.2f}, "
                f"generating an annual savings boost of ₹{Decimal(cut_scen['annual_savings_boost']):,.2f} without taking on debt."
            )

        # Tool: Net Worth
        if any(w in lower_query for w in ["net worth", "assets", "liabilities", "wealth"]) and "what if" not in lower_query:
            nw_data = await AVAILABLE_TOOLS["get_net_worth"]["handler"](session, tenant_id)
            tools_executed.append("get_net_worth")
            citations.append({"source": "assets_and_liabilities_ledger", "data": nw_data})
            content_parts.append(
                f"Your current estimated net worth is ₹{Decimal(nw_data['net_worth']):,.2f} "
                f"(Total Assets: ₹{Decimal(nw_data['total_assets']):,.2f}, "
                f"Total Liabilities: ₹{Decimal(nw_data['total_liabilities']):,.2f})."
            )

        # Tool: Account Balances
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

        # Tool: Cash Position & Runway
        if any(w in lower_query for w in ["runway", "liquid cash", "burn rate", "emergency fund"]):
            cash_data = await AVAILABLE_TOOLS["get_cash_position"]["handler"](session, tenant_id)
            tools_executed.append("get_cash_position")
            citations.append({"source": "cash_accounts", "data": cash_data})
            funded_msg = "fully emergency funded (>= 6 months)" if cash_data["is_emergency_funded"] else "below recommended 6-month buffer"
            content_parts.append(
                f"Liquid cash is ₹{Decimal(cash_data['liquid_cash']):,.2f} with a monthly burn of "
                f"₹{Decimal(cash_data['monthly_burn']):,.2f}, giving an estimated runway of {cash_data['runway_months']} months ({funded_msg})."
            )

        # Tool: Budgets & Utilization
        if any(w in lower_query for w in ["budget", "spending limit", "utilization"]):
            b_data = await AVAILABLE_TOOLS["get_budget_status"]["handler"](session, tenant_id)
            tools_executed.append("get_budget_status")
            citations.append({"source": "budget_allocations", "data": b_data})
            if b_data["allocations"]:
                b_lines = "; ".join(
                    [
                        f"{a['category']}: ₹{Decimal(a['spent']):,.2f} of ₹{Decimal(a['allocated']):,.2f} ({a['utilization_pct']})"
                        for a in b_data["allocations"]
                    ]
                )
                content_parts.append(f"Active budget tracking: {b_lines}.")
            else:
                content_parts.append("No active budget allocations found for this period.")

        # Tool: Expense Summary & Categories
        if any(w in lower_query for w in ["where did my money go", "spent this month", "expense summary", "top expenses"]):
            exp_data = await AVAILABLE_TOOLS["get_expense_summary"]["handler"](session, tenant_id)
            tools_executed.append("get_expense_summary")
            citations.append({"source": "financial_transactions", "data": exp_data})
            if exp_data["categories"]:
                top_cats = ", ".join([f"{c['category']}: ₹{Decimal(c['total_spent']):,.2f}" for c in exp_data["categories"][:3]])
                content_parts.append(
                    f"Total expenses in the last 30 days were ₹{Decimal(exp_data['total_expense']):,.2f}. "
                    f"Top spending categories: {top_cats}."
                )
            else:
                content_parts.append("No expenses recorded in the last 30 days.")

        # Tool: Liabilities & Debt
        if any(w in lower_query for w in ["debt", "liability", "loan", "emi", "borrow"]):
            l_data = await AVAILABLE_TOOLS["get_liability_summary"]["handler"](session, tenant_id)
            tools_executed.append("get_liability_summary")
            citations.append({"source": "liabilities", "data": l_data})
            if l_data["liabilities"]:
                content_parts.append(
                    f"You have {l_data['count']} active liabilities with total principal outstanding of "
                    f"₹{Decimal(l_data['total_principal']):,.2f} and monthly EMI obligations of ₹{Decimal(l_data['total_monthly_emi']):,.2f}."
                )
            else:
                content_parts.append("You currently have zero active liabilities or debts.")

        # Tool: Financial Goals
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

        # Tool: Investments & Holdings
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

        # Tool: Tax Readiness
        if any(w in lower_query for w in ["tax", "regime", "80c", "deduction", "itr"]):
            tax_data = await AVAILABLE_TOOLS["get_tax_readiness"]["handler"](session, tenant_id)
            tools_executed.append("get_tax_readiness")
            citations.append({"source": "tax_computations", "data": tax_data})
            if tax_data.get("has_tax_profile"):
                content_parts.append(
                    f"For FY {tax_data['financial_year']}, gross income is ₹{Decimal(tax_data['gross_income']):,.2f} with deductions of "
                    f"₹{Decimal(tax_data['total_deductions']):,.2f}. Estimated tax liability under the {tax_data['active_regime']} regime is "
                    f"₹{Decimal(tax_data['total_tax_liability']):,.2f}."
                )
            else:
                content_parts.append("No active tax computation found for the current financial year.")

        # Tool: Risk & Health
        if any(w in lower_query for w in ["risk", "health score", "vulnerab", "alert"]):
            r_data = await AVAILABLE_TOOLS["get_risk_assessment"]["handler"](session, tenant_id)
            tools_executed.append("get_risk_assessment")
            citations.append({"source": "risk_assessments", "data": r_data})
            content_parts.append(
                f"Your Financial Health Score is {r_data['overall_score']}/100 ({r_data['health_grade']}) with "
                f"{r_data['active_alerts_count']} active advisory alerts."
            )

        # Tool: Retirement
        if any(w in lower_query for w in ["retire", "pension", "provident"]):
            ret_data = await AVAILABLE_TOOLS["get_retirement_projection"]["handler"](session, tenant_id)
            tools_executed.append("get_retirement_projection")
            citations.append({"source": "retirement_profiles", "data": ret_data})
            if ret_data.get("has_profile"):
                content_parts.append(
                    f"Retirement target age is {ret_data['retirement_age']}. Accumulated corpus is "
                    f"₹{Decimal(ret_data['current_corpus']):,.2f} towards a target of ₹{Decimal(ret_data['required_corpus']):,.2f} "
                    f"({'Fully funded' if ret_data['is_funded'] else 'Funding in progress'})."
                )
            else:
                content_parts.append("Retirement profile has not yet been configured.")

        # Tool: Digital Twin State
        if any(w in lower_query for w in ["twin", "financial profile", "state summary", "full picture"]):
            twin_data = await AVAILABLE_TOOLS["get_digital_twin_status"]["handler"](session, tenant_id)
            tools_executed.append("get_digital_twin_status")
            citations.append({"source": "financial_twin_snapshots", "data": twin_data})
            if twin_data.get("has_snapshot"):
                content_parts.append(
                    f"Personal Financial Digital Twin status: {twin_data['data_freshness_status']} (as of {twin_data['snapshot_date']}). "
                    f"Net Worth: ₹{Decimal(twin_data['net_worth']):,.2f}, Liquid Net Worth: ₹{Decimal(twin_data['liquid_net_worth']):,.2f}, "
                    f"Monthly Savings: ₹{Decimal(twin_data['monthly_savings']):,.2f}."
                )
            else:
                content_parts.append("Digital Twin snapshot not yet generated. Visit the Digital Twin dashboard to initialize.")

        # Fallback if no specific financial tool matched
        if not content_parts:
            content_parts.append(
                "I am your WealthOS Financial Copilot. I can answer inquiries regarding your "
                "net worth, cash runway, expenses, budgets, loan EMIs, investments, India tax readiness, "
                "risk health score, retirement projections, and perform what-if simulations."
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
