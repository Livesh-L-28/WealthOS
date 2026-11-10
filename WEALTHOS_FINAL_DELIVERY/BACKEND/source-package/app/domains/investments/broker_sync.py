"""WealthOS Broker Portfolio Synchronization Engine.

Normalizes portfolio holdings synchronization from Indian brokers and RTAs:
- Upstox Developer API v2 (100% Free OAuth & Holdings API)
- Zerodha Kite Connect (Personal Tier 100% Free Holdings API)
- CAMS & KFintech eCAS (100% Free Mailback Statement Ingestion)
- Angel One SmartAPI (100% Free API)
"""

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any

import httpx

from app.core.logging import get_logger
from app.domains.investments.models import (
    FinancialInstrument,
    InvestmentHoldingLot,
    InvestmentTransaction,
)
from app.domains.investments.repository import InvestmentRepository

logger = get_logger("wealthos.investments.broker_sync")


class BrokerSyncError(Exception):
    """Raised when broker portfolio synchronization fails."""

    pass


class UpstoxBrokerAdapter:
    """Upstox Developer API v2 Adapter.
    
    Upstox v2 API is free of monthly subscription charges for Upstox account holders.
    Provides holdings retrieval, live portfolio valuation, and positions.
    """

    BASE_URL = "https://api.upstox.com/v2"

    @classmethod
    async def fetch_holdings(
        cls, access_token: str, http_client: httpx.AsyncClient | None = None
    ) -> list[dict[str, Any]]:
        """Fetch long-term portfolio holdings via Upstox v2 API."""
        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {access_token}",
        }
        client = http_client or httpx.AsyncClient(timeout=15.0)
        close_client = http_client is None
        try:
            resp = await client.get(f"{cls.BASE_URL}/portfolio/long-term-holdings", headers=headers)
            if resp.status_code == 200:
                body = resp.json()
                raw_holdings = body.get("data", [])
                normalized: list[dict[str, Any]] = []
                for item in raw_holdings:
                    normalized.append({
                        "symbol": item.get("trading_symbol") or item.get("tradingsymbol", ""),
                        "name": item.get("company_name", item.get("trading_symbol", "")),
                        "isin": item.get("isin"),
                        "quantity": Decimal(str(item.get("quantity", 0))),
                        "average_price": Decimal(str(item.get("average_price", 0))),
                        "current_price": Decimal(str(item.get("last_price", item.get("average_price", 0)))),
                        "exchange": item.get("exchange", "NSE"),
                        "instrument_type": "EQUITY",
                    })
                return normalized
            else:
                logger.warning(f"Upstox holdings API returned HTTP {resp.status_code}: {resp.text}")
                raise BrokerSyncError(f"Upstox API error: HTTP {resp.status_code}")
        except httpx.RequestError as exc:
            logger.error(f"Upstox network request error: {exc}")
            raise BrokerSyncError(f"Failed to connect to Upstox API: {exc}") from exc
        finally:
            if close_client:
                await client.aclose()


class ZerodhaKiteAdapter:
    """Zerodha Kite Connect Adapter.
    
    Kite Connect Personal Tier is free (₹0/mo) for order placement and portfolio holdings retrieval.
    Connect Tier is ₹500/mo (for live tick-by-tick websocket streaming & historical candles).
    """

    BASE_URL = "https://api.kite.trade"

    @classmethod
    async def fetch_holdings(
        cls, api_key: str, access_token: str, http_client: httpx.AsyncClient | None = None
    ) -> list[dict[str, Any]]:
        """Fetch portfolio holdings via Zerodha Kite Connect."""
        headers = {
            "X-Kite-Version": "3",
            "Authorization": f"token {api_key}:{access_token}",
        }
        client = http_client or httpx.AsyncClient(timeout=15.0)
        close_client = http_client is None
        try:
            resp = await client.get(f"{cls.BASE_URL}/portfolio/holdings", headers=headers)
            if resp.status_code == 200:
                body = resp.json()
                raw_holdings = body.get("data", [])
                normalized: list[dict[str, Any]] = []
                for item in raw_holdings:
                    normalized.append({
                        "symbol": item.get("tradingsymbol", ""),
                        "name": item.get("tradingsymbol", ""),
                        "isin": item.get("isin"),
                        "quantity": Decimal(str(item.get("quantity", 0))),
                        "average_price": Decimal(str(item.get("average_price", 0))),
                        "current_price": Decimal(str(item.get("last_price", item.get("average_price", 0)))),
                        "exchange": item.get("exchange", "NSE"),
                        "instrument_type": "EQUITY",
                    })
                return normalized
            else:
                logger.warning(f"Zerodha Kite API returned HTTP {resp.status_code}: {resp.text}")
                raise BrokerSyncError(f"Zerodha Kite API error: HTTP {resp.status_code}")
        except httpx.RequestError as exc:
            logger.error(f"Zerodha network request error: {exc}")
            raise BrokerSyncError(f"Failed to connect to Zerodha Kite API: {exc}") from exc
        finally:
            if close_client:
                await client.aclose()


