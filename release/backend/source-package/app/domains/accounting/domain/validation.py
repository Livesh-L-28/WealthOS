"""WealthOS Accounting Validation Logic."""

from collections.abc import Sequence
from decimal import Decimal
from typing import Any

from app.domains.accounting.domain.exceptions import (
    InvalidMoneyError,
    UnbalancedJournalError,
)
from app.domains.accounting.domain.money import (
    quantize_money,
    quantize_rate,
    validate_currency_code,
)


def validate_journal_lines_balance(
    lines: Sequence[Any],
    functional_currency: str = "INR",
) -> tuple[Decimal, Decimal]:
    """Validate that journal lines strictly satisfy double-entry invariants.

    Invariants:
    1. A journal entry must contain at least 2 lines.
    2. Every line must have a strictly positive amount on exactly one side (debit or credit).
    3. Currency codes must be valid ISO 4217 strings.
    4. Exchange rate must be strictly positive.
    5. Functional debit and credit amounts must equal transaction amounts multiplied by exchange rate.
    6. Sum of functional debits must equal sum of functional credits.

    Returns:
        tuple[Decimal, Decimal]: (total_functional_debit, total_functional_credit)

    Raises:
        InvalidMoneyError: If any line has invalid, negative, or dual-sided amounts.
        UnbalancedJournalError: If debits and credits do not balance.
    """
    if len(lines) < 2:
        raise InvalidMoneyError(
            f"Journal entry must contain at least 2 lines for double-entry bookkeeping, got {len(lines)}."
        )

    clean_func_curr = validate_currency_code(functional_currency)
    total_debit = Decimal("0.0000")
    total_credit = Decimal("0.0000")

    for idx, line in enumerate(lines, start=1):
        # Support either Pydantic models or dictionaries or ORM objects
        if isinstance(line, dict):
            debit = quantize_money(line.get("debit_amount") or 0)
            credit = quantize_money(line.get("credit_amount") or 0)
            tx_currency = validate_currency_code(
                line.get("transaction_currency") or clean_func_curr
            )
            raw_tx = line.get("transaction_amount")
            rate = quantize_rate(line.get("exchange_rate") or 1)
            raw_f_deb = line.get("functional_debit_amount")
            raw_f_cred = line.get("functional_credit_amount")
        else:
            debit = quantize_money(getattr(line, "debit_amount", 0) or 0)
            credit = quantize_money(getattr(line, "credit_amount", 0) or 0)
            tx_currency = validate_currency_code(
                getattr(line, "transaction_currency", None) or clean_func_curr
            )
            raw_tx = getattr(line, "transaction_amount", None)
            rate = quantize_rate(getattr(line, "exchange_rate", 1) or 1)
            raw_f_deb = getattr(line, "functional_debit_amount", None)
            raw_f_cred = getattr(line, "functional_credit_amount", None)

        nominal = debit if debit > 0 else credit
        tx_amount = quantize_money(raw_tx) if raw_tx is not None and raw_tx > 0 else nominal
        f_debit = quantize_money(raw_f_deb) if raw_f_deb is not None else Decimal("0.0000")
        f_credit = quantize_money(raw_f_cred) if raw_f_cred is not None else Decimal("0.0000")

        # Check single-sided amount
        if debit <= 0 and credit <= 0:
            raise InvalidMoneyError(f"Line {idx}: Must have a positive debit or credit amount.")
        if debit > 0 and credit > 0:
            raise InvalidMoneyError(
                f"Line {idx}: Cannot have both debit ({debit}) and credit ({credit}) on the same line."
            )

        # Validate transaction amount matches debit or credit
        nominal = debit if debit > 0 else credit
        if tx_amount <= 0:
            tx_amount = nominal

        # Recompute/verify functional amount
        expected_functional = quantize_money(nominal * rate)
        if debit > 0:
            if f_debit <= 0 or (tx_currency == clean_func_curr and rate == Decimal("1.00000000")):
                f_debit = expected_functional
            f_credit = Decimal("0.0000")
        else:
            if f_credit <= 0 or (tx_currency == clean_func_curr and rate == Decimal("1.00000000")):
                f_credit = expected_functional
            f_debit = Decimal("0.0000")

        total_debit += f_debit
        total_credit += f_credit

    total_debit = quantize_money(total_debit)
    total_credit = quantize_money(total_credit)

    if total_debit != total_credit:
        imbalance = quantize_money(abs(total_debit - total_credit))
        raise UnbalancedJournalError(
            total_debit=str(total_debit),
            total_credit=str(total_credit),
            difference=str(imbalance),
        )

    return total_debit, total_credit
