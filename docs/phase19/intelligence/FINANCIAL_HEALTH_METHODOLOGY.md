# WealthOS Phase 19 — Deterministic Financial Health Methodology

## 1. Multi-Pillar Scoring Model
WealthOS computes an objective Financial Health Score (0 to 100) combining four independent pillars of financial stability:

### 1.1 Pillar 1: Liquidity Coverage (25 Points)
- **Target**: 6 months of average monthly expenses in liquid depository cash.
- **Formula**:
  $$\text{Score}_{\text{liq}} = \min\left(25.0, \frac{\text{Emergency Coverage Months}}{6.0} \times 25.0\right)$$

### 1.2 Pillar 2: Debt Health & Solvency (25 Points)
- **Target**: Debt-to-Income (DTI) ratio $\le 20.0\%$. Max threshold: $60.0\%$.
- **Formula**:
  $$\text{Score}_{\text{debt}} = 25.0 - \left(\frac{\text{DTI} - 20.0}{40.0} \times 25.0\right) \quad (\text{bounded } [0, 25])$$

### 1.3 Pillar 3: Savings Discipline (25 Points)
- **Target**: Monthly savings rate $\ge 30.0\%$.
- **Formula**:
  $$\text{Score}_{\text{save}} = \min\left(25.0, \frac{\max(0, \text{Savings Rate})}{30.0} \times 25.0\right)$$

### 1.4 Pillar 4: Portfolio Diversification (25 Points)
- **Target**: Top single instrument represents $\le 25.0\%$ of total liquid portfolio value.
- **Formula**:
  $$\text{Score}_{\text{div}} = 25.0 - \left(\frac{\text{Top Concentration} - 25.0}{50.0} \times 25.0\right) \quad (\text{bounded } [0, 25])$$

### Composite Classification
- **80 – 100**: `EXCELLENT`
- **65 – 79**: `GOOD`
- **50 – 64**: `FAIR`
- **0 – 49**: `VULNERABLE`
