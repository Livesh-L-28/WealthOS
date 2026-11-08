"""WealthOS Data Lifecycle & Retention Governance Engine.

Enforces statutory financial data retention requirements (8-year statutory hold),
GDPR/DPDP 'Right to Erasure' exemptions for financial ledgers, and automated ephemeral purging.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any

from app.core.logging import get_logger

logger = get_logger("wealthos.lifecycle_engine")


class DataClassification(str, Enum):
    STATUTORY_ACCOUNTING = "STATUTORY_ACCOUNTING"
    DOCUMENT_EVIDENCE = "DOCUMENT_EVIDENCE"
    AI_DERIVED_INSIGHTS = "AI_DERIVED_INSIGHTS"
    EPHEMERAL_CACHE = "EPHEMERAL_CACHE"
    AUDIT_TRAIL = "AUDIT_TRAIL"


@dataclass
class RetentionPolicy:
    """Retention rule for specific financial data domain."""

    classification: DataClassification
    entity_type: str
    retention_period_days: int  # 8 years = 2920 days
    is_statutory_hold: bool
    legal_basis: str
    purge_allowed: bool


# Statutory Retention Matrix based on India Income Tax Act Section 149 / Companies Act 2013 Sec 128
RETENTION_POLICIES: dict[str, RetentionPolicy] = {
    "journal_entries": RetentionPolicy(
        classification=DataClassification.STATUTORY_ACCOUNTING,
        entity_type="journal_entries",
        retention_period_days=2920,  # 8 Years
        is_statutory_hold=True,
        legal_basis="India Income Tax Act 1961 Sec 149 / Companies Act 2013 Sec 128",
        purge_allowed=False,
    ),
    "journal_lines": RetentionPolicy(
        classification=DataClassification.STATUTORY_ACCOUNTING,
        entity_type="journal_lines",
        retention_period_days=2920,
        is_statutory_hold=True,
        legal_basis="Double-Entry Financial Balancing Invariant",
        purge_allowed=False,
    ),
    "investment_holding_lots": RetentionPolicy(
        classification=DataClassification.STATUTORY_ACCOUNTING,
        entity_type="investment_holding_lots",
        retention_period_days=2920,
        is_statutory_hold=True,
        legal_basis="Capital Gains Tax Basis Verification",
        purge_allowed=False,
    ),
    "passive_income_records": RetentionPolicy(
        classification=DataClassification.STATUTORY_ACCOUNTING,
        entity_type="passive_income_records",
        retention_period_days=2920,
        is_statutory_hold=True,
        legal_basis="TDS / Form 26AS Tax Credit Audit",
        purge_allowed=False,
    ),
    "financial_documents": RetentionPolicy(
        classification=DataClassification.DOCUMENT_EVIDENCE,
        entity_type="financial_documents",
        retention_period_days=1095,  # 3 Years
        is_statutory_hold=False,
        legal_basis="User-managed document archive",
        purge_allowed=True,
    ),
    "copilot_messages": RetentionPolicy(
        classification=DataClassification.AI_DERIVED_INSIGHTS,
        entity_type="copilot_messages",
        retention_period_days=365,  # 1 Year
        is_statutory_hold=False,
        legal_basis="Ephemeral conversational assistant context",
        purge_allowed=True,
    ),
    "api_idempotency_records": RetentionPolicy(
        classification=DataClassification.EPHEMERAL_CACHE,
        entity_type="api_idempotency_records",
        retention_period_days=7,  # 7 Days
        is_statutory_hold=False,
        legal_basis="Network deduplication cache",
        purge_allowed=True,
    ),
    "security_audit_logs": RetentionPolicy(
        classification=DataClassification.AUDIT_TRAIL,
        entity_type="security_audit_logs",
        retention_period_days=1825,  # 5 Years
        is_statutory_hold=True,
        legal_basis="SOC2 / ISO 27001 Access & Forensics Standard",
        purge_allowed=False,
    ),
}


class DataLifecycleEngine:
    """Enforces retention rules, deletion eligibility, and statutory hold protections."""

    @classmethod
    def evaluate_purge_eligibility(
        cls,
        entity_type: str,
        record_age_days: int,
        has_active_dispute: bool = False,
    ) -> dict[str, Any]:
        """Evaluate whether a financial entity is legally eligible for hard deletion."""
        policy = RETENTION_POLICIES.get(entity_type)
        if not policy:
            return {
                "entity_type": entity_type,
                "is_purge_eligible": False,
                "reason": f"Unknown entity type '{entity_type}'. Fail-closed.",
                "retention_policy": None,
            }

        # 1. Active legal dispute or regulatory inquiry blocks all purges
        if has_active_dispute:
            return {
                "entity_type": entity_type,
                "is_purge_eligible": False,
                "reason": "Active legal dispute or regulatory inquiry hold in effect.",
                "retention_policy": policy.legal_basis,
            }

        # 2. Statutory hold check (cannot purge before statutory retention period has expired)
        if policy.is_statutory_hold:
            if record_age_days < policy.retention_period_days:
                remaining = policy.retention_period_days - record_age_days
                return {
                    "entity_type": entity_type,
                    "is_purge_eligible": False,
                    "reason": (
                        f"Statutory retention hold active under {policy.legal_basis}. "
                        f"Record must be preserved for {remaining} more days."
                    ),
                    "retention_policy": policy.legal_basis,
                }

        # 3. Purgeable data
        if not policy.purge_allowed:
            return {
                "entity_type": entity_type,
                "is_purge_eligible": False,
                "reason": "Entity class is permanently non-purgeable.",
                "retention_policy": policy.legal_basis,
            }

        is_eligible = record_age_days >= policy.retention_period_days
        return {
            "entity_type": entity_type,
            "is_purge_eligible": is_eligible,
            "reason": "Eligible for secure purge." if is_eligible else "Retention period not yet reached.",
            "retention_policy": policy.legal_basis,
        }

    @classmethod
    def get_retention_matrix(cls) -> list[dict[str, Any]]:
        """Return comprehensive statutory retention matrix."""
        return [
            {
                "entity_type": p.entity_type,
                "classification": p.classification.value,
                "retention_days": p.retention_period_days,
                "is_statutory_hold": p.is_statutory_hold,
                "legal_basis": p.legal_basis,
                "purge_allowed": p.purge_allowed,
            }
            for p in RETENTION_POLICIES.values()
        ]

