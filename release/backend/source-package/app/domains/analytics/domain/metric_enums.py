"""WealthOS Metric Enumerations and Classification Types."""

from enum import Enum


class MetricDomain(str, Enum):
    """Core financial domain classification."""

    WEALTH = "wealth"
    CASH = "cash"
    INVESTMENT = "investment"
    BUDGET = "budget"
    LIABILITY = "liability"
    PLANNING = "planning"
    RISK = "risk"
    TAX = "tax"
    HOUSEHOLD = "household"


class AggregationMethod(str, Enum):
    """Mathematical aggregation technique."""

    POINT_IN_TIME = "point_in_time"
    SUM = "sum"
    AVERAGE = "average"
    RATIO = "ratio"
    WEIGHTED_INDEX = "weighted_index"


class TimeGrain(str, Enum):
    """Reporting calendar grain."""

    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"


class DataStatus(str, Enum):
    """Data certainty classification."""

    ACTUAL = "actual"
    PROJECTED = "projected"
    ESTIMATED = "estimated"
    SCENARIO = "scenario"


class FreshnessStatus(str, Enum):
    """Data provenance and recency status."""

    CURRENT = "current"
    STALE = "stale"
    DELAYED = "delayed"
    MISSING = "missing"

