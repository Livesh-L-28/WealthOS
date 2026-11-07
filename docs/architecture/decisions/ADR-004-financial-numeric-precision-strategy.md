# ADR-004: FINANCIAL NUMERIC PRECISION STRATEGY

**Status:** ACCEPTED  
**Date:** 2026-11-07  
**Deciders:** Principal Software Architect, Financial Systems Engineer  
**Context:**  
IEEE-754 binary floating-point numbers (`float`, `double`) cannot accurately represent decimal fractions (e.g., $0.1 + 0.2 = 0.30000000000000004$). In financial accounting, accumulating sub-cent inaccuracies causes unbalance in double-entry ledgers, reconciliation failures, and regulatory compliance breaches.

**Decision:**  
We establish a zero-tolerance policy for binary floating-point arithmetic across the entire application stack:
1. **Database:** All fiat monetary amounts are stored as PostgreSQL `NUMERIC(18, 4)`. All asset quantities (stocks, mutual fund units, gold grams, crypto) are stored as `NUMERIC(24, 8)`. Foreign exchange rates are stored as `NUMERIC(18, 8)`.
2. **Backend Engine:** All calculations in Python must use `decimal.Decimal` with explicit rounding modes (`ROUND_HALF_UP` for fiat amounts). Python `float` is strictly banned in all financial domains.
3. **Frontend / APIs:** Amounts are serialized as string representations or integer fractional units across REST APIs and parsed via high-precision decimal math libraries (e.g., `decimal.js` or `bignumber.js`) where arithmetic is required on the client.

**Consequences:**  
- **Positive:** Absolute mathematical precision; zero rounding drift; deterministic ledger balance verification.
- **Negative:** Slightly higher memory footprint and serialization overhead compared to native 64-bit floats.
