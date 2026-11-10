"""WealthOS Balance and Ledger Calculation Service."""

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.accounting.domain.accounting_rules import (
    NormalBalance,
    compute_account_balance,
)
from app.domains.accounting.domain.exceptions import AccountNotFoundError
from app.domains.accounting.domain.money import quantize_money
from app.domains.accounting.repositories.account_repository import AccountRepository
from app.domains.accounting.repositories.ledger_repository import LedgerRepository
from app.domains.accounting.schemas.account import AccountBalanceResponse
from app.domains.accounting.schemas.balance import (
    TrialBalanceItemResponse,
    TrialBalanceResponse,
)
from app.domains.accounting.schemas.ledger import (
    AccountLedgerResponse,
    GeneralLedgerResponse,
    LedgerEntryResponse,
)


class BalanceService:
    """Service providing real-time ledger statements, balances, and trial balance calculations."""

    @staticmethod
    async def get_account_balance(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        account_id: uuid.UUID,
        as_of_date: date | None = None,
    ) -> AccountBalanceResponse:
        """Compute real-time balance for an individual account."""
        account = await AccountRepository.get_by_id(session, account_id, tenant_id)
        if not account:
            raise AccountNotFoundError(f"Account '{account_id}' not found.")

        total_deb, total_cred = await LedgerRepository.get_account_totals(
            session=session,
            account_id=account_id,
            tenant_id=tenant_id,
            up_to_date=as_of_date,
        )
        balance = compute_account_balance(
            normal_balance=account.normal_balance,
            total_debits=total_deb,
            total_credits=total_cred,
        )

        return AccountBalanceResponse(
            account_id=account.id,
            account_code=account.account_code,
            account_name=account.account_name,
            account_type=account.account_type,
            normal_balance=account.normal_balance,
            currency_code=account.currency_code,
            total_debit=total_deb,
            total_credit=total_cred,
            balance=balance,
            as_of=datetime.now(UTC),
        )

    @staticmethod
    async def get_account_ledger(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        account_id: uuid.UUID,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> AccountLedgerResponse:
        """Compute detailed account statement with opening, running, and closing balances."""
        account = await AccountRepository.get_by_id(session, account_id, tenant_id)
        if not account:
            raise AccountNotFoundError(f"Account '{account_id}' not found.")

        # Compute opening balance
        if start_date is not None:
            op_deb, op_cred = await LedgerRepository.get_account_totals(
                session=session,
                account_id=account_id,
                tenant_id=tenant_id,
                strictly_before_date=start_date,
            )
            opening_balance = compute_account_balance(account.normal_balance, op_deb, op_cred)
        else:
            opening_balance = Decimal("0.0000")

        # Fetch lines in window
        rows = await LedgerRepository.get_account_ledger_lines(
            session=session,
            account_id=account_id,
            tenant_id=tenant_id,
            start_date=start_date,
            end_date=end_date,
        )

        running_balance = opening_balance
        total_period_debits = Decimal("0.0000")
        total_period_credits = Decimal("0.0000")
        entries: list[LedgerEntryResponse] = []

        is_debit_normal = account.normal_balance == NormalBalance.DEBIT.value

        for line, entry in rows:
            total_period_debits += line.functional_debit_amount
            total_period_credits += line.functional_credit_amount

            if is_debit_normal:
                running_balance += line.functional_debit_amount - line.functional_credit_amount
            else:
                running_balance += line.functional_credit_amount - line.functional_debit_amount

            entries.append(
                LedgerEntryResponse(
                    line_id=line.id,
                    journal_entry_id=entry.id,
                    entry_number=entry.entry_number,
                    entry_date=entry.entry_date,
                    posting_date=entry.posting_date,
                    description=line.description or entry.description,
                    reference=entry.reference,
                    source_type=entry.source_type,
                    debit_amount=line.debit_amount,
                    credit_amount=line.credit_amount,
                    functional_debit_amount=line.functional_debit_amount,
                    functional_credit_amount=line.functional_credit_amount,
                    running_balance=quantize_money(running_balance),
                )
            )

        return AccountLedgerResponse(
            account_id=account.id,
            account_code=account.account_code,
            account_name=account.account_name,
            account_type=account.account_type,
            normal_balance=account.normal_balance,
            currency_code=account.currency_code,
            start_date=start_date,
            end_date=end_date,
            opening_balance=quantize_money(opening_balance),
            entries=entries,
            closing_balance=quantize_money(running_balance),
            total_debits=quantize_money(total_period_debits),
            total_credits=quantize_money(total_period_credits),
        )

    @staticmethod
    async def get_general_ledger(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        start_date: date | None = None,
        end_date: date | None = None,
        functional_currency: str = "INR",
    ) -> GeneralLedgerResponse:
        """Compute General Ledger across all active accounts."""
        accounts = await AccountRepository.list_accounts(session, tenant_id, is_active=True)
        account_statements: list[AccountLedgerResponse] = []

        for acct in accounts:
            statement = await BalanceService.get_account_ledger(
                session=session,
                tenant_id=tenant_id,
                account_id=acct.id,
                start_date=start_date,
                end_date=end_date,
            )
            # Include accounts with activity or non-zero balance
            if statement.entries or statement.opening_balance != Decimal("0.0000"):
                account_statements.append(statement)

        return GeneralLedgerResponse(
            functional_currency=functional_currency,
            as_of=datetime.now(UTC),
            start_date=start_date,
            end_date=end_date,
            accounts=account_statements,
        )

    @staticmethod
    async def get_trial_balance(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        as_of_date: date | None = None,
        functional_currency: str = "INR",
    ) -> TrialBalanceResponse:
        """Generate Trial Balance report demonstrating double-entry equality."""
        effective_date = as_of_date or date.today()
        raw_rows = await LedgerRepository.get_trial_balance_aggregates(
            session=session,
            tenant_id=tenant_id,
            up_to_date=effective_date,
        )

        items: list[TrialBalanceItemResponse] = []
        tot_deb = Decimal("0.0000")
        tot_cred = Decimal("0.0000")

        for row in raw_rows:
            deb = row["total_debit"]
            cred = row["total_credit"]

            if deb > cred:
                debit_bal = quantize_money(deb - cred)
                credit_bal = Decimal("0.0000")
            elif cred > deb:
                debit_bal = Decimal("0.0000")
                credit_bal = quantize_money(cred - deb)
            else:
                debit_bal = Decimal("0.0000")
                credit_bal = Decimal("0.0000")

            tot_deb += debit_bal
            tot_cred += credit_bal

            items.append(
                TrialBalanceItemResponse(
                    account_id=row["account_id"],
                    account_code=row["account_code"],
                    account_name=row["account_name"],
                    account_type=row["account_type"],
                    normal_balance=row["normal_balance"],
                    debit_balance=debit_bal,
                    credit_balance=credit_bal,
                )
            )

        tot_deb = quantize_money(tot_deb)
        tot_cred = quantize_money(tot_cred)
        is_balanced = tot_deb == tot_cred

        return TrialBalanceResponse(
            as_of_date=effective_date,
            generated_at=datetime.now(UTC),
            functional_currency=functional_currency,
            accounts=items,
            total_debit=tot_deb,
            total_credit=tot_cred,
            is_balanced=is_balanced,
        )
