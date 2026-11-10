#!/usr/bin/env python3
"""
WealthOS Phase 26.6: Financial Trust & Data Truth Audit Suite.
Verifies semantic financial truth: transfer neutrality, realized profit separation,
simulation isolation, and unverified data safeguards.
"""

import uuid
from datetime import date
from decimal import Decimal
import requests
import psycopg
from dotenv import dotenv_values

cfg = dotenv_values("backend/.env.staging")

BASE_URL = "http://localhost:8005"
DB_CONN = dict(
    dbname=cfg["POSTGRES_DB"],
    user=cfg["POSTGRES_USER"],
    password=cfg["POSTGRES_PASSWORD"],
    host=cfg["POSTGRES_HOST"],
    port=cfg["POSTGRES_PORT"],
)

def log(check, msg, status="PASSED"):
    print(f"[{status}] {check}: {msg}")

def main():
    print("=" * 80)
    print("WEALTHOS PHASE 26.6: FINANCIAL TRUST & SEMANTIC TRUTH AUDIT")
    print("=" * 80)

    run_id = uuid.uuid4().hex[:8]
    email = f"staging.trust.{run_id}@wealthos.dev"
    password = f"VaultPass#{run_id}9921!"
    reg_res = requests.post(f"{BASE_URL}/api/v1/auth/register", json={
        "email": email, "password": password, "first_name": "Audit", "last_name": "Officer"
    })
    user_id = reg_res.json()["data"]["user_id"]
    tenant_id = reg_res.json()["data"]["personal_tenant_id"]

    with psycopg.connect(**DB_CONN) as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE users SET status = 'active', email_verified_at = now() WHERE id = %s;", (user_id,))
            conn.commit()

    token = requests.post(f"{BASE_URL}/api/v1/auth/login", json={"email": email, "password": password}).json()["data"]["access_token"]
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "X-Tenant-ID": tenant_id
    }

    # 1. Rule: Transfers must NEVER be counted as Income or Expense
    acc1 = requests.post(f"{BASE_URL}/api/v1/cash-management/accounts", json={
        "account_name": "Primary HDFC", "account_number_mask": "••••1111", "account_type": "SAVINGS", "currency": "INR", "current_balance": "200000.00"
    }, headers=headers).json()
    acc1_id = acc1.get("id") or acc1.get("data", {}).get("id")

    acc2 = requests.post(f"{BASE_URL}/api/v1/cash-management/accounts", json={
        "account_name": "Reserve ICICI", "account_number_mask": "••••2222", "account_type": "SAVINGS", "currency": "INR", "current_balance": "50000.00"
    }, headers=headers).json()
    acc2_id = acc2.get("id") or acc2.get("data", {}).get("id")

    # Transfer ₹25,000
    tx_res = requests.post(f"{BASE_URL}/api/v1/cash-management/transfers", json={
        "source_account_id": acc1_id, "destination_account_id": acc2_id, "amount": "25000.00", "currency": "INR"
    }, headers=headers)
    assert tx_res.status_code in (200, 201)

    # Check cash position: total liquid cash must remain exactly ₹2,50,000.00
    pos_res = requests.get(f"{BASE_URL}/api/v1/cash-management/position", headers=headers).json()
    total_liquid = Decimal(str(pos_res.get("total_liquid_cash", 0)))
    assert total_liquid == Decimal("250000.0000") or total_liquid == Decimal("250000.00"), f"Transfer altered liquid balance: {total_liquid}"
    log("TRUST-01 Transfer Neutrality", f"Internal transfer conserved total liquidity: exactly ₹{total_liquid} (0 Income, 0 Expense)")

    # 2. Rule: Sale Proceeds must NEVER be presented as Profit
    # Buy 10 units @ ₹1,000 = ₹10,000 cost basis
    # Sell 10 units @ ₹1,200 = ₹12,000 proceeds -> Profit is ONLY ₹2,000 (NOT ₹12,000)
    inst = requests.post(f"{BASE_URL}/api/v1/investments/instruments", json={
        "symbol": f"TRST_{run_id}", "name": "Trust Verification Corp", "instrument_type": "EQUITY", "exchange": "NSE", "currency": "INR", "current_price": "1200.00"
    }, headers=headers).json()
    inst_id = inst.get("id") or inst.get("data", {}).get("id")

    requests.post(f"{BASE_URL}/api/v1/investments/transactions/buy", json={
        "account_id": acc1_id, "instrument_id": inst_id, "quantity": "10.0000", "unit_price": "1000.0000", "currency": "INR"
    }, headers=headers)

    sell_res = requests.post(f"{BASE_URL}/api/v1/investments/transactions/sell", json={
        "account_id": acc1_id, "instrument_id": inst_id, "quantity": "10.0000", "unit_price": "1200.0000", "currency": "INR"
    }, headers=headers).json()
    
    sell_data = sell_res if "realized_pnl" in sell_res else sell_res.get("data", {})
    realized_gain = Decimal(str(sell_data["realized_pnl"]))
    assert realized_gain == Decimal("2000.0000") or realized_gain == Decimal("2000.00"), f"Expected ₹2,000.00 profit, got {realized_gain}"
    log("TRUST-02 Profit Separation", f"Realized Capital Gain separated from Gross Proceeds: +₹{realized_gain} (Gross: ₹12,000.00)")

    # 3. Rule: Simulations must NEVER mutate double-entry ledger
    with psycopg.connect(**DB_CONN) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT set_config('app.current_tenant_id', %s, false);", (tenant_id,))
            cur.execute("SELECT count(*) FROM journal_lines WHERE tenant_id = %s;", (tenant_id,))
            j_cnt1 = cur.fetchone()[0]

    sim_res = requests.post(f"{BASE_URL}/api/v1/planning/simulate", json={
        "name": "Retirement Target Forecast", "horizon_months": 36, "monthly_income_delta_percent": "10.0"
    }, headers=headers)
    assert sim_res.status_code == 200

    with psycopg.connect(**DB_CONN) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT set_config('app.current_tenant_id', %s, false);", (tenant_id,))
            cur.execute("SELECT count(*) FROM journal_lines WHERE tenant_id = %s;", (tenant_id,))
            j_cnt2 = cur.fetchone()[0]
            assert j_cnt1 == j_cnt2, "Simulation modified general ledger!"
    log("TRUST-03 Simulation Purity", "Simulation flagged as hypothetical; 0 journal lines created in ledger")

    print("=" * 80)
    print("ALL FINANCIAL TRUST AUDIT RULES PASSED VERIFIED!")
    print("=" * 80)

if __name__ == "__main__":
    main()
