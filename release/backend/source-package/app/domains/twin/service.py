"""WealthOS Personal Financial Digital Twin Service.

Synthesizes data across all foundational financial domains into a versioned,
reproducible point-in-time Digital Twin snapshot without mutating the General Ledger.
"""

import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.twin.models import FinancialTwinSnapshot
from app.domains.twin.repository import TwinRepository

logger = get_logger("wealthos.twin.service")


class TwinService:
    """Service orchestrating Financial Digital Twin snapshot generation."""

    @staticmethod
    async def get_or_create_snapshot(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        force_recompute: bool = False,
    ) -> FinancialTwinSnapshot:
        """Retrieve existing recent snapshot or synthesize a fresh one."""
        existing = await TwinRepository.get_latest_snapshot(session, tenant_id, user_id)
        today = date.today()

        if existing and not force_recompute and existing.snapshot_date == today:
            # Check if age < 24 hours
            now = datetime.now(UTC)
            if (now - existing.updated_at).total_seconds() < 86400:
                return existing

        return await TwinService.recompute_twin_snapshot(session, tenant_id, user_id)

    @staticmethod
    async def recompute_twin_snapshot(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> FinancialTwinSnapshot:
        """Deterministic multi-domain aggregation to synthesize a new Digital Twin snapshot."""
        # 1. Assets & Liabilities from General Balance
        al_query = text(
            """
            SELECT
                COALESCE((SELECT SUM(current_valuation) FROM assets WHERE tenant_id = :tid AND is_active = TRUE), 0) AS total_assets,
                COALESCE((SELECT SUM(current_principal) FROM liabilities WHERE tenant_id = :tid AND is_active = TRUE), 0) AS total_liabilities;
            """
        )
        al_res = (await session.execute(al_query, {"tid": tenant_id})).fetchone()
        total_assets = Decimal(str(al_res[0])) if al_res else Decimal("0.0000")
        total_liabilities = Decimal(str(al_res[1])) if al_res else Decimal("0.0000")

        # 2. Liquid Cash from checking, savings & cash accounts
        cash_query = text(
            """
            SELECT COALESCE(SUM(current_balance), 0)
            FROM financial_accounts
            WHERE tenant_id = :tid AND account_type IN ('CHECKING', 'SAVINGS', 'CASH');
            """
        )
        cash_res = (await session.execute(cash_query, {"tid": tenant_id})).scalar()
        liquid_cash = Decimal(str(cash_res or "0.0000"))

        # 3. Investment Portfolio Value
        inv_query = text(
            """
            SELECT COALESCE(SUM(l.remaining_quantity * fi.current_price), 0)
            FROM investment_holding_lots l
            JOIN financial_instruments fi ON fi.id = l.instrument_id
            WHERE l.tenant_id = :tid AND l.remaining_quantity > 0;
            """
        )
        inv_res = (await session.execute(inv_query, {"tid": tenant_id})).scalar()
        portfolio_val = Decimal(str(inv_res or "0.0000"))

        # 4. Monthly Income & Expenses (last 30 days)
        since_date = date.today() - timedelta(days=30)
        flow_query = text(
            """
            SELECT
                COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END), 0) AS income,
                COALESCE(SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END), 0) AS expense
            FROM financial_transactions
            WHERE tenant_id = :tid AND transaction_date >= :sdate;
            """
        )
        flow_res = (await session.execute(flow_query, {"tid": tenant_id, "sdate": since_date})).fetchone()
        monthly_income = Decimal(str(flow_res[0])) if flow_res else Decimal("0.0000")
        monthly_expenses = Decimal(str(flow_res[1])) if flow_res else Decimal("0.0000")

        # 5. Monthly Debt Obligations (sum of active EMIs)
        debt_query = text(
            """
            SELECT COALESCE(SUM(emi_amount), 0)
            FROM liabilities
            WHERE tenant_id = :tid AND is_active = TRUE;
            """
        )
        debt_res = (await session.execute(debt_query, {"tid": tenant_id})).scalar()
        debt_obligations = Decimal(str(debt_res or "0.0000"))

        # 6. Latest Financial Health Score
        risk_query = text(
            """
            SELECT health_score
            FROM risk_assessments
            WHERE tenant_id = :tid
            ORDER BY assessment_date DESC, created_at DESC
            LIMIT 1;
            """
        )
        risk_res = (await session.execute(risk_query, {"tid": tenant_id})).scalar()
        risk_score = Decimal(str(risk_res)) if risk_res is not None else Decimal("100.00")

        # Computed fields
        net_worth = total_assets - total_liabilities
        # Liquid Net Worth = Liquid Cash - Debt Obligations
        liquid_net_worth = liquid_cash - debt_obligations
        monthly_savings = max(Decimal("0.0000"), monthly_income - monthly_expenses)
        savings_rate = (
            (monthly_savings / monthly_income * Decimal("100.00")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            if monthly_income > 0
            else Decimal("0.00")
        )
        emergency_months = (
            (liquid_cash / monthly_expenses).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            if monthly_expenses > 0
            else Decimal("0.00")
        )

        # Freshness evaluation
        freshness = "CURRENT"
        if total_assets == 0 and total_liabilities == 0 and liquid_cash == 0:
            freshness = "INCOMPLETE"

        metrics = {
            "total_assets": str(total_assets),
            "total_liabilities": str(total_liabilities),
            "liquid_cash": str(liquid_cash),
            "investment_portfolio_value": str(portfolio_val),
            "savings_rate_pct": str(savings_rate),
            "emergency_fund_months": str(emergency_months),
        }

        source_refs = {
            "assets_source": "assets_table",
            "liabilities_source": "liabilities_table",
            "accounts_source": "financial_accounts",
            "investments_source": "investment_holding_lots",
            "transactions_source": "financial_transactions",
            "risk_source": "risk_assessments",
            "as_of_timestamp": datetime.now(UTC).isoformat(),
        }

        snapshot = FinancialTwinSnapshot(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            user_id=user_id,
            snapshot_date=date.today(),
            net_worth=net_worth,
            liquid_net_worth=liquid_net_worth,
            monthly_income=monthly_income,
            monthly_expenses=monthly_expenses,
            monthly_savings=monthly_savings,
            debt_obligations=debt_obligations,
            risk_health_score=risk_score,
            data_freshness_status=freshness,
            metrics=metrics,
            source_references=source_refs,
        )

        return await TwinRepository.save_snapshot(session, snapshot)
