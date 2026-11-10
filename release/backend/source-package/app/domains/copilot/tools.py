"""WealthOS AI Financial Copilot — Allowlisted Deterministic Read-Only Tools.

Every tool in this module:
1. Strictly executes read-only SELECT queries or non-mutating what-if simulations.
2. Is tightly scoped to the tenant ID (OWASP A01 / Multi-tenant boundary).
3. Returns normalized Python dictionaries with fixed-point Decimal precision stringified for LLM ingestion.
"""

import uuid
from collections.abc import Callable
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
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


async def tool_get_cash_position(session: AsyncSession, tenant_id: uuid.UUID) -> dict[str, Any]:
    """Retrieve liquid cash, savings runway, and cash reserve status."""
    query = text(
        """
        SELECT COALESCE(SUM(current_balance), 0)
        FROM financial_accounts
        WHERE tenant_id = :tid AND account_type IN ('CHECKING', 'SAVINGS', 'CASH');
        """
    )
    res = (await session.execute(query, {"tid": tenant_id})).scalar()
    liquid_cash = Decimal(str(res or "0.0000"))

    # Monthly burn estimation
    since_date = date.today() - timedelta(days=30)
    burn_query = text(
        """
        SELECT COALESCE(SUM(amount), 0)
        FROM financial_transactions
        WHERE tenant_id = :tid AND direction = 'DEBIT' AND transaction_date >= :sdate;
        """
    )
    monthly_burn_res = (await session.execute(burn_query, {"tid": tenant_id, "sdate": since_date})).scalar()
    monthly_burn = Decimal(str(monthly_burn_res or "0.0000"))

    runway_months = (
        (liquid_cash / monthly_burn).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if monthly_burn > 0
        else Decimal("999.00")
    )

    return {
        "liquid_cash": str(liquid_cash),
        "monthly_burn": str(monthly_burn),
        "runway_months": str(runway_months),
        "currency": "INR",
        "is_emergency_funded": runway_months >= Decimal("6.00"),
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


async def tool_get_expense_summary(session: AsyncSession, tenant_id: uuid.UUID) -> dict[str, Any]:
    """Retrieve categorized expense breakdown for the last 30 days."""
    since_date = date.today() - timedelta(days=30)
    query = text(
        """
        SELECT COALESCE(tc.name, 'Uncategorized') as category, SUM(ft.amount) as total_spent, COUNT(ft.id) as tx_count
        FROM financial_transactions ft
        LEFT JOIN transaction_categories tc ON tc.id = ft.category_id
        WHERE ft.tenant_id = :tid AND ft.direction = 'DEBIT' AND ft.transaction_date >= :sdate
        GROUP BY tc.name
        ORDER BY total_spent DESC;
        """
    )
    rows = (await session.execute(query, {"tid": tenant_id, "sdate": since_date})).fetchall()
    categories = [
        {"category": row[0], "total_spent": str(row[1]), "count": int(row[2])}
        for row in rows
    ]
    total_expense = sum(Decimal(c["total_spent"]) for c in categories) if categories else Decimal("0.0000")

    return {
        "period": "Last 30 Days",
        "total_expense": str(total_expense),
        "categories": categories,
        "currency": "INR",
    }


async def tool_get_liability_summary(session: AsyncSession, tenant_id: uuid.UUID) -> dict[str, Any]:
    """Retrieve active liabilities, principal balances, and monthly obligations."""
    query = text(
        """
        SELECT name, liability_type, current_principal, interest_rate, emi_amount, currency
        FROM liabilities
        WHERE tenant_id = :tid AND is_active = TRUE
        ORDER BY current_principal DESC;
        """
    )
    rows = (await session.execute(query, {"tid": tenant_id})).fetchall()
    liabilities = [
        {
            "name": row[0],
            "type": row[1],
            "principal": str(row[2]),
            "interest_rate": f"{Decimal(str(row[3])) * 100:.2f}%",
            "monthly_emi": str(row[4]),
            "currency": row[5],
        }
        for row in rows
    ]
    total_principal = sum(Decimal(l["principal"]) for l in liabilities) if liabilities else Decimal("0.0000")
    total_monthly_emi = sum(Decimal(l["monthly_emi"]) for l in liabilities) if liabilities else Decimal("0.0000")

    return {
        "liabilities": liabilities,
        "total_principal": str(total_principal),
        "total_monthly_emi": str(total_monthly_emi),
        "count": len(liabilities),
        "currency": "INR",
    }


async def tool_get_loan_schedule(session: AsyncSession, tenant_id: uuid.UUID) -> dict[str, Any]:
    """Retrieve upcoming loan payments and amortization milestones."""
    query = text(
        """
        SELECT l.name, s.due_date, s.principal_due, s.interest_due, s.total_due, s.is_paid
        FROM loan_payment_schedules s
        JOIN liabilities l ON l.id = s.liability_id
        WHERE s.tenant_id = :tid AND s.is_paid = FALSE
        ORDER BY s.due_date ASC
        LIMIT 10;
        """
    )
    rows = (await session.execute(query, {"tid": tenant_id})).fetchall()
    upcoming = [
        {
            "loan_name": row[0],
            "due_date": str(row[1]),
            "principal_due": str(row[2]),
            "interest_due": str(row[3]),
            "total_due": str(row[4]),
            "is_paid": row[5],
        }
        for row in rows
    ]

    return {
        "upcoming_payments": upcoming,
        "count": len(upcoming),
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


async def tool_get_tax_readiness(session: AsyncSession, tenant_id: uuid.UUID) -> dict[str, Any]:
    """Retrieve current Indian Financial Year tax summary and regime comparison."""
    query = text(
        """
        SELECT tc.financial_year, tc.rule_version, tc.gross_total_income, tc.total_deductions,
               tc.taxable_income, tc.total_tax_liability, tp.tax_regime
        FROM tax_computations tc
        JOIN tax_profiles tp ON tp.id = tc.profile_id
        WHERE tc.tenant_id = :tid
        ORDER BY tc.created_at DESC
        LIMIT 1;
        """
    )
    row = (await session.execute(query, {"tid": tenant_id})).fetchone()
    if not row:
        return {
            "has_tax_profile": False,
            "message": "No active tax computation found. Tax readiness is currently uncomputed.",
        }

    return {
        "has_tax_profile": True,
        "financial_year": row[0],
        "rule_version": row[1],
        "gross_income": str(row[2]),
        "total_deductions": str(row[3]),
        "taxable_income": str(row[4]),
        "total_tax_liability": str(row[5]),
        "active_regime": row[6],
        "currency": "INR",
    }


async def tool_get_risk_assessment(session: AsyncSession, tenant_id: uuid.UUID) -> dict[str, Any]:
    """Retrieve latest financial health score and active vulnerability alerts."""
    score_query = text(
        """
        SELECT health_score, data_quality_score, risk_signals
        FROM risk_assessments
        WHERE tenant_id = :tid
        ORDER BY assessment_date DESC, created_at DESC
        LIMIT 1;
        """
    )
    score_row = (await session.execute(score_query, {"tid": tenant_id})).fetchone()
    overall_score = Decimal(str(score_row[0])) if score_row else Decimal("100.00")
    health_grade = "EXCELLENT" if overall_score >= 80 else ("GOOD" if overall_score >= 60 else "NEEDS_ATTENTION")
    components = {"data_quality": str(score_row[1])} if score_row else {}

    alerts_query = text(
        """
        SELECT alert_type, severity, title, status
        FROM risk_alerts
        WHERE tenant_id = :tid AND status = 'ACTIVE'
        ORDER BY created_at DESC
        LIMIT 5;
        """
    )
    alert_rows = (await session.execute(alerts_query, {"tid": tenant_id})).fetchall()
    alerts = [
        {"type": a[0], "severity": a[1], "title": a[2], "status": a[3]}
        for a in alert_rows
    ]

    return {
        "overall_score": str(overall_score),
        "health_grade": health_grade,
        "component_scores": components,
        "active_alerts_count": len(alerts),
        "active_alerts": alerts,
    }


async def tool_get_retirement_projection(session: AsyncSession, tenant_id: uuid.UUID) -> dict[str, Any]:
    """Retrieve retirement corpus projection, target age, and funding gap."""
    query = text(
        """
        SELECT current_age, target_retirement_age, current_monthly_expenses,
               current_retirement_corpus, required_retirement_corpus,
               monthly_savings_required, is_funded
        FROM retirement_profiles
        WHERE tenant_id = :tid
        ORDER BY updated_at DESC
        LIMIT 1;
        """
    )
    row = (await session.execute(query, {"tid": tenant_id})).fetchone()
    if not row:
        return {
            "has_profile": False,
            "message": "No retirement profile established for this workspace.",
        }

    return {
        "has_profile": True,
        "current_age": row[0],
        "retirement_age": row[1],
        "monthly_expenses": str(row[2]),
        "current_corpus": str(row[3]),
        "required_corpus": str(row[4]),
        "monthly_savings_needed": str(row[5]),
        "is_funded": row[6],
        "currency": "INR",
    }


async def tool_get_financial_forecast(session: AsyncSession, tenant_id: uuid.UUID) -> dict[str, Any]:
    """Retrieve 30-day, 90-day, and 12-month deterministic cash flow forecast trajectory."""
    query = text(
        """
        SELECT run_name, horizon_days, opening_balance, projected_closing_balance,
               total_projected_inflows, total_projected_outflows, confidence_level
        FROM forecast_runs
        WHERE tenant_id = :tid
        ORDER BY created_at DESC
        LIMIT 1;
        """
    )
    row = (await session.execute(query, {"tid": tenant_id})).fetchone()
    if not row:
        return {
            "has_forecast": False,
            "message": "No cash flow forecast has been computed yet.",
        }

    return {
        "has_forecast": True,
        "run_name": row[0],
        "horizon_days": row[1],
        "opening_balance": str(row[2]),
        "projected_closing_balance": str(row[3]),
        "inflows": str(row[4]),
        "outflows": str(row[5]),
        "confidence_level": row[6],
        "currency": "INR",
    }


async def tool_get_digital_twin_status(session: AsyncSession, tenant_id: uuid.UUID) -> dict[str, Any]:
    """Retrieve the synthesized Personal Financial Digital Twin snapshot state."""
    query = text(
        """
        SELECT snapshot_date, net_worth, liquid_net_worth, monthly_income,
               monthly_expenses, monthly_savings, debt_obligations,
               risk_health_score, data_freshness_status, metrics
        FROM financial_twin_snapshots
        WHERE tenant_id = :tid
        ORDER BY snapshot_date DESC, created_at DESC
        LIMIT 1;
        """
    )
    row = (await session.execute(query, {"tid": tenant_id})).fetchone()
    if not row:
        return {
            "has_snapshot": False,
            "message": "Digital Twin snapshot not yet initialized. Trigger a refresh to synthesize.",
        }

    return {
        "has_snapshot": True,
        "snapshot_date": str(row[0]),
        "net_worth": str(row[1]),
        "liquid_net_worth": str(row[2]),
        "monthly_income": str(row[3]),
        "monthly_expenses": str(row[4]),
        "monthly_savings": str(row[5]),
        "debt_obligations": str(row[6]),
        "risk_health_score": str(row[7]),
        "data_freshness_status": row[8],
        "metrics": row[9],
        "currency": "INR",
    }


async def tool_simulate_what_if(
    session: AsyncSession,
    tenant_id: uuid.UUID,
    params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Perform non-mutating what-if financial impact simulation.

    Simulates parameter variations (e.g. expense cut, interest rate increase, income shock)
    without persisting changes or altering any general ledger records.
    """
    params = params or {}
    nw_data = await tool_get_net_worth(session, tenant_id)
    cash_data = await tool_get_cash_position(session, tenant_id)
    liability_data = await tool_get_liability_summary(session, tenant_id)

    curr_net_worth = Decimal(nw_data["net_worth"])
    curr_cash = Decimal(cash_data["liquid_cash"])
    curr_emi = Decimal(liability_data["total_monthly_emi"])
    monthly_burn = Decimal(cash_data["monthly_burn"])

    # Simulate 10% expense reduction
    exp_cut_pct = Decimal(str(params.get("expense_cut_pct", "10"))) / Decimal("100")
    sim_burn = monthly_burn * (Decimal("1.00") - exp_cut_pct)
    annual_savings_boost = (monthly_burn * exp_cut_pct) * Decimal("12")

    # Simulate lump sum prepayment (e.g. 50,000)
    prepay_amount = Decimal(str(params.get("lump_sum_prepayment", "50000")))
    sim_cash_after_prepay = max(Decimal("0.00"), curr_cash - prepay_amount)
    sim_net_worth = curr_net_worth

    return {
        "simulation_type": "Deterministic What-If Scenario (Zero State Mutation)",
        "baseline": {
            "current_net_worth": str(curr_net_worth),
            "liquid_cash": str(curr_cash),
            "monthly_burn": str(monthly_burn),
            "monthly_emi": str(curr_emi),
        },
        "simulated": {
            "expense_cut_scenario": {
                "cut_percentage": f"{exp_cut_pct * 100:.1f}%",
                "simulated_monthly_burn": str(sim_burn.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
                "annual_savings_boost": str(annual_savings_boost.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
            },
            "loan_prepayment_scenario": {
                "prepayment_amount": str(prepay_amount),
                "simulated_remaining_cash": str(sim_cash_after_prepay.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
                "simulated_net_worth": str(sim_net_worth),
            },
        },
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
    "get_cash_position": {
        "handler": tool_get_cash_position,
        "description": "Check liquid cash, monthly burn rate, and runway months.",
        "parameters": {},
    },
    "get_budget_status": {
        "handler": tool_get_budget_status,
        "description": "Check budget allocations, spent amounts, and utilization.",
        "parameters": {},
    },
    "get_expense_summary": {
        "handler": tool_get_expense_summary,
        "description": "Categorized expense breakdown for the last 30 days.",
        "parameters": {},
    },
    "get_liability_summary": {
        "handler": tool_get_liability_summary,
        "description": "Active loans, principal balances, and monthly EMI obligations.",
        "parameters": {},
    },
    "get_loan_schedule": {
        "handler": tool_get_loan_schedule,
        "description": "Upcoming loan EMI payment schedule and dues.",
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
    "get_tax_readiness": {
        "handler": tool_get_tax_readiness,
        "description": "Indian Financial Year tax liability estimates and regime comparison.",
        "parameters": {},
    },
    "get_risk_assessment": {
        "handler": tool_get_risk_assessment,
        "description": "Overall Financial Health Score and active vulnerability alerts.",
        "parameters": {},
    },
    "get_retirement_projection": {
        "handler": tool_get_retirement_projection,
        "description": "Retirement target corpus, accumulation, and funding gap.",
        "parameters": {},
    },
    "get_financial_forecast": {
        "handler": tool_get_financial_forecast,
        "description": "Projected cash flow trajectory over 30d, 90d, and 12-month horizons.",
        "parameters": {},
    },
    "get_digital_twin_status": {
        "handler": tool_get_digital_twin_status,
        "description": "Personal Financial Digital Twin synthesized snapshot state.",
        "parameters": {},
    },
    "simulate_what_if": {
        "handler": tool_simulate_what_if,
        "description": "Deterministic what-if simulation (zero database mutation).",
        "parameters": {"params": "optional dictionary of what-if variations"},
    },
}
