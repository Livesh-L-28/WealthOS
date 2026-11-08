"""WealthOS AI Financial Copilot — Allowlisted Deterministic Read-Only Tools.

Every tool in this module:
1. Strictly executes read-only SELECT queries (zero state mutation, zero write capabilities).
2. Is tightly scoped to the tenant ID (OWASP A01 / Multi-tenant boundary).
3. Returns normalized Python dictionaries with fixed-point Decimal precision stringified for LLM ingestion.
"""

import uuid
from collections.abc import Callable
from decimal import Decimal
from typing import Any, TypedDict

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def tool_get_net_worth(session: AsyncSession, tenant_id: uuid.UUID) -> dict[str, Any]:
    """Calculate Net Worth = Total Assets - Total Liabilities for active tenant."""
    query = text(
        """
        SELECT
            COALESCE((SELECT SUM(current_valuation) FROM assets WHERE tenant_id = :tid AND is_active = TRUE), 0) AS total_assets,
            COALESCE((SELECT SUM(current_principal) FROM liabilities WHERE tenant_id = :tid AND is_active = TRUE), 0) AS total_liabilities;
        """
    )
    res = (await session.execute(query, {"tid": tenant_id})).fetchone()
    total_assets = Decimal(str(res[0])) if res else Decimal("0.0000")
    total_liabilities = Decimal(str(res[1])) if res else Decimal("0.0000")
    net_worth = total_assets - total_liabilities

    return {
        "net_worth": str(net_worth),
        "total_assets": str(total_assets),
        "total_liabilities": str(total_liabilities),
        "currency": "INR",
        "as_of": "current",
    }


async def tool_get_account_balances(session: AsyncSession, tenant_id: uuid.UUID) -> dict[str, Any]:
    """Retrieve financial accounts and balances for active tenant."""
    query = text(
        """
        SELECT account_name, account_number_mask, account_type, currency, current_balance
        FROM financial_accounts
        WHERE tenant_id = :tid
        ORDER BY account_name ASC;
        """
    )
    rows = (await session.execute(query, {"tid": tenant_id})).fetchall()
    accounts = [
        {
            "name": row[0],
            "mask": row[1],
            "type": row[2],
            "currency": row[3],
            "balance": str(row[4]),
        }
        for row in rows
    ]
    total_balance = (
        sum(Decimal(acc["balance"]) for acc in accounts) if accounts else Decimal("0.0000")
    )

    return {
        "accounts": accounts,
        "total_balance": str(total_balance),
        "currency": "INR",
    }


async def tool_get_budget_status(session: AsyncSession, tenant_id: uuid.UUID) -> dict[str, Any]:
    """Retrieve active budget allocations and spending utilization for active tenant."""
    query = text(
        """
        SELECT b.name, tc.name, ba.allocated_amount, ba.spent_amount, ba.currency
        FROM budget_allocations ba
        JOIN budgets b ON b.id = ba.budget_id
        JOIN transaction_categories tc ON tc.id = ba.category_id
        WHERE ba.tenant_id = :tid AND b.is_active = TRUE
        ORDER BY ba.spent_amount DESC;
        """
    )
    rows = (await session.execute(query, {"tid": tenant_id})).fetchall()
    allocations = []
    for row in rows:
        allocated = Decimal(str(row[2]))
        spent = Decimal(str(row[3]))
        utilization_pct = (spent / allocated * 100) if allocated > 0 else Decimal("0.00")
        allocations.append(
            {
                "budget_name": row[0],
                "category": row[1],
                "allocated": str(allocated),
                "spent": str(spent),
                "utilization_pct": f"{utilization_pct:.2f}%",
                "is_overspent": spent > allocated,
                "currency": row[4],
            }
        )

    return {
        "allocations": allocations,
        "count": len(allocations),
    }


async def tool_get_financial_goals(session: AsyncSession, tenant_id: uuid.UUID) -> dict[str, Any]:
    """Retrieve active financial goals and milestone progress for active tenant."""
    query = text(
        """
        SELECT name, category, target_amount, current_amount, target_date, status, currency
        FROM financial_goals
        WHERE tenant_id = :tid
        ORDER BY target_date ASC;
        """
    )
    rows = (await session.execute(query, {"tid": tenant_id})).fetchall()
    goals = []
    for row in rows:
        target = Decimal(str(row[2]))
        current = Decimal(str(row[3]))
        progress_pct = (current / target * 100) if target > 0 else Decimal("0.00")
        goals.append(
            {
                "name": row[0],
                "category": row[1],
                "target_amount": str(target),
                "current_amount": str(current),
                "target_date": str(row[4]),
                "status": row[5],
                "progress_pct": f"{progress_pct:.2f}%",
                "remaining": str(max(Decimal("0.0000"), target - current)),
                "currency": row[6],
            }
        )

    return {
        "goals": goals,
        "count": len(goals),
    }


async def tool_get_investment_holdings(
    session: AsyncSession, tenant_id: uuid.UUID
) -> dict[str, Any]:
    """Retrieve active investment holdings and open lots for active tenant."""
    query = text(
        """
        SELECT fi.symbol, fi.name, l.purchase_date, l.remaining_quantity, l.purchase_price, fi.current_price
        FROM investment_holding_lots l
        JOIN financial_instruments fi ON fi.id = l.instrument_id
        WHERE l.tenant_id = :tid AND l.remaining_quantity > 0
        ORDER BY fi.symbol ASC, l.purchase_date ASC;
        """
    )
    rows = (await session.execute(query, {"tid": tenant_id})).fetchall()
    holdings = []
    total_portfolio_value = Decimal("0.0000")

    for row in rows:
        qty = Decimal(str(row[3]))
        p_price = Decimal(str(row[4]))
        c_price = Decimal(str(row[5]))
        cost = qty * p_price
        market_val = qty * c_price
        gain_loss = market_val - cost
        total_portfolio_value += market_val

        holdings.append(
            {
                "symbol": row[0],
                "name": row[1],
                "purchase_date": str(row[2]),
                "quantity": str(qty),
                "cost_basis": str(cost),
                "market_value": str(market_val),
                "gain_loss": str(gain_loss),
            }
        )

    return {
        "holdings": holdings,
        "total_portfolio_value": str(total_portfolio_value),
        "currency": "INR",
    }


class ToolDefinition(TypedDict):
    handler: Callable[..., Any]
    description: str
    parameters: dict[str, Any]


AVAILABLE_TOOLS: dict[str, ToolDefinition] = {
    "get_net_worth": {
        "handler": tool_get_net_worth,
        "description": "Calculate Net Worth (Total Assets minus Total Liabilities).",
        "parameters": {},
    },
    "get_account_balances": {
        "handler": tool_get_account_balances,
        "description": "List bank and financial accounts with current balances.",
        "parameters": {},
    },
    "get_budget_status": {
        "handler": tool_get_budget_status,
        "description": "Check budget allocations, spent amounts, and utilization.",
        "parameters": {},
    },
    "get_financial_goals": {
        "handler": tool_get_financial_goals,
        "description": "Retrieve financial goals and contribution milestone progress.",
        "parameters": {},
    },
    "get_investment_holdings": {
        "handler": tool_get_investment_holdings,
        "description": "Query stock, mutual fund, and ETF holdings and unrealized P&L.",
        "parameters": {},
    },
}
