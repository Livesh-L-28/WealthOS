"""Unit and invariant tests for WealthOS Money and Monetary Precision Foundations."""

from decimal import Decimal

import pytest

from app.domains.accounting.domain.exceptions import InvalidMoneyError
from app.domains.accounting.domain.money import (
    quantize_money,
    quantize_rate,
    validate_currency_code,
)


def test_quantize_money_precision_and_bankers_rounding():
    """Verify that money is quantized to exactly 4 decimal places using ROUND_HALF_EVEN."""
    # Banker's rounding (round to nearest even)
    # 2.50005 -> 2.5000 (even)
    assert quantize_money(Decimal("2.50005")) == Decimal("2.5000")
    # 2.50015 -> 2.5002 (even)
    assert quantize_money(Decimal("2.50015")) == Decimal("2.5002")
    # Exact 4 decimals
    assert quantize_money(Decimal("100.5")) == Decimal("100.5000")
    assert quantize_money(100) == Decimal("100.0000")
    assert quantize_money("1234.5678") == Decimal("1234.5678")


def test_strict_ban_on_floats_for_money():
    """Verify that any Python float passed into quantize_money raises TypeError."""
    with pytest.raises(TypeError, match="Binary float is strictly prohibited"):
        quantize_money(100.50)  # type: ignore[arg-type]

    with pytest.raises(TypeError, match="Binary float is strictly prohibited"):
        quantize_money(0.0)  # type: ignore[arg-type]


def test_strict_ban_on_floats_for_rates():
    """Verify that any Python float passed into quantize_rate raises TypeError."""
    with pytest.raises(TypeError, match="Binary float is strictly prohibited"):
        quantize_rate(83.12345678)  # type: ignore[arg-type]


def test_quantize_rate_precision():
    """Verify that exchange rates are quantized to exactly 8 decimal places."""
    rate = quantize_rate(Decimal("83.123456789"))
    assert rate == Decimal("83.12345679")
    assert rate.as_tuple().exponent == -8

    rate_int = quantize_rate(1)
    assert rate_int == Decimal("1.00000000")


def test_currency_code_validation():
    """Verify standard ISO 4217 validation rules."""
    assert validate_currency_code("INR") == "INR"
    assert validate_currency_code("inr") == "INR"
    assert validate_currency_code("USD") == "USD"
    assert validate_currency_code("EUR") == "EUR"
    assert validate_currency_code("GBP") == "GBP"

    # Invalid codes
    with pytest.raises(InvalidMoneyError, match="Invalid ISO 4217 currency code"):
        validate_currency_code("US")

    with pytest.raises(InvalidMoneyError, match="Invalid ISO 4217 currency code"):
        validate_currency_code("USDT")

    with pytest.raises(InvalidMoneyError, match="Invalid ISO 4217 currency code"):
        validate_currency_code("123")

    with pytest.raises(InvalidMoneyError, match="Invalid ISO 4217 currency code"):
        validate_currency_code("IN$")
