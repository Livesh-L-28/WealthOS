"""WealthOS Money & Financial Precision Domain Utilities.

Strictly enforces IEEE-754 binary floating-point ban (ADR-004), fixed-point
monetary precision (NUMERIC 18, 4), and exchange rate precision (NUMERIC 18, 8).
"""

import re
from decimal import ROUND_HALF_EVEN, Decimal
from typing import Any

from app.domains.accounting.domain.exceptions import InvalidMoneyError

MONEY_QUANTIZE = Decimal("0.0001")
RATE_QUANTIZE = Decimal("0.00000001")
ISO_4217_REGEX = re.compile(r"^[A-Z]{3}$")


def quantize_money(value: Any) -> Decimal:
    """Coerce and quantize a monetary value to exactly 4 decimal places using ROUND_HALF_EVEN.

    Args:
        value: Decimal, integer, or numeric string.

    Raises:
        TypeError: If value is a binary float (strictly prohibited in WealthOS).
        InvalidMoneyError: If value cannot be parsed into a finite Decimal.
    """
    if isinstance(value, float):
        raise TypeError(
            "Binary float is strictly prohibited for monetary calculations. "
            "Use Python Decimal, integer, or string representation."
        )

    try:
        if isinstance(value, Decimal):
            d = value
        elif isinstance(value, (int, str)):
            d = Decimal(str(value).strip())
        else:
            raise TypeError(f"Unsupported money type: {type(value).__name__}")

        if not d.is_finite():
            raise InvalidMoneyError("Monetary amount must be a finite number.")

        return d.quantize(MONEY_QUANTIZE, rounding=ROUND_HALF_EVEN)
    except Exception as exc:
        if isinstance(exc, (TypeError, InvalidMoneyError)):
            raise
        raise InvalidMoneyError(f"Invalid monetary value: {value}") from exc


def quantize_rate(value: Any) -> Decimal:
    """Coerce and quantize an exchange rate to exactly 8 decimal places using ROUND_HALF_EVEN.

    Args:
        value: Decimal, integer, or numeric string.

    Raises:
        TypeError: If value is a binary float.
        InvalidMoneyError: If rate is non-positive or non-finite.
    """
    if isinstance(value, float):
        raise TypeError(
            "Binary float is strictly prohibited for exchange rates. "
            "Use Python Decimal, integer, or string representation."
        )

    try:
        if isinstance(value, Decimal):
            d = value
        elif isinstance(value, (int, str)):
            d = Decimal(str(value).strip())
        else:
            raise TypeError(f"Unsupported rate type: {type(value).__name__}")

        if not d.is_finite():
            raise InvalidMoneyError("Exchange rate must be a finite number.")

        if d <= Decimal("0"):
            raise InvalidMoneyError(f"Exchange rate must be strictly positive, got {d}.")

        return d.quantize(RATE_QUANTIZE, rounding=ROUND_HALF_EVEN)
    except Exception as exc:
        if isinstance(exc, (TypeError, InvalidMoneyError)):
            raise
        raise InvalidMoneyError(f"Invalid exchange rate: {value}") from exc


def validate_currency_code(code: str) -> str:
    """Validate standard 3-character uppercase ISO 4217 currency code."""
    if not isinstance(code, str):
        raise InvalidMoneyError("Currency code must be a string.")
    clean = code.strip().upper()
    if not ISO_4217_REGEX.match(clean):
        raise InvalidMoneyError(
            f"Invalid ISO 4217 currency code: '{code}'. Must be 3 uppercase letters."
        )
    return clean
