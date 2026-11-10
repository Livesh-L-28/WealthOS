"""WealthOS Chart of Accounts Application Service.

Manages account creation, validation, hierarchy traversal, and standard template seeding.
"""

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.accounting.domain.accounting_rules import (
    AccountType,
    get_default_normal_balance,
)
from app.domains.accounting.domain.exceptions import (
    AccountNotFoundError,
    InvalidAccountHierarchyError,
)
from app.domains.accounting.models.account import Account
from app.domains.accounting.repositories.account_repository import AccountRepository
from app.domains.accounting.schemas.account import (
    CreateAccountRequest,
    UpdateAccountRequest,
)

logger = get_logger("wealthos.accounting.coa")

STANDARD_CHART_OF_ACCOUNTS_TEMPLATE: list[dict[str, Any]] = [
    # ASSETS (1000s)
    {"code": "1000", "name": "Current Assets", "type": AccountType.ASSET, "parent": None},
    {"code": "1010", "name": "Cash and Bank Accounts", "type": AccountType.ASSET, "parent": "1000"},
    {
        "code": "1020",
        "name": "Primary Savings Account",
        "type": AccountType.ASSET,
        "parent": "1010",
    },
    {"code": "1030", "name": "Fixed Deposits", "type": AccountType.ASSET, "parent": "1010"},
    {"code": "1100", "name": "Investment Assets", "type": AccountType.ASSET, "parent": None},
    {"code": "1110", "name": "Indian Equities", "type": AccountType.ASSET, "parent": "1100"},
    {"code": "1120", "name": "Mutual Funds (Equity)", "type": AccountType.ASSET, "parent": "1100"},
    {"code": "1130", "name": "Mutual Funds (Debt)", "type": AccountType.ASSET, "parent": "1100"},
    {
        "code": "1140",
        "name": "US & International Equities",
        "type": AccountType.ASSET,
        "parent": "1100",
    },
    {"code": "1150", "name": "Gold & Precious Metals", "type": AccountType.ASSET, "parent": "1100"},
    {
        "code": "1160",
        "name": "Provident Fund (EPF/PPF)",
        "type": AccountType.ASSET,
        "parent": "1100",
    },
    {
        "code": "1170",
        "name": "National Pension Scheme (NPS)",
        "type": AccountType.ASSET,
        "parent": "1100",
    },
    {
        "code": "1200",
        "name": "Real Estate & Illiquid Assets",
        "type": AccountType.ASSET,
        "parent": None,
    },
    {
        "code": "1210",
        "name": "Residential Real Estate",
        "type": AccountType.ASSET,
        "parent": "1200",
    },
    # LIABILITIES (2000s)
    {"code": "2000", "name": "Current Liabilities", "type": AccountType.LIABILITY, "parent": None},
    {
        "code": "2010",
        "name": "Credit Card Payables",
        "type": AccountType.LIABILITY,
        "parent": "2000",
    },
    {
        "code": "2020",
        "name": "Short-Term Borrowings",
        "type": AccountType.LIABILITY,
        "parent": "2000",
    },
    {
        "code": "2100",
        "name": "Long-Term Liabilities",
        "type": AccountType.LIABILITY,
        "parent": None,
    },
    {
        "code": "2110",
        "name": "Home Loan (Mortgage)",
        "type": AccountType.LIABILITY,
        "parent": "2100",
    },
    {
        "code": "2120",
        "name": "Vehicle / Auto Loan",
        "type": AccountType.LIABILITY,
        "parent": "2100",
    },
    {"code": "2130", "name": "Personal Loan", "type": AccountType.LIABILITY, "parent": "2100"},
    {"code": "2140", "name": "Education Loan", "type": AccountType.LIABILITY, "parent": "2100"},
    # EQUITY (3000s)
    {"code": "3000", "name": "Net Worth & Capital", "type": AccountType.EQUITY, "parent": None},
    {"code": "3010", "name": "Retained Wealth", "type": AccountType.EQUITY, "parent": "3000"},
    {
        "code": "3020",
        "name": "Opening Balance Equity",
        "type": AccountType.EQUITY,
        "parent": "3000",
    },
    {
        "code": "3030",
        "name": "Unrealized Value Reserve",
        "type": AccountType.EQUITY,
        "parent": "3000",
    },
    # INCOME (4000s)
    {"code": "4000", "name": "Active Income", "type": AccountType.INCOME, "parent": None},
    {"code": "4010", "name": "Salary & Compensation", "type": AccountType.INCOME, "parent": "4000"},
    {
        "code": "4020",
        "name": "Professional & Consulting Fees",
        "type": AccountType.INCOME,
        "parent": "4000",
    },
    {"code": "4100", "name": "Investment Income", "type": AccountType.INCOME, "parent": None},
    {"code": "4110", "name": "Dividend Income", "type": AccountType.INCOME, "parent": "4100"},
    {"code": "4120", "name": "Interest Income", "type": AccountType.INCOME, "parent": "4100"},
    {
        "code": "4130",
        "name": "Realized Capital Gains",
        "type": AccountType.INCOME,
        "parent": "4100",
    },
    {"code": "4200", "name": "Other Income", "type": AccountType.INCOME, "parent": None},
    {"code": "4210", "name": "Gifts & Inheritances", "type": AccountType.INCOME, "parent": "4200"},
    {
        "code": "4220",
        "name": "Foreign Exchange Gain (Realized)",
        "type": AccountType.INCOME,
        "parent": "4200",
    },
    # EXPENSES (5000s)
    {"code": "5000", "name": "Living Expenses", "type": AccountType.EXPENSE, "parent": None},
    {"code": "5010", "name": "Housing & Rent", "type": AccountType.EXPENSE, "parent": "5000"},
    {
        "code": "5020",
        "name": "Groceries & Household",
        "type": AccountType.EXPENSE,
        "parent": "5000",
    },
    {
        "code": "5030",
        "name": "Utilities & Connectivity",
        "type": AccountType.EXPENSE,
        "parent": "5000",
    },
    {"code": "5040", "name": "Healthcare & Medical", "type": AccountType.EXPENSE, "parent": "5000"},
    {"code": "5050", "name": "Insurance Premiums", "type": AccountType.EXPENSE, "parent": "5000"},
    {
        "code": "5100",
        "name": "Discretionary Lifestyle",
        "type": AccountType.EXPENSE,
        "parent": None,
    },
    {
        "code": "5110",
        "name": "Dining & Entertainment",
        "type": AccountType.EXPENSE,
        "parent": "5100",
    },
    {"code": "5120", "name": "Travel & Holidays", "type": AccountType.EXPENSE, "parent": "5100"},
    {"code": "5130", "name": "Shopping & Gadgets", "type": AccountType.EXPENSE, "parent": "5100"},
    {
        "code": "5200",
        "name": "Financial Expenses & Taxes",
        "type": AccountType.EXPENSE,
        "parent": None,
    },
    {
        "code": "5210",
        "name": "Loan Interest Expense",
        "type": AccountType.EXPENSE,
        "parent": "5200",
    },
    {
        "code": "5220",
        "name": "Credit Card & Bank Charges",
        "type": AccountType.EXPENSE,
        "parent": "5200",
    },
    {
        "code": "5230",
        "name": "Income Tax & Surcharges",
        "type": AccountType.EXPENSE,
        "parent": "5200",
    },
    {
        "code": "5240",
        "name": "Foreign Exchange Loss (Realized)",
        "type": AccountType.EXPENSE,
        "parent": "5200",
    },
    {
        "code": "5250",
        "name": "Investment & Brokerage Fees",
        "type": AccountType.EXPENSE,
        "parent": "5200",
    },
]


