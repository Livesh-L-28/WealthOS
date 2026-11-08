"""WealthOS AI Governance, Answer Provenance & Prompt Injection Guardrails.

Provides evidence attribution, confidence scoring, token/cost accounting,
and defensive filtering against prompt injection and instruction override attacks.
"""

from __future__ import annotations

import re
import time
import uuid
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Any

from app.core.logging import get_logger

logger = get_logger("wealthos.ai_governance")

# Common Prompt Injection & Jailbreak Patterns
INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior)\s+(instructions|prompts|rules)", re.IGNORECASE),
    re.compile(r"system\s+prompt\s+(reveal|show|dump|print)", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+(in\s+developer\s+mode|dan|unrestricted)", re.IGNORECASE),
    re.compile(r"(bypass|override)\s+(financial|ledger|safety|security)\s+(rules|invariants)", re.IGNORECASE),
    re.compile(r"exfiltrate\s+(tenants|users|passwords|keys)", re.IGNORECASE),
    re.compile(r"<script>|javascript:|SELECT\s+.*\s+FROM\s+pg_catalog", re.IGNORECASE),
]


class PromptInjectionBlockedError(Exception):
    """Raised when a prompt injection or safety bypass pattern is detected."""

    def __init__(self, patterns: list[str]) -> None:
        super().__init__(
            f"Security Alert: Prompt injection attempt detected and blocked. Violations: {patterns}"
        )
        self.matched_patterns = patterns


@dataclass
class AnswerCitation:
    """Individual financial evidence citation."""

    entity_type: str  # e.g., 'journal_entry', 'holding_lot', 'account_balance'
    entity_id: str
    label: str
    verified_value: str


@dataclass
class AnswerProvenanceRecord:
    """Full provenance telemetry for an AI response."""

    answer_id: str
    tenant_id: uuid.UUID
    user_id: uuid.UUID
    prompt: str
    response_text: str
    citations: list[dict[str, Any]]
    confidence_score: float  # 0.0 to 1.0
    model_name: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    latency_ms: float
    cost_inr: float
    user_feedback_rating: int | None = None  # 1 (negative) to 5 (positive)
    user_feedback_comment: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))


# In-memory governance ledger (mirrored in production analytics datastore)
_PROVENANCE_RECORDS: dict[str, AnswerProvenanceRecord] = {}


class AIGovernanceService:
    """Enterprise AI Governance, Guardrails and Evaluation Engine."""

    # Cost per 1,000 tokens (INR estimate for Gemini 1.5 Pro / Flash)
    TOKEN_RATES_INR = {
        "gemini-1.5-flash": {"prompt": 0.006, "completion": 0.025},
        "gemini-1.5-pro": {"prompt": 0.29, "completion": 0.87},
    }

    @classmethod
    def guard_prompt(cls, prompt: str) -> None:
        """Inspect prompt for adversarial injection or jailbreak attempts.
        
        Raises PromptInjectionBlockedError if malicious pattern is detected.
        """
        if not prompt or not prompt.strip():
            return

        violations = []
        for pattern in INJECTION_PATTERNS:
            if pattern.search(prompt):
                violations.append(pattern.pattern)

        if violations:
            logger.error(f"[AI SECURITY] Blocked prompt injection attempt. Patterns: {violations}")
            raise PromptInjectionBlockedError(violations)

    @classmethod
    def record_provenance(
        cls,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        prompt: str,
        response_text: str,
        citations: list[AnswerCitation],
        confidence_score: float,
        model_name: str,
        prompt_tokens: int,
        completion_tokens: int,
        latency_ms: float,
    ) -> AnswerProvenanceRecord:
        """Record answer provenance with token and cost attribution."""
        answer_id = f"ans_{uuid.uuid4().hex[:12]}"
        total_tokens = prompt_tokens + completion_tokens

        # Compute estimated cost
        rate = cls.TOKEN_RATES_INR.get(model_name, cls.TOKEN_RATES_INR["gemini-1.5-flash"])
        cost = (prompt_tokens / 1000.0 * rate["prompt"]) + (completion_tokens / 1000.0 * rate["completion"])

        record = AnswerProvenanceRecord(
            answer_id=answer_id,
            tenant_id=tenant_id,
            user_id=user_id,
            prompt=prompt,
            response_text=response_text,
            citations=[asdict(c) for c in citations],
            confidence_score=max(0.0, min(1.0, float(confidence_score))),
            model_name=model_name,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            latency_ms=round(latency_ms, 2),
            cost_inr=round(cost, 4),
        )
        _PROVENANCE_RECORDS[answer_id] = record
        logger.info(
            f"Recorded AI provenance {answer_id}: model={model_name}, tokens={total_tokens}, "
            f"citations={len(citations)}, confidence={confidence_score:.2f}"
        )
        return record

    @classmethod
    def record_user_feedback(
        cls,
        answer_id: str,
        rating: int,
        comment: str | None = None,
    ) -> AnswerProvenanceRecord:
        """Capture explicit user thumbs-up/down or 1-5 rating."""
        if answer_id not in _PROVENANCE_RECORDS:
            raise ValueError(f"Answer {answer_id} not found.")

        rec = _PROVENANCE_RECORDS[answer_id]
        rec.user_feedback_rating = rating
        rec.user_feedback_comment = comment
        logger.info(f"Captured user feedback for {answer_id}: rating={rating}")
        return rec

    @classmethod
    def get_tenant_token_usage(cls, tenant_id: uuid.UUID) -> dict[str, Any]:
        """Aggregate total token consumption and spend for tenant."""
        tenant_records = [r for r in _PROVENANCE_RECORDS.values() if r.tenant_id == tenant_id]
        total_prompt = sum(r.prompt_tokens for r in tenant_records)
        total_completion = sum(r.completion_tokens for r in tenant_records)
        total_cost = sum(r.cost_inr for r in tenant_records)

        return {
            "tenant_id": str(tenant_id),
            "total_queries": len(tenant_records),
            "total_prompt_tokens": total_prompt,
            "total_completion_tokens": total_completion,
            "total_tokens": total_prompt + total_completion,
            "estimated_spend_inr": round(total_cost, 2),
        }

