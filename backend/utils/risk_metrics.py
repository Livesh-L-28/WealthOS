"""
WealthOS Portfolio Risk Telemetry Engine
Vectorized statistical computation of Sharpe Ratio, Sortino Ratio, and Max Drawdown.
"""
import math
from typing import List, Tuple

def calculate_sharpe_ratio(returns: List[float], risk_free_rate: float = 0.045) -> float:
    """Calculates annualized Sharpe Ratio given periodic portfolio returns."""
    if not returns or len(returns) < 2:
        return 0.0
    mean_ret = sum(returns) / len(returns)
    variance = sum((r - mean_ret) ** 2 for r in returns) / (len(returns) - 1)
    std_dev = math.sqrt(variance)
    if std_dev == 0:
        return 0.0
    # Annualized based on 252 trading days
    excess_return = mean_ret - (risk_free_rate / 252.0)
    return (excess_return / std_dev) * math.sqrt(252.0)

def calculate_max_drawdown(equity_curve: List[float]) -> Tuple[float, int, int]:
    """Calculates the Maximum Peak-to-Trough Drawdown percentage and duration."""
    if not equity_curve:
        return 0.0, 0, 0
    max_dd = 0.0
    peak = equity_curve[0]
    peak_idx = 0
    trough_idx = 0
    curr_peak_idx = 0
    
    for i, val in enumerate(equity_curve):
        if val > peak:
            peak = val
            curr_peak_idx = i
        dd = (peak - val) / peak if peak > 0 else 0.0
        if dd > max_dd:
            max_dd = dd
            peak_idx = curr_peak_idx
            trough_idx = i
            
    return max_dd, peak_idx, trough_idx
