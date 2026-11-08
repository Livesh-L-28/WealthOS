# WealthOS — Phase 8: India Tax Readiness Rule Register

**Document Version:** 1.0.0  
**Phase:** Phase 8 — Wave 3 Master Implementation  
**Status:** ACTIVE REGISTER  

---

## 1. Rule Version Registry

| Rule Version | Effective FY Range | Assessment Years | Key Legislation / Finance Act Basis | Status |
|---|---|---|---|---|
| **`2024.1`** | FY 2023-24 (01-Apr-2023 to 31-Mar-2024) | AY 2024-25 | Finance Act 2023 (New Regime Default, ₹50k Std Ded, 87A up to ₹7L) | Deprecated |
| **`2025.1`** | FY 2024-25 (01-Apr-2024 to 31-Mar-2025) | AY 2025-26 | Finance (No. 2) Act 2024 (New Regime ₹75k Std Ded, LTCG 12.5% ₹1.25L exemp) | Active |
| **`2026.1`** | FY 2025-26 & FY 2026-27 (Current) | AY 2026-27 & AY 2027-28 | Finance Act 2024 / Updated Slabs & STCG 20% Section 111A | **Current Default** |

---

## 2. Parameter Register: Rule Version `2026.1`

### 2.1 Standard Deductions
- **New Tax Regime (Sec 115BAC):** ₹75,000 for salaried individuals and pensioners.
- **Old Tax Regime:** ₹50,000 for salaried individuals and pensioners.

### 2.2 Slabs & Rates — New Tax Regime (Section 115BAC)
| Income Bracket (₹) | Tax Rate (%) | Cumulative Tax at Slab Top (₹) |
|---|---|---|
| $0 - 3,00,000$ | 0% (Nil) | ₹0 |
| $3,00,001 - 7,00,000$ | 5% | ₹20,000 |
| $7,00,001 - 10,00,000$ | 10% | ₹50,000 |
| $10,00,001 - 12,00,000$ | 15% | ₹80,000 |
| $12,00,001 - 15,00,000$ | 20% | ₹1,40,000 |
| $> 15,00,000$ | 30% | ₹1,40,000 + 30% of amount above ₹15L |

*Section 87A Rebate: Full tax rebate if Net Taxable Income $\le ₹7,00,000$. Marginal relief applies if income marginally exceeds ₹7,00,000.*

### 2.3 Slabs & Rates — Old Tax Regime
| Income Bracket (₹) | Tax Rate (%) | Cumulative Tax at Slab Top (₹) |
|---|---|---|
| $0 - 2,50,000$ | 0% (Nil) | ₹0 |
| $2,50,001 - 5,00,000$ | 5% | ₹12,500 |
| $5,00,001 - 10,00,000$ | 20% | ₹1,12,500 |
| $> 10,00,000$ | 30% | ₹1,12,500 + 30% of amount above ₹10L |

*Section 87A Rebate: Full tax rebate if Net Taxable Income $\le ₹5,00,000$.*

### 2.4 Capital Gains Rates (Effective 23-Jul-2024 onwards)
- **Listed Equity / Equity Oriented Mutual Funds:**
  - STCG (Holding period $\le 12$ months): **20%** (Section 111A).
  - LTCG (Holding period $> 12$ months): **12.5%** on gains exceeding **₹1,25,000** (Section 112A).
- **Other Financial & Real Estate Assets:**
  - Unlisted Shares LTCG ($> 24$ months): **12.5%** without indexation.
  - Immovable Property LTCG ($> 24$ months): **12.5%** without indexation (or 20% with indexation for pre-23-Jul-2024 properties under grandfathering provisions).
  - Debt Mutual Funds / Market Linked Debentures: Always STCG at applicable slab rate.

### 2.5 Health & Education Cess
- Rate: **4.0%** applied on `(Tax on Income - Rebate 87A + Surcharge)`.

### 2.6 Deductions (Old Regime Only)
- **Section 80C:** Maximum ₹1,50,000 (EPF, PPF, ELSS, Life Insurance, Principal on Home Loan, Tuition Fees).
- **Section 80D:** Maximum ₹25,000 (Self, Spouse, Children) + ₹25,000 (Parents $< 60$) or ₹50,000 (Senior Citizen Parents).
- **Section 80CCD(1B):** Additional ₹50,000 for National Pension System (NPS).
- **Section 80TTA:** Maximum ₹10,000 on savings account interest (Resident individuals $< 60$).
- **Section 24(b):** Maximum ₹2,00,000 interest on housing loan for self-occupied property.
