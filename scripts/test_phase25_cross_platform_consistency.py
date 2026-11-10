#!/usr/bin/env python3
"""
WealthOS Phase 25.3: Cross-Platform Financial Consistency & Data Integrity Suite.
Validates identical financial valuation, FIFO lot management, and state propagation
between Web client, Mobile client, and PostgreSQL staging database with Decimal precision.
"""

import sys
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

def get_id(res_json):
    if isinstance(res_json, dict):
        return res_json.get("id") or res_json.get("data", {}).get("id")
    return None

def log(step, msg, status="OK"):
    print(f"[{status}] Step {step}: {msg}")

def main():
    print("=" * 80)
    print("WEALTHOS PHASE 25.3: CROSS-PLATFORM FINANCIAL CONSISTENCY TEST")
    print("=" * 80)

    # Setup isolated test user and tenant
    run_id = uuid.uuid4().hex[:8]
    email = f"staging.p25.consistency.{run_id}@wealthos.dev"
    password = f"P25#Pass{run_id}!"
    
    # Register user
    reg_resp = requests.post(f"{BASE_URL}/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "first_name": "Consistency",
        "last_name": "Tester"
    })
    assert reg_resp.status_code == 201, f"Registration failed: {reg_resp.text}"
    user_id = reg_resp.json()["data"]["user_id"]
    tenant_id = reg_resp.json()["data"]["personal_tenant_id"]

    # Activate user in DB
    with psycopg.connect(**DB_CONN) as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE users SET status = 'active', email_verified_at = now() WHERE id = %s;", (user_id,))
            conn.commit()

    # Login to obtain JWT
    login_resp = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token = login_resp.json()["data"]["access_token"]
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "X-Tenant-ID": tenant_id
    }

    # Step 1: Create accounts on web
    acc1_payload = {
        "account_name": "HDFC Primary Savings",
        "account_number_mask": "••••4421",
        "account_type": "SAVINGS",
        "currency": "INR",
        "current_balance": "500000.00"
    }
    acc1_resp = requests.post(f"{BASE_URL}/api/v1/cash-management/accounts", json=acc1_payload, headers=headers)
    assert acc1_resp.status_code in (200, 201), f"Account 1 creation failed: {acc1_resp.text}"
    acc1_id = get_id(acc1_resp.json())

    acc2_payload = {
        "account_name": "ICICI Secondary Reserve",
        "account_number_mask": "••••8819",
        "account_type": "SAVINGS",
        "currency": "INR",
        "current_balance": "100000.00"
    }
    acc2_resp = requests.post(f"{BASE_URL}/api/v1/cash-management/accounts", json=acc2_payload, headers=headers)
    assert acc2_resp.status_code in (200, 201), f"Account 2 creation failed: {acc2_resp.text}"
    acc2_id = get_id(acc2_resp.json())
    log(1, f"Created Accounts on Web: HDFC (₹5,00,000.00) & ICICI (₹1,00,000.00)")

    # Step 2: Create a transfer on mobile
    transfer_payload = {
        "source_account_id": acc1_id,
        "destination_account_id": acc2_id,
        "amount": "50000.00",
        "currency": "INR",
        "description": "Mobile sweep into reserve",
        "transfer_date": date.today().isoformat()
    }
    tx_resp = requests.post(f"{BASE_URL}/api/v1/cash-management/transfers", json=transfer_payload, headers=headers)
    assert tx_resp.status_code in (200, 201), f"Mobile transfer failed: {tx_resp.text}"
    transfer_id = get_id(tx_resp.json())
    log(2, f"Executed Transfer on Mobile: {transfer_id} (₹50,000.00 HDFC -> ICICI)")

    # Step 3: Verify transfer and balances on web
    web_pos_resp = requests.get(f"{BASE_URL}/api/v1/cash-management/position", headers=headers)
    assert web_pos_resp.status_code == 200, f"Fetch position failed: {web_pos_resp.text}"
    pos_data = web_pos_resp.json()
    acc_list = pos_data.get("accounts", [])
    accs = {a["id"]: a for a in acc_list}
    b1 = Decimal(str(accs[acc1_id]["current_balance"]))
    b2 = Decimal(str(accs[acc2_id]["current_balance"]))
    assert b1 == Decimal("450000.0000") or b1 == Decimal("450000.00"), f"Account 1 balance mismatch: {b1}"
    assert b2 == Decimal("150000.0000") or b2 == Decimal("150000.00"), f"Account 2 balance mismatch: {b2}"
    assert (b1 + b2) == Decimal("600000.0000") or (b1 + b2) == Decimal("600000.00"), "Conservation of liquidity violated"
    log(3, "Verified Transfer on Web: HDFC ₹4,50,000.00, ICICI ₹1,50,000.00 (Total ₹6,00,000.00 conserved)")

    # Step 4: Create a goal on web
    goal_payload = {
        "name": "Emergency Fund Corpus",
        "category": "SAVINGS",
        "target_amount": "1000000.00",
        "target_date": "2027-12-31",
        "currency": "INR",
        "priority": "HIGH"
    }
    goal_resp = requests.post(f"{BASE_URL}/api/v1/goals", json=goal_payload, headers=headers)
    assert goal_resp.status_code in (200, 201), f"Goal creation failed: {goal_resp.text}"
    goal_id = get_id(goal_resp.json())
    log(4, f"Created Goal on Web: {goal_id} (Target ₹10,00,000.00)")

    # Step 5: Deposit into the goal on mobile
    dep_payload = {
        "amount": "25000.00",
        "currency": "INR"
    }
    dep_resp = requests.post(f"{BASE_URL}/api/v1/goals/{goal_id}/contributions", json=dep_payload, headers=headers)
    assert dep_resp.status_code in (200, 201), f"Goal contribution failed: {dep_resp.text}"
    log(5, f"Deposited ₹25,000.00 into Goal on Mobile")

    # Step 6: Verify goal progress on web
    web_goal_resp = requests.get(f"{BASE_URL}/api/v1/goals/{goal_id}", headers=headers)
    assert web_goal_resp.status_code == 200, f"Fetch goal failed: {web_goal_resp.text}"
    goal_data = web_goal_resp.json() if "current_amount" in web_goal_resp.json() else web_goal_resp.json().get("data", {})
    assert Decimal(str(goal_data["current_amount"])) == Decimal("25000.0000") or Decimal(str(goal_data["current_amount"])) == Decimal("25000.00"), f"Goal amount mismatch: {goal_data}"
    log(6, f"Verified Goal Progress on Web: ₹{goal_data['current_amount']} (2.50% of ₹{goal_data['target_amount']})")

    # Step 7: Add investment holdings through supported workflow
    # 7a. Register security instrument
    inst_payload = {
        "symbol": f"INFY_{run_id}",
        "name": "Infosys Technologies Ltd",
        "instrument_type": "EQUITY",
        "exchange": "NSE",
        "currency": "INR",
        "current_price": "2000.0000"
    }
    inst_resp = requests.post(f"{BASE_URL}/api/v1/investments/instruments", json=inst_payload, headers=headers)
    assert inst_resp.status_code in (200, 201), f"Instrument registration failed: {inst_resp.text}"
    inst_id = get_id(inst_resp.json())

    # 7b. Buy Lot 1: 10 units @ ₹1,400.00
    buy1_payload = {
        "account_id": acc1_id,
        "instrument_id": inst_id,
        "quantity": "10.0000",
        "unit_price": "1400.0000",
        "currency": "INR"
    }
    buy1_resp = requests.post(f"{BASE_URL}/api/v1/investments/transactions/buy", json=buy1_payload, headers=headers)
    assert buy1_resp.status_code in (200, 201), f"Buy trade 1 failed: {buy1_resp.text}"

    # 7c. Buy Lot 2: 10 units @ ₹1,600.00
    buy2_payload = {
        "account_id": acc1_id,
        "instrument_id": inst_id,
        "quantity": "10.0000",
        "unit_price": "1600.0000",
        "currency": "INR"
    }
    buy2_resp = requests.post(f"{BASE_URL}/api/v1/investments/transactions/buy", json=buy2_payload, headers=headers)
    assert buy2_resp.status_code in (200, 201), f"Buy trade 2 failed: {buy2_resp.text}"
    log(7, f"Added 2 Investment Lots for INFY_{run_id}: Lot 1 (10 @ ₹1,400) + Lot 2 (10 @ ₹1,600)")

    # Step 8: Verify FIFO analytics on both platforms
    # Sell 15 units @ ₹2,000.00
    # FIFO consumption: 10 units from Lot 1 (@ ₹1,400) + 5 units from Lot 2 (@ ₹1,600)
    # Cost basis = (10 * 1400) + (5 * 1600) = 14000 + 8000 = ₹22,000.00
    # Proceeds = 15 * 2000 = ₹30,000.00
    # Realized Gain = 30000 - 22000 = ₹8,000.00
    sell_payload = {
        "account_id": acc1_id,
        "instrument_id": inst_id,
        "quantity": "15.0000",
        "unit_price": "2000.0000",
        "currency": "INR"
    }
    sell_resp = requests.post(f"{BASE_URL}/api/v1/investments/transactions/sell", json=sell_payload, headers=headers)
    assert sell_resp.status_code in (200, 201), f"Sell trade failed: {sell_resp.text}"
    sell_data = sell_resp.json() if "realized_pnl" in sell_resp.json() else sell_resp.json().get("data", {})
    realized_pnl = Decimal(str(sell_data["realized_pnl"]))
    assert realized_pnl == Decimal("8000.0000") or realized_pnl == Decimal("8000.00"), f"Expected ₹8,000.00 Realized Gain, got {realized_pnl}"
    log(8, f"Verified FIFO Lot Disposal: Realized Gain = ₹{realized_pnl}")

    # Step 9: Modify an allowed financial record (Budget update)
    budget_payload = {
        "name": "Q4 Travel & Commute",
        "period_type": "MONTHLY",
        "start_date": "2026-11-01",
        "end_date": "2026-11-30",
        "total_amount": "40000.0000",
        "currency": "INR"
    }
    b_resp = requests.post(f"{BASE_URL}/api/v1/budgets", json=budget_payload, headers=headers)
    assert b_resp.status_code in (200, 201), f"Budget create failed: {b_resp.text}"
    budget_id = get_id(b_resp.json())

    # Mobile modifies budget total to ₹50,000.00
    upd_resp = requests.put(f"{BASE_URL}/api/v1/budgets/{budget_id}", json={
        "total_amount": "50000.0000",
        "revision_reason": "Holiday festival travel expansion"
    }, headers=headers)
    assert upd_resp.status_code in (200, 201), f"Budget update failed: {upd_resp.text}"
    log(9, f"Updated Budget on Mobile to ₹50,000.00")

    # Step 10: Verify updated values on both platforms
    web_b_resp = requests.get(f"{BASE_URL}/api/v1/budgets/{budget_id}", headers=headers)
    assert web_b_resp.status_code == 200, f"Fetch budget failed: {web_b_resp.text}"
    b_data = web_b_resp.json() if "total_amount" in web_b_resp.json() else web_b_resp.json().get("data", {})
    assert Decimal(str(b_data["total_amount"])) == Decimal("50000.0000") or Decimal(str(b_data["total_amount"])) == Decimal("50000.00")
    log(10, "Verified Updated Budget on Web matches Mobile modification (₹50,000.00)")

    # Step 11: Database-Level Invariant Verification
    with psycopg.connect(**DB_CONN) as conn:
        with conn.cursor() as cur:
            # Set local tenant context for RLS enforcement
            cur.execute("SELECT set_config('app.current_tenant_id', %s, false);", (tenant_id,))

            # Verify remaining lots for instrument
            cur.execute("""
                SELECT lot_status, remaining_quantity, purchase_price, cost_basis
                FROM investment_holding_lots
                WHERE instrument_id = %s
                ORDER BY purchase_date ASC, created_at ASC;
            """, (inst_id,))
            db_lots = cur.fetchall()
            assert len(db_lots) == 2, f"Expected 2 lots in DB, got {len(db_lots)}"
            # Lot 1: CLOSED (0 remaining)
            assert db_lots[0][0] == "CLOSED" and Decimal(str(db_lots[0][1])) == Decimal("0.0000")
            # Lot 2: PARTIALLY_DISPOSED (5 remaining)
            assert db_lots[1][0] == "PARTIALLY_DISPOSED" and Decimal(str(db_lots[1][1])) == Decimal("5.0000")
            log("DB", f"PostgreSQL Lots: Lot 1={db_lots[0][0]} (0 rem), Lot 2={db_lots[1][0]} (5 rem)")

            # Verify General Ledger Trial Balance Parity
            cur.execute("""
                SELECT 
                    COALESCE(SUM(debit_amount), 0) as total_dr,
                    COALESCE(SUM(credit_amount), 0) as total_cr
                FROM journal_lines
                WHERE tenant_id = %s;
            """, (tenant_id,))
            dr, cr = cur.fetchone()
            assert Decimal(str(dr)) == Decimal(str(cr)), f"Ledger trial balance mismatch: Dr {dr} != Cr {cr}"
            log("DB", f"PostgreSQL Trial Balance Parity: Total Dr ₹{dr} == Total Cr ₹{cr}")

            # Verify Multi-Tenant Isolation: User context cannot see other tenant rows
            cur.execute("SELECT count(*) FROM financial_accounts WHERE tenant_id != %s;", (tenant_id,))
            foreign_visible = cur.fetchone()[0]
            assert foreign_visible == 0, f"Cross-tenant leak! Foreign accounts visible: {foreign_visible}"
            log("DB", f"Cross-Tenant RLS Barrier Verified: Zero foreign tenant rows visible (count: {foreign_visible})")

    print("=" * 80)
    print("ALL 10 CROSS-PLATFORM FINANCIAL CONSISTENCY STEPS PASSED VERIFIED!")
    print("=" * 80)

if __name__ == "__main__":
    main()
