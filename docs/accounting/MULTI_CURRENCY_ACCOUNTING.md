# WealthOS — Multi-Currency Accounting Foundation

## 1. Scope & Strategy
WealthOS is India-first with `INR` as the primary functional currency, while supporting cross-currency holdings (e.g., USD brokerage accounts, EUR travel expenses).

---

## 2. Dual-Currency Representation on Journal Lines

Every journal line stores:
- `transaction_currency`: ISO 4217 code (e.g., `USD`).
- `transaction_amount`: Denominated nominal amount.
- `exchange_rate`: Conversion factor to functional currency (`NUMERIC(18, 8)`).
- `functional_debit_amount`: $\text{Debit} \times \text{Exchange Rate}$.
- `functional_credit_amount`: $\text{Credit} \times \text{Exchange Rate}$.

---

## 3. Balancing Rule
The double-entry invariant is strictly evaluated in the tenant's **functional currency**:

$$\sum \text{functional\_debit} \equiv \sum \text{functional\_credit}$$

Any cross-currency valuation difference or exchange rate fluctuation is explicitly balanced through Foreign Exchange Gain (`4500`) or Foreign Exchange Loss (`5200`) accounts. Implicit or unrecorded rounding conversions are strictly rejected.