class CasMutualFundAdapter:
    """CAMS & KFintech eCAS (Consolidated Account Statement) Adapter.
    
    100% Free regulatory mailback CAS parser. Does not require paid commercial API contracts.
    SEBI & AMFI deprecated direct third-party MFCentral B2B APIs in favor of Account Aggregator (AA)
    and free eCAS generation.
    """

    @classmethod
    def parse_cas_payload(cls, raw_data: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Normalize structured CAS mutual fund holdings into WealthOS instrument lots."""
        normalized: list[dict[str, Any]] = []
        for item in raw_data:
            scheme_name = item.get("scheme_name") or item.get("scheme", "Mutual Fund")
            isin = item.get("isin")
            units = Decimal(str(item.get("units") or item.get("quantity", 0)))
            nav = Decimal(str(item.get("nav") or item.get("current_nav", 0)))
            cost_nav = Decimal(str(item.get("cost_nav") or item.get("purchase_price", nav)))
            symbol = item.get("symbol") or isin or scheme_name[:20].upper().replace(" ", "_")

            if units > Decimal("0.0000"):
                normalized.append({
                    "symbol": symbol,
                    "name": scheme_name,
                    "isin": isin,
                    "quantity": units,
                    "average_price": cost_nav,
                    "current_price": nav,
                    "exchange": "BSE_MF",
                    "instrument_type": "MUTUAL_FUND",
                })
        return normalized


class BrokerPortfolioSyncService:
    """Orchestrates multi-broker synchronization into discrete FIFO acquisition lots."""

    def __init__(self, repo: InvestmentRepository) -> None:
        self.repo = repo

    async def sync_holdings(
        self,
        tenant_id: uuid.UUID,
        account_id: uuid.UUID,
        provider: str,
        holdings_data: list[dict[str, Any]],
        sync_date: date | None = None,
    ) -> dict[str, Any]:
        """Ingest normalized broker holdings and reconcile against holding lots."""
        effective_date = sync_date or date.today()
        instruments_synced = 0
        lots_created = 0
        total_market_value = Decimal("0.0000")
        details: list[dict[str, Any]] = []

        for h in holdings_data:
            symbol = h["symbol"].upper().strip()
            name = h.get("name") or symbol
            isin = h.get("isin")
            inst_type = h.get("instrument_type", "EQUITY")
            exchange = h.get("exchange", "NSE")
            qty = Decimal(str(h["quantity"])).quantize(Decimal("0.0001"))
            avg_price = Decimal(str(h["average_price"])).quantize(Decimal("0.0001"))
            curr_price = Decimal(str(h["current_price"])).quantize(Decimal("0.0001"))

            if qty <= Decimal("0.0000"):
                continue

            # 1. Securities Master Registration / Update
            inst = await self.repo.get_or_create_instrument(
                symbol=symbol,
                name=name,
                instrument_type=inst_type,
                exchange=exchange,
                currency="INR",
                current_price=curr_price,
                isin=isin,
            )
            instruments_synced += 1
            position_market_val = (qty * curr_price).quantize(Decimal("0.0001"))
            total_market_value += position_market_val

            # 2. Check existing holding lots for this instrument in this account
            existing_lots = await self.repo.list_holding_lots(
                tenant_id=tenant_id,
                account_id=account_id,
                instrument_id=inst.id,
                lot_status="OPEN",
            )
            total_existing_qty = sum((l.remaining_quantity for l in existing_lots), Decimal("0.0000"))

            # 3. If quantity increased or no lot exists, capitalize new discrete FIFO lot
            delta_qty = qty - total_existing_qty
            if delta_qty > Decimal("0.0000"):
                lot_cost = (delta_qty * avg_price).quantize(Decimal("0.0001"))
                lot = InvestmentHoldingLot(
                    tenant_id=tenant_id,
                    account_id=account_id,
                    instrument_id=inst.id,
                    purchase_date=effective_date,
                    quantity=delta_qty,
                    purchase_price=avg_price,
                    cost_basis=lot_cost,
                    remaining_quantity=delta_qty,
                    currency="INR",
                    lot_status="OPEN",
                )
                await self.repo.create_holding_lot(lot)
                lots_created += 1

                # Record audited Buy Transaction
                tx = InvestmentTransaction(
                    tenant_id=tenant_id,
                    account_id=account_id,
                    instrument_id=inst.id,
                    transaction_type="BUY",
                    trade_date=effective_date,
                    quantity=delta_qty,
                    unit_price=avg_price,
                    gross_amount=lot_cost,
                    fee_amount=Decimal("0.0000"),
                    tax_amount=Decimal("0.0000"),
                    net_amount=lot_cost,
                    currency="INR",
                    notes=f"Auto-synced from {provider}",
                )
                await self.repo.create_transaction(tx)

            details.append({
                "symbol": symbol,
                "isin": isin,
                "total_quantity": str(qty),
                "delta_quantity": str(delta_qty),
                "market_value": str(position_market_val),
            })

        return {
            "provider": provider.upper(),
            "status": "SUCCESS",
            "instruments_synced": instruments_synced,
            "lots_created": lots_created,
            "total_market_value": total_market_value,
            "synced_at": datetime.now(UTC),
            "details": details,
        }
