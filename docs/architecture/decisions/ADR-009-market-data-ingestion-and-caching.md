# ADR-009: MARKET DATA INGESTION & CACHING STRATEGY

**Status:** ACCEPTED  
**Date:** 2026-11-07  
**Deciders:** Principal Software Architect, Financial Systems Engineer  
**Context:**  
Accurately valuing user portfolios (equities, mutual funds, gold, bonds) requires reliable market prices without violating terms of service, incurring excessive API costs, or introducing single points of failure when external feeds experience latency or outages.

**Decision:**  
We implement a **Multi-Tier Market Data Architecture with Redis Caching**:
1. **Authorized Sources:**
   - Mutual Funds: Daily official NAV releases via AMFI (Association of Mutual Funds in India) official public feeds.
   - Listed Equities: EOD (End of Day) and 15-minute delayed quotes from authorized exchange-licensed feeds.
   - Sovereign Gold Bonds & Gold: Daily bullion rates from IBJA / official gold spot feeds.
2. **Provenance & Freshness:** Every market price record in the database carries `source`, `timestamp`, `currency`, and `freshness_status`.
3. **Caching & Fallback:** Latest quotes are cached in Redis with a 15-minute TTL during market hours. If external feeds fail, the system serves the last verified price with an explicit "Delayed / Historical" UI badge. Manual user overrides are supported for unlisted/private assets.

**Consequences:**  
- **Positive:** Compliant with exchange policies; resilient against third-party API downtime; sub-millisecond portfolio valuation lookups via Redis.
- **Negative:** Real-time tick-by-tick streaming is out of scope for wealth management (EOD/delayed quotes are sufficient).