class ChartOfAccountsService:
    """Service orchestrating Chart of Accounts lifecycle and business constraints."""

    @staticmethod
    async def create_account(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        payload: CreateAccountRequest,
    ) -> Account:
        """Create a new account ensuring code uniqueness and hierarchy validity."""
        clean_code = payload.account_code.strip()
        existing = await AccountRepository.get_by_code(session, tenant_id, clean_code)
        if existing:
            raise ValueError(f"Account with code '{clean_code}' already exists in this tenant.")

        if payload.parent_account_id is not None:
            parent = await AccountRepository.get_by_id(
                session, payload.parent_account_id, tenant_id
            )
            if not parent:
                raise AccountNotFoundError(
                    f"Parent account '{payload.parent_account_id}' not found."
                )

        normal_bal = payload.normal_balance or get_default_normal_balance(payload.account_type)

        account = Account(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            account_code=clean_code,
            account_name=payload.account_name.strip(),
            description=payload.description.strip() if payload.description else None,
            account_type=payload.account_type.value,
            normal_balance=normal_bal.value,
            parent_account_id=payload.parent_account_id,
            currency_code=payload.currency_code,
            is_system_account=False,
            is_active=True,
            is_control_account=payload.is_control_account,
        )
        return await AccountRepository.create(session, account)

    @staticmethod
    async def update_account(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        account_id: uuid.UUID,
        payload: UpdateAccountRequest,
    ) -> Account:
        """Update mutable properties of an account with hierarchy cycle prevention."""
        account = await AccountRepository.get_by_id(session, account_id, tenant_id)
        if not account:
            raise AccountNotFoundError(f"Account '{account_id}' not found.")

        if payload.parent_account_id is not None:
            if payload.parent_account_id == account.id:
                raise InvalidAccountHierarchyError(
                    account_id=str(account.id),
                    parent_id=str(payload.parent_account_id),
                    message="An account cannot be its own parent.",
                )
            parent = await AccountRepository.get_by_id(
                session, payload.parent_account_id, tenant_id
            )
            if not parent:
                raise AccountNotFoundError(
                    f"Parent account '{payload.parent_account_id}' not found."
                )
            is_cycle = await AccountRepository.check_circular_reference(
                session, account.id, payload.parent_account_id
            )
            if is_cycle:
                raise InvalidAccountHierarchyError(
                    account_id=str(account.id),
                    parent_id=str(payload.parent_account_id),
                    message="Circular reference detected in account hierarchy.",
                )
            account.parent_account_id = payload.parent_account_id
        elif "parent_account_id" in payload.model_fields_set and payload.parent_account_id is None:
            account.parent_account_id = None

        if payload.account_name is not None:
            account.account_name = payload.account_name.strip()
        if payload.description is not None:
            account.description = payload.description.strip()
        if payload.is_active is not None:
            account.is_active = payload.is_active

        await session.flush()
        return account

    @staticmethod
    async def get_account(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        account_id: uuid.UUID,
    ) -> Account:
        """Fetch account ensuring tenant boundary."""
        account = await AccountRepository.get_by_id(session, account_id, tenant_id)
        if not account:
            raise AccountNotFoundError(f"Account '{account_id}' not found.")
        return account

    @staticmethod
    async def list_accounts(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        account_type: str | None = None,
        is_active: bool | None = None,
    ) -> list[Account]:
        """List tenant accounts."""
        return await AccountRepository.list_accounts(
            session=session,
            tenant_id=tenant_id,
            account_type=account_type,
            is_active=is_active,
        )

    @staticmethod
    async def seed_standard_chart_of_accounts(
        session: AsyncSession,
        tenant_id: uuid.UUID,
        currency_code: str = "INR",
    ) -> list[Account]:
        """Seed the standard personal wealth chart of accounts idempotently for a tenant."""
        code_to_id: dict[str, uuid.UUID] = {}
        created_accounts: list[Account] = []

        # First pass: map existing accounts
        existing_accounts = await AccountRepository.list_accounts(session, tenant_id)
        for act in existing_accounts:
            code_to_id[act.account_code] = act.id

        # Second pass: create parent accounts and root nodes
        for item in STANDARD_CHART_OF_ACCOUNTS_TEMPLATE:
            code = item["code"]
            if code in code_to_id:
                continue

            parent_code = item["parent"]
            parent_id = code_to_id.get(parent_code) if parent_code else None

            normal_bal = get_default_normal_balance(item["type"])
            account = Account(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                account_code=code,
                account_name=item["name"],
                description=f"Standard template account: {item['name']}",
                account_type=item["type"].value,
                normal_balance=normal_bal.value,
                parent_account_id=parent_id,
                currency_code=currency_code,
                is_system_account=True,
                is_active=True,
                is_control_account=False,
            )
            created = await AccountRepository.create(session, account)
            code_to_id[code] = created.id
            created_accounts.append(created)

        logger.info(
            f"Seeded {len(created_accounts)} standard accounts for tenant {tenant_id} (currency: {currency_code})"
        )
        return created_accounts
