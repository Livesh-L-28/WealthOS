# Wave 1 — Phase 3: Professional Investment Accounting Architecture

**Project:** WealthOS  
**Wave:** Wave 1  
**Phase:** Phase 3 (Professional Investment Accounting)  
**Date:** 2026-11-08  
**Standard:** Master Wave 1 Specification — Section 7.

---

## 1. Mission & Architectural Principles

The Investment Accounting domain maintains a reliable, verifiable record of user investments, acquisition lots, disposals, realized and unrealized returns, passive income, and corporate actions across Indian and international asset classes.

### Non-Negotiable Invariants
1. **FIFO Lot Allocation:** Lot disposals strictly follow First-In, First-Out (FIFO) ordering based on acquisition date.
2. **Negative Inventory Prevention:** Disposals exceeding available remaining quantity are rejected with an explicit error ($\text{Remaining} \ge 0$).
3. **P&L Segregation:** Realized P&L and Unrealized P&L are strictly decoupled:
   $$\text{Realized P&L} = \text{Net Disposal Proceeds} - \text{Allocated FIFO Cost Basis}$$
   $$\text{Unrealized P&L} = (\text{Remaining Quantity} \times \text{Current NAV}) - \text{Remaining Cost Basis}$$
4. **Corporate Action Neutrality:** Stock splits and bonus issues preserve overall invested capital ($CostBasis_{\text{post}} = CostBasis_{\text{pre}}$) while adjusting unit counts and average unit prices.
5. **Dividend Integrity:** Dividends and interest income are tracked with gross, tax withheld, and net amounts, preventing duplicate recognition.

---

## 2. FIFO Lot Disposal Algorithm

When a `SELL` transaction of quantity $Q_{\text{sell}}$ occurs:
1. Retrieve open lots for the instrument ordered by `purchase_date ASC`:
   $$\mathcal{L} = \{ L_1, L_2, \dots, L_n \mid L_i.\text{remaining\_quantity} > 0 \}$$
2. Check solvency: $\sum_{i} L_i.\text{remaining\_quantity} \ge Q_{\text{sell}}$. Reject if insufficient.
3. For each lot $L_i$:
   - Let $q_i = \min(L_i.\text{remaining\_quantity}, Q_{\text{remaining}})$.
   - $\text{LotCostBasisAllocated}_i = q_i \times L_i.\text{purchase\_price}$.
   - $L_i.\text{remaining\_quantity} \gets L_i.\text{remaining\_quantity} - q_i$.
   - $L_i.\text{cost\_basis} \gets L_i.\text{remaining\_quantity} \times L_i.\text{purchase\_price}$.
   - $L_i.\text{lot\_status} \gets \text{'CLOSED'}$ if $L_i.\text{remaining\_quantity} = 0$ else $\text{'PARTIALLY\_DISPOSED'}$.
   - $Q_{\text{remaining}} \gets Q_{\text{remaining}} - q_i$.
   - Break when $Q_{\text{remaining}} = 0$.
4. Total Allocated Cost Basis = $\sum q_i \times L_i.\text{purchase\_price}$.
5. $\text{Realized P&L} = (\text{Gross Proceeds} - \text{Fees}) - \text{Total Allocated Cost Basis}$.

---

## 3. Supported Asset Classes & Return Metrics

### Asset Classes
- NSE & BSE Equities (Shares)
- Mutual Funds (Equity, Debt, Hybrid, Index)
- Exchange Traded Funds (ETFs)
- Fixed Deposits & Bonds
- Sovereign Gold Bonds (SGB) & Physical Gold
- Retirement accounts (PPF, EPF, NPS)

### Return Metrics
- **Absolute Return (%):** $\frac{\text{Current Value} - \text{Invested}}{\text{Invested}} \times 100$
- **XIRR (Extended Internal Rate of Return):** Annualized return accounting for the exact timing of irregular cash flows (SIPs and redemptions) satisfying:
  $$\sum_{i=1}^{N} \frac{C_i}{(1 + \text{XIRR})^{(d_i - d_1)/365}} = 0$$
- **Time-Weighted Return (TWR):** Compounding returns across sub-periods to isolate manager performance from deposit timing.

---

## 4. API Endpoints (`/api/v1/investments/*`)

- `GET /api/v1/investments/portfolio` — Total portfolio value, invested capital, realized P&L, unrealized P&L, asset allocation.
- `GET /api/v1/investments/instruments` — Instrument master search and listing.
- `POST /api/v1/investments/instruments` — Register financial instrument.
- `GET /api/v1/investments/lots` — List open and partially disposed FIFO acquisition lots.
- `POST /api/v1/investments/transactions/buy` — Record asset purchase, create FIFO acquisition lot.
- `POST /api/v1/investments/transactions/sell` — Record asset sale, execute FIFO lot disposal, compute Realized P&L.
- `POST /api/v1/investments/corporate-actions/split` — Execute stock split (adjust unit count and unit price).
- `POST /api/v1/investments/corporate-actions/bonus` — Execute bonus issue.
- `POST /api/v1/investments/income/dividend` — Record dividend income with tax withholding.
