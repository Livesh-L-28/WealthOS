# ADR-006: FIFO COST-BASIS ACCOUNTING FOR INVESTMENTS

**Status:** ACCEPTED  
**Date:** 2026-11-07  
**Deciders:** Principal Software Architect, Financial Systems Engineer  
**Context:**  
Accurate computation of realized capital gains, tax liabilities (LTCG / STCG in India), and portfolio performance requires an explicit cost-basis accounting policy. Under Indian tax laws and international standard practice, First-In, First-Out (FIFO) is the standard method for listed equities and mutual fund units.

**Decision:**  
We implement a granular **FIFO Tax-Lot Tracking Engine**:
1. Every purchase of an instrument creates an `investment_lots` entry recording the acquisition date, purchase price, allocated fees, and `units_remaining`.
2. When a sale occurs, the system automatically allocates sold units against the oldest available lots where `units_remaining > 0` in ascending chronological order (`purchase_date ASC`).
3. An immutable `investment_lot_allocations` record is generated for every tranche consumed, linking the sale to its specific purchase lot and recording exact cost basis, realized gain/loss, and holding duration.
4. Capital gains are tagged as Long-Term or Short-Term based on Indian tax holding thresholds (e.g., 12 months for listed equities/equity funds; 24-36 months for other assets).

**Consequences:**  
- **Positive:** Compliant with Indian Income Tax Act requirements; provides exact audit trails for every rupee of capital gain; eliminates ambiguity in tax return preparation.
- **Negative:** Requires strict database locking during concurrent sell orders to prevent race conditions on lot unit decrements.
