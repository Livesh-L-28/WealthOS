"""WealthOS Phase 19 Workstream 10: Mobile Reliability & Financial Intelligence Tests.

Validates deterministic anomaly detection algorithms (expense spikes, liquidity drop, debt burden),
four-pillar composite financial health calculations, and mobile offline queue conflict resolution.
"""

from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest

from app.domains.risk.anomaly_detector import (
    FinancialAnomalyDetector,
    MobileOfflineConflictResolver,
)


def test_expense_spike_and_liquidity_anomaly_detection():
    """Verify mathematical triggers for expense spikes and liquidity deterioration."""
    # 1. Expense Spike: 260,000 vs 100,000 baseline (2.6x >= 2.5x threshold)
    spike = FinancialAnomalyDetector.detect_expense_spikes(
        current_monthly_spend=Decimal("260000.00"),
        baseline_monthly_average=Decimal("100000.00"),
    )
    assert spike is not None
    assert spike.anomaly_type == "EXPENSE_SPIKE"
    assert spike.severity == "HIGH"
    assert "2.6x higher" in spike.description

    # Below threshold (1.2x): no anomaly
    no_spike = FinancialAnomalyDetector.detect_expense_spikes(
        current_monthly_spend=Decimal("120000.00"),
        baseline_monthly_average=Decimal("100000.00"),
    )
    assert no_spike is None

    # 2. Liquidity Deterioration: 80,000 cash with 100,000 monthly burn (0.8 months < 1.5 months)
    liq = FinancialAnomalyDetector.detect_liquidity_deterioration(
        liquid_cash=Decimal("80000.00"),
        monthly_burn_rate=Decimal("100000.00"),
    )
    assert liq is not None
    assert liq.anomaly_type == "LIQUIDITY_DETERIORATION"
    assert liq.metric_value == 0.8

    # 3. Unusual Single Outflow: 400,000 out of 1,000,000 total cash (40% >= 35%)
    outflow = FinancialAnomalyDetector.detect_unusual_single_outflow(
        transaction_amount=Decimal("400000.00"),
        total_liquid_cash=Decimal("1000000.00"),
    )
    assert outflow is not None
    assert outflow.anomaly_type == "UNUSUAL_SINGLE_OUTFLOW"

    # 4. Debt Burden Acceleration: 55,000 EMI out of 100,000 net income (55% > 45%)
    debt = FinancialAnomalyDetector.detect_debt_burden_acceleration(
        monthly_debt_emi=Decimal("55000.00"),
        net_monthly_income=Decimal("100000.00"),
    )
    assert debt is not None
    assert debt.anomaly_type == "DEBT_BURDEN_ACCELERATION"
    assert debt.metric_value == 55.0


def test_composite_financial_health_scoring():
    """Verify four-pillar health score calculation across optimal and stressed scenarios."""
    # Scenario A: Pristine financial profile
    health_pristine = FinancialAnomalyDetector.calculate_composite_health_score(
        emergency_coverage_months=Decimal("8.0"),   # >= 6 mos -> 25 pts
        dti_ratio_percent=Decimal("15.0"),          # <= 20% -> 25 pts
        savings_rate_percent=Decimal("40.0"),       # >= 30% -> 25 pts
        top_asset_concentration_percent=Decimal("20.0"), # <= 25% -> 25 pts
    )
    assert health_pristine["health_score"] == 100.0
    assert health_pristine["rating_category"] == "EXCELLENT"
    assert health_pristine["pillars"]["liquidity_score"] == 25.0
    assert health_pristine["pillars"]["debt_health_score"] == 25.0

    # Scenario B: Stressed financial profile
    health_stressed = FinancialAnomalyDetector.calculate_composite_health_score(
        emergency_coverage_months=Decimal("1.2"),   # Low liquidity (5.0 pts)
        dti_ratio_percent=Decimal("58.0"),          # High debt (1.25 pts)
        savings_rate_percent=Decimal("5.0"),        # Low savings (4.2 pts)
        top_asset_concentration_percent=Decimal("70.0"), # High concentration (2.5 pts)
    )
    assert health_stressed["health_score"] < 40.0
    assert health_stressed["rating_category"] == "VULNERABLE"


def test_mobile_offline_conflict_resolution():
    """Verify deterministic conflict resolution for mobile offline synchronization."""
    now = datetime.now(UTC)

    # 1. Matching versions: client accepted
    res_match = MobileOfflineConflictResolver.resolve_mutation(
        client_version=3,
        server_version=3,
        client_timestamp=now,
        server_timestamp=now,
    )
    assert res_match == "ACCEPT_CLIENT"

    # 2. Client is stale (client=2, server=3) with newer server timestamp
    res_stale = MobileOfflineConflictResolver.resolve_mutation(
        client_version=2,
        server_version=3,
        client_timestamp=now - timedelta(minutes=5),
        server_timestamp=now,
    )
    assert res_stale == "SERVER_AUTHORITATIVE"
