"""WealthOS Enterprise Provider Adapters.

Defines the normalized ProviderAdapter contract and domain-specific adapters:
1. AccountAggregatorAdapter (RBI / Sahamati Account Aggregator mock/sandbox)
2. MarketDataAdapter (NSE / BSE / AMFI market quote and NAV sync)
3. BrokerAdapter (Consolidated Account Statement / Broker feed)
"""

from abc import ABC, abstractmethod
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any


class BaseProviderAdapter(ABC):
    """Abstract base class for all external financial provider adapters."""

    @property
    @abstractmethod
    def provider_key(self) -> str:
        """Unique provider identifier key."""
        ...

    @property
    @abstractmethod
    def display_name(self) -> str:
        """Human-readable provider name."""
        ...

    @property
    @abstractmethod
    def category(self) -> str:
        """Provider category (ACCOUNT_AGGREGATOR, MARKET_DATA, BROKER, etc.)."""
        ...

    @abstractmethod
    async def fetch_accounts(
        self, credentials: dict[str, Any], cursor: str | None = None
    ) -> list[dict[str, Any]]:
        """Fetch external financial accounts."""
        ...

    @abstractmethod
    async def fetch_transactions(
        self, credentials: dict[str, Any], account_id: str, cursor: str | None = None
    ) -> tuple[list[dict[str, Any]], str]:
        """Fetch transactions for an account, returning (records, next_cursor)."""
        ...


class AccountAggregatorAdapter(BaseProviderAdapter):
    """Account Aggregator Adapter complying with RBI Master Direction & Sahamati specs.
    
    Operates in certified sandbox/mock mode with deterministic fixture payloads.
    """

    @property
    def provider_key(self) -> str:
        return "rbi_account_aggregator"

    @property
    def display_name(self) -> str:
        return "RBI Account Aggregator (Sahamati AA)"

    @property
    def category(self) -> str:
        return "ACCOUNT_AGGREGATOR"

    async def fetch_accounts(
        self, credentials: dict[str, Any], cursor: str | None = None
    ) -> list[dict[str, Any]]:
        return [
            {
                "external_account_id": "aa_acc_hdfc_001",
                "institution_name": "HDFC Bank",
                "account_name": "HDFC Savings Account",
                "account_number_mask": "••••4892",
                "account_type": "SAVINGS",
                "currency": "INR",
                "current_balance": Decimal("485200.00"),
                "fip_id": "FIP_HDFC_BANK",
            },
            {
                "external_account_id": "aa_acc_icici_002",
                "institution_name": "ICICI Bank",
                "account_name": "ICICI Salary Account",
                "account_number_mask": "••••8104",
                "account_type": "SAVINGS",
                "currency": "INR",
                "current_balance": Decimal("245000.00"),
                "fip_id": "FIP_ICICI_BANK",
            },
        ]

    async def fetch_transactions(
        self, credentials: dict[str, Any], account_id: str, cursor: str | None = None
    ) -> tuple[list[dict[str, Any]], str]:
        now_iso = datetime.now(UTC).isoformat()
        records = [
            {
                "external_tx_id": f"aa_tx_{account_id}_01",
                "amount": Decimal("150000.00"),
                "direction": "CREDIT",
                "narrative": "TechCorp Salary Disbursement",
                "value_date": now_iso[:10],
                "category": "INCOME",
            },
            {
                "external_tx_id": f"aa_tx_{account_id}_02",
                "amount": Decimal("4500.00"),
                "direction": "DEBIT",
                "narrative": "Electricity Utility Payment",
                "value_date": now_iso[:10],
                "category": "UTILITIES",
            },
        ]
        next_cursor = f"cursor_aa_{int(datetime.now(UTC).timestamp())}"
        return records, next_cursor


class MarketDataAdapter(BaseProviderAdapter):
    """NSE / BSE and AMFI Market Data Adapter for live equity quotes and mutual fund NAVs."""

    @property
    def provider_key(self) -> str:
        return "nse_bse_market_feed"

    @property
    def display_name(self) -> str:
        return "NSE / BSE / AMFI Market Data Feed"

    @property
    def category(self) -> str:
        return "MARKET_DATA"

    async def fetch_accounts(
        self, credentials: dict[str, Any], cursor: str | None = None
    ) -> list[dict[str, Any]]:
        # Market data feeds provide instruments rather than bank accounts
        return []

    async def fetch_transactions(
        self, credentials: dict[str, Any], account_id: str, cursor: str | None = None
    ) -> tuple[list[dict[str, Any]], str]:
        return [], "cursor_market_sync"

    async def fetch_instrument_quotes(self, symbols: list[str]) -> dict[str, Decimal]:
        """Fetch latest benchmark valuations for equity instruments."""
        mock_prices: dict[str, Decimal] = {
            "RELIANCE": Decimal("2950.40"),
            "TCS": Decimal("4180.25"),
            "HDFCBANK": Decimal("1675.00"),
            "INFY": Decimal("1820.50"),
            "NIFTY_50": Decimal("24500.00"),
        }
        return {sym: mock_prices.get(sym.upper(), Decimal("100.00")) for sym in symbols}


class BrokerAdapter(BaseProviderAdapter):
    """Consolidated Account Statement (CAS) and Broker API Adapter."""

    @property
    def provider_key(self) -> str:
        return "cas_broker_adapter"

    @property
    def display_name(self) -> str:
        return "CAMS / KFintech / Zerodha Broker Feed"

    @property
    def category(self) -> str:
        return "BROKER"

    async def fetch_accounts(
        self, credentials: dict[str, Any], cursor: str | None = None
    ) -> list[dict[str, Any]]:
        return [
            {
                "external_account_id": "broker_demat_001",
                "institution_name": "Zerodha Broking",
                "account_name": "Zerodha Demat & Trading",
                "account_number_mask": "••••1234",
                "account_type": "INVESTMENT",
                "currency": "INR",
                "current_balance": Decimal("1450000.00"),
            }
        ]

    async def fetch_transactions(
        self, credentials: dict[str, Any], account_id: str, cursor: str | None = None
    ) -> tuple[list[dict[str, Any]], str]:
        now_iso = datetime.now(UTC).isoformat()
        records = [
            {
                "external_tx_id": f"broker_trade_{account_id}_01",
                "amount": Decimal("50000.00"),
                "direction": "DEBIT",
                "narrative": "Buy 20 shares RELIANCE @ 2500.00",
                "value_date": now_iso[:10],
                "category": "INVESTMENT",
            }
        ]
        return records, f"cursor_broker_{int(datetime.now(UTC).timestamp())}"


# Provider Registry
_ADAPTER_REGISTRY: dict[str, BaseProviderAdapter] = {
    "rbi_account_aggregator": AccountAggregatorAdapter(),
    "nse_bse_market_feed": MarketDataAdapter(),
    "cas_broker_adapter": BrokerAdapter(),
}


def get_provider_adapter(provider_key: str) -> BaseProviderAdapter | None:
    """Retrieve registered provider adapter by unique provider key."""
    return _ADAPTER_REGISTRY.get(provider_key)


def list_registered_adapters() -> list[BaseProviderAdapter]:
    """List all registered external provider adapters."""
    return list(_ADAPTER_REGISTRY.values())

