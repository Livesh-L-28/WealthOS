"""WealthOS Deterministic Financial Anomaly Detection & Health Scoring Engine.

Implements rigorous mathematical checks for liquidity deterioration, expense spikes,
debt burden acceleration, and multi-pillar composite financial health calculation.
Also provides mobile offline mutation conflict resolution logic.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from app.core.logging import get_logger

logger = get_logger("wealthos.anomaly_detector")


@dataclass
class FinancialAnomaly:
    """Detected financial irregularity with evidence and advice."""

    anomaly_type: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    description: str
    metric_value: float
    baseline_value: float
    remediation_advice: str
    detected_at: datetime = field(default_factory=lambda: datetime.now(UTC))


class FinancialAnomalyDetector:
    """Deterministic financial telemetry anomaly evaluation engine."""

    @staticmethod
    def detect_expense_spikes(
        current_monthly_spend: Decimal,
        baseline_monthly_average: Decimal,
    ) -> FinancialAnomaly | None:
        """Flag when spending exceeds 2.5x of the rolling 90-day baseline."""
        if baseline_monthly_average <= 0:
            return None

        ratio = current_monthly_spend / baseline_monthly_average
        if ratio >= Decimal("2.5"):
            return FinancialAnomaly(
                anomaly_type="EXPENSE_SPIKE",
                severity="HIGH",
                description=(
                    f"Current monthly spend of ₹{current_monthly_spend:,.2f} is {ratio:.1f}x higher "
                    f"than your 90-day average of ₹{baseline_monthly_average:,.2f}."
                ),
                metric_value=float(current_monthly_spend),
                baseline_value=float(baseline_monthly_average),
                remediation_advice="Review recent unclassified outflows or discretionary spending categories.",
            )
        return None

    @staticmethod
    def detect_liquidity_deterioration(
        liquid_cash: Decimal,
        monthly_burn_rate: Decimal,
    ) -> FinancialAnomaly | None:
        """Flag when emergency cash coverage drops below 1.5 months of burn rate."""
        if monthly_burn_rate <= 0:
            return None

        months_coverage = liquid_cash / monthly_burn_rate
        if months_coverage < Decimal("1.5"):
            severity = "CRITICAL" if months_coverage < Decimal("0.75") else "HIGH"
            return FinancialAnomaly(
                anomaly_type="LIQUIDITY_DETERIORATION",
                severity=severity,
                description=(
                    f"Available liquid cash reserves (₹{liquid_cash:,.2f}) cover only "
                    f"{months_coverage:.1f} months of average burn rate (₹{monthly_burn_rate:,.2f})."
                ),
                metric_value=float(months_coverage),
                baseline_value=3.0,  # 3 months recommended minimum
                remediation_advice="Replenish emergency fund savings or defer capital expenditures.",
            )
        return None

    @staticmethod
    def detect_unusual_single_outflow(
        transaction_amount: Decimal,
        total_liquid_cash: Decimal,
    ) -> FinancialAnomaly | None:
        """Flag any single withdrawal exceeding 35% of total liquid cash balances."""
        if total_liquid_cash <= 0:
            return None

        ratio = (transaction_amount / total_liquid_cash) * Decimal("100.0")
        if ratio >= Decimal("35.0"):
            return FinancialAnomaly(
                anomaly_type="UNUSUAL_SINGLE_OUTFLOW",
                severity="HIGH",
                description=(
                    f"Single transaction of ₹{transaction_amount:,.2f} represents {ratio:.1f}% "
                    f"of your total liquid balances (₹{total_liquid_cash:,.2f})."
                ),
                metric_value=float(transaction_amount),
                baseline_value=float(total_liquid_cash * Decimal("0.35")),
                remediation_advice="Verify transaction authenticity and ensure depository buffer remains intact.",
            )
        return None

    @staticmethod
    def detect_debt_burden_acceleration(
        monthly_debt_emi: Decimal,
        net_monthly_income: Decimal,
    ) -> FinancialAnomaly | None:
        """Flag Debt-to-Income (DTI) ratio exceeding 45% of net monthly income."""
        if net_monthly_income <= 0:
            return None

        dti_percent = (monthly_debt_emi / net_monthly_income) * Decimal("100.0")
        if dti_percent > Decimal("45.0"):
            severity = "CRITICAL" if dti_percent >= Decimal("60.0") else "HIGH"
            return FinancialAnomaly(
                anomaly_type="DEBT_BURDEN_ACCELERATION",
                severity=severity,
                description=(
                    f"Monthly debt service obligations of ₹{monthly_debt_emi:,.2f} consume "
                    f"{dti_percent:.1f}% of net income (₹{net_monthly_income:,.2f})."
                ),
                metric_value=float(dti_percent),
                baseline_value=35.0,  # 35% prudential threshold
                remediation_advice="Consider debt consolidation or accelerating high-interest loan repayment.",
            )
        return None

    @classmethod
    def calculate_composite_health_score(
        cls,
        emergency_coverage_months: Decimal,
        dti_ratio_percent: Decimal,
        savings_rate_percent: Decimal,
        top_asset_concentration_percent: Decimal,
    ) -> dict[str, Any]:
        """Compute four-pillar financial health score (0 to 100).
        
        Pillars:
        1. Liquidity Coverage (25 pts): 6+ months = 25 pts, scales down linearly.
        2. Debt Health (25 pts): DTI <= 20% = 25 pts, DTI >= 60% = 0 pts.
        3. Savings Rate (25 pts): Savings >= 30% = 25 pts, 0% = 0 pts.
        4. Diversification (25 pts): Top asset <= 25% = 25 pts, >= 75% = 0 pts.
        """
        # Pillar 1: Liquidity (Target: 6 months)
        p1 = min(Decimal("25.0"), (emergency_coverage_months / Decimal("6.0")) * Decimal("25.0"))

        # Pillar 2: Debt (Target: <= 20% DTI, Max: 60%)
        if dti_ratio_percent <= Decimal("20.0"):
            p2 = Decimal("25.0")
        elif dti_ratio_percent >= Decimal("60.0"):
            p2 = Decimal("0.0")
        else:
            p2 = Decimal("25.0") - ((dti_ratio_percent - Decimal("20.0")) / Decimal("40.0")) * Decimal("25.0")

        # Pillar 3: Savings (Target: >= 30%)
        p3 = min(Decimal("25.0"), (max(Decimal("0.0"), savings_rate_percent) / Decimal("30.0")) * Decimal("25.0"))

        # Pillar 4: Diversification (Target: <= 25% top asset concentration)
        if top_asset_concentration_percent <= Decimal("25.0"):
            p4 = Decimal("25.0")
        elif top_asset_concentration_percent >= Decimal("75.0"):
            p4 = Decimal("0.0")
        else:
            p4 = Decimal("25.0") - ((top_asset_concentration_percent - Decimal("25.0")) / Decimal("50.0")) * Decimal("25.0")

        total_score = max(Decimal("0.0"), min(Decimal("100.0"), p1 + p2 + p3 + p4))

        if total_score >= Decimal("80.0"):
            category = "EXCELLENT"
        elif total_score >= Decimal("65.0"):
            category = "GOOD"
        elif total_score >= Decimal("50.0"):
            category = "FAIR"
        else:
            category = "VULNERABLE"

        return {
            "health_score": float(round(total_score, 1)),
            "rating_category": category,
            "pillars": {
                "liquidity_score": float(round(p1, 1)),
                "debt_health_score": float(round(p2, 1)),
                "savings_discipline_score": float(round(p3, 1)),
                "portfolio_diversification_score": float(round(p4, 1)),
            },
        }


# =============================================================================
# Mobile Offline Queue Conflict Resolution Engine
# =============================================================================

class MobileOfflineConflictResolver:
    """Resolves offline queue mutations against server state."""

    @staticmethod
    def resolve_mutation(
        client_version: int,
        server_version: int,
        client_timestamp: datetime,
        server_timestamp: datetime,
    ) -> str:
        """Determine conflict outcome: ACCEPT_CLIENT, SERVER_AUTHORITATIVE, or REJECT_STALE."""
        if client_version == server_version:
            return "ACCEPT_CLIENT"

        # Version conflict: if client is based on older version
        if client_version < server_version:
            # If server timestamp is newer, server wins (server authoritative)
            if server_timestamp >= client_timestamp:
                return "SERVER_AUTHORITATIVE"
            return "REJECT_STALE"

        return "ACCEPT_CLIENT"

