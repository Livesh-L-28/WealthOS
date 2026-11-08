# WealthOS Phase 19 — Granular Consent Management Architecture

## 1. Principles
Consent must be freely given, specific, informed, and unambiguous. WealthOS never bundles financial data processing into an all-or-nothing terms of service toggle.

---

## 2. Granular Purposes
- `ACCOUNT_AGGREGATION`: Permission to fetch account balances and transaction feeds from connected banking APIs.
- `AI_COPILOT_PROCESSING`: Permission to submit sanitized financial context to LLMs for natural language query answering and planning simulations.
- `TAX_PREPARATION_EXPORT`: Permission to format and export capital gains and deductions schedules for external tax consultants or portals.
- `HOUSEHOLD_SHARING`: Permission to share selected asset and liability accounts with household members.
- `ANALYTICS_TELEMETRY`: Opt-in permission for anonymized product usage metrics.

Revoking any single consent takes effect immediately across all application background processes without disrupting unrelated core capabilities.

