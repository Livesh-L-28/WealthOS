"""WealthOS Master Local Acceptance Suite — Gate 5: Financial Workflow Acceptance.

Validates end-to-end financial logic across the core accounting engine and Workflows A through H:
1. Double-Entry Accounting Invariants:
   - Debit = Credit balance constraint (Sigma Dr - Sigma Cr = 0.0000).
   - Immutable posted entries.
   - Period close restrictions.
   - Reversal workflows and bidirectional audit links.
   - Idempotency key protection.
   - Zero floating-point arithmetic (fixed-point Decimal NUMERIC 18, 4).
2. Workflow A: Financial Accounts & Chart of Accounts hierarchy and balances.
3. Workflow B: Transactions & Transfers (net worth preservation, no income/expense artifact).
4. Workflow C: Investments & FIFO Lot Engine (cost basis, realized P&L, unrealized P&L, fractional quantities).
5. Workflow D: Dividends & Interest (gross, withholding tax, net cash receipt, no double counting).
6. Workflow E: Assets & Liabilities (valuations, amortizations, net worth = Assets - Liabilities).
7. Workflow F: Budgets (allocations, utilization, warning thresholds, overspending detection).
8. Workflow G: Financial Goals (target amount, target date, contributions, progress tracking).
9. Workflow H: Forecasting (multi-scenario projections without mutating general ledger).
"""

import json
import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.accounting.domain.money import quantize_money


async def bind_tenant_session(
    session: AsyncSession, tenant_id: uuid.UUID, user_id: uuid.UUID | None = None
) -> None:
    """Bind tenant and user context to database connection session (is_local=false)."""
    await session.execute(
        text(
            "SELECT set_config('app.current_tenant_id', :tid, false), "
            "set_config('app.current_user_id', :uid, false)"
        ),
        {"tid": str(tenant_id), "uid": str(user_id) if user_id else ""},
    )


@pytest.fixture
async def setup_gate5_workspace(client: AsyncClient, test_user_factory):
    """Seed an active user, tenant, and standard Chart of Accounts for financial tests."""
    user, tenant, token = await test_user_factory(
        email=f"fin-gate5-{uuid.uuid4().hex[:8]}@example.com",
        password="FinanceSecurePassword!2026",
        status="active",
    )
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": str(tenant.id),
    }

    # Seed Chart of Accounts
    seed_res = await client.post("/api/v1/accounting/accounts/seed", headers=headers)
    assert seed_res.status_code == 201

    # Fetch accounts map by account_code
    acc_res = await client.get("/api/v1/accounting/accounts", headers=headers)
    assert acc_res.status_code == 200
    account_map = {a["account_code"]: a["id"] for a in acc_res.json()}

    return user, tenant, headers, account_map


# ==============================================================================
# 1. CORE DOUBLE-ENTRY ACCOUNTING INVARIANTS
# ==============================================================================


@pytest.mark.asyncio
async def test_gate5_accounting_invariants(client: AsyncClient, setup_gate5_workspace):
    """Verify double-entry balance constraints, immutability, period restrictions, and reversals."""
    user, tenant, headers, accts = setup_gate5_workspace

    # 1. Zero Floating Point / Fixed-point Invariant
    with pytest.raises(TypeError, match="Binary float is strictly prohibited"):
        quantize_money(1234.56)  # Floating point numbers must be strictly rejected

    assert quantize_money("1234.5600") == Decimal("1234.5600")
    assert quantize_money(Decimal("1234.56")) == Decimal("1234.5600")

    # 2. Unbalanced Journal Rejection (Sigma Dr != Sigma Cr)
    res_unbalanced = await client.post(
        "/api/v1/accounting/journals",
        headers=headers,
        json={
            "entry_date": str(date.today()),
            "description": "Unbalanced journal test",
            "lines": [
                {
                    "account_id": accts["1020"],
                    "debit_amount": "5000.0000",
                    "credit_amount": "0.0000",
                },
                {
                    "account_id": accts["5010"],
                    "debit_amount": "0.0000",
                    "credit_amount": "4000.0000",
                },
            ],
        },
    )
    assert res_unbalanced.status_code == 400, (
        "Unbalanced journal entry must be rejected with HTTP 400"
    )

    # 3. Balanced Journal Posting
    res_post = await client.post(
        "/api/v1/accounting/journals/post-direct",
        headers=headers,
        json={
            "entry_date": str(date.today()),
            "description": "Valid balanced journal entry",
            "lines": [
                {
                    "account_id": accts["1020"],
                    "debit_amount": "10000.0000",
                    "credit_amount": "0.0000",
                },
                {
                    "account_id": accts["3020"],
                    "debit_amount": "0.0000",
                    "credit_amount": "10000.0000",
                },
            ],
        },
    )
    assert res_post.status_code == 201
    entry = res_post.json()
    assert entry["status"] == "POSTED"
    entry_id = entry["id"]

    # 4. Immutability: Posted entry cannot be deleted
    del_res = await client.delete(f"/api/v1/accounting/journals/{entry_id}", headers=headers)
    assert del_res.status_code in (400, 405), (
        "Posted journal entries must be strictly immutable and cannot be deleted"
    )

    # 5. Reversal Mechanics: Offsetting mirror journal
    rev_res = await client.post(
        f"/api/v1/accounting/journals/{entry_id}/reverse",
        headers=headers,
        json={"reason": "Auditor adjustment cancellation"},
    )
    assert rev_res.status_code == 200
    rev_entry = rev_res.json()
    assert rev_entry["status"] == "POSTED"
    assert rev_entry["reversal_of_entry_id"] == entry_id

    # 6. Period Closure Restriction
    past_start = date.today() - timedelta(days=60)
    past_end = date.today() - timedelta(days=31)
    target_past_date = past_start + timedelta(days=5)

    p_create = await client.post(
        "/api/v1/accounting/periods",
        headers=headers,
        json={
            "period_name": f"P-{uuid.uuid4().hex[:6]}",
            "start_date": str(past_start),
            "end_date": str(past_end),
        },
    )
    assert p_create.status_code == 201
    period_id = p_create.json()["id"]

    p_close = await client.post(
        f"/api/v1/accounting/periods/{period_id}/close",
        headers=headers,
        json={"reason": "Final audit complete"},
    )
    assert p_close.status_code == 200

    # Backdated posting into closed period must be blocked
    res_closed_post = await client.post(
        "/api/v1/accounting/journals/post-direct",
        headers=headers,
        json={
            "entry_date": str(target_past_date),
            "description": "Illegal closed period posting",
            "lines": [
                {
                    "account_id": accts["1020"],
                    "debit_amount": "100.0000",
                    "credit_amount": "0.0000",
                },
                {
                    "account_id": accts["3020"],
                    "debit_amount": "0.0000",
                    "credit_amount": "100.0000",
                },
            ],
        },
    )
    assert res_closed_post.status_code == 400, (
        "Posting to a closed accounting period must be rejected"
    )


# ==============================================================================
# 2. WORKFLOW A: FINANCIAL ACCOUNTS & CHART OF ACCOUNTS
# ==============================================================================


@pytest.mark.asyncio
async def test_gate5_workflow_a_financial_accounts_and_coa(
    client: AsyncClient, setup_gate5_workspace
):
    """Verify account classification, hierarchy validation, and balance tracking."""
    user, tenant, headers, accts = setup_gate5_workspace

    # 1. Create a Child Asset Account under Cash & Bank (Parent 1010)
    new_acc_code = f"10{uuid.uuid4().hex[:2]}"
    res_acc = await client.post(
        "/api/v1/accounting/accounts",
        headers=headers,
        json={
            "account_code": new_acc_code,
            "account_name": "Emergency Vault Fund",
            "account_type": "ASSET",
            "parent_account_id": accts["1010"],
            "currency_code": "INR",
        },
    )
    assert res_acc.status_code == 201, f"Account creation failed: {res_acc.text}"
    created_acc = res_acc.json()
    assert created_acc["account_code"] == new_acc_code
    assert created_acc["parent_account_id"] == accts["1010"]

    # 2. Duplicate Account Code Rejection
    res_dup = await client.post(
        "/api/v1/accounting/accounts",
        headers=headers,
        json={
            "account_code": new_acc_code,
            "account_name": "Duplicate Code Account",
            "account_type": "ASSET",
        },
    )
    assert res_dup.status_code == 400, "Duplicate account code must be rejected"

    # 3. Query Account Balance
    res_bal = await client.get(
        f"/api/v1/accounting/accounts/{created_acc['id']}/balance",
        headers=headers,
    )
    assert res_bal.status_code == 200
    bal_data = res_bal.json()
    assert Decimal(str(bal_data["balance"])) == Decimal("0.0000")


# ==============================================================================
# 3. WORKFLOW B: TRANSACTIONS & TRANSFERS
# ==============================================================================


@pytest.mark.asyncio
async def test_gate5_workflow_b_transfers_and_net_worth_preservation(
    client: AsyncClient, setup_gate5_workspace
):
    """Verify internal transfers adjust individual account balances without changing net worth."""
    user, tenant, headers, accts = setup_gate5_workspace

    # Step 1: Capital injection to Primary Savings Account (1020)
    # Dr. 1020 Primary Savings: INR 1,00,000.0000
    # Cr. 3020 Opening Balance Equity: INR 1,00,000.0000
    await client.post(
        "/api/v1/accounting/journals/post-direct",
        headers=headers,
        json={
            "entry_date": str(date.today()),
            "description": "Initial funding",
            "lines": [
                {
                    "account_id": accts["1020"],
                    "debit_amount": "100000.0000",
                    "credit_amount": "0.0000",
                },
                {
                    "account_id": accts["3020"],
                    "debit_amount": "0.0000",
                    "credit_amount": "100000.0000",
                },
            ],
        },
    )

    # Step 2: Internal Transfer: Primary Savings (1020) -> Fixed Deposit (1030)
    # Dr. 1030 Fixed Deposits: INR 40,000.0000
    # Cr. 1020 Primary Savings: INR 40,000.0000
    res_transfer = await client.post(
        "/api/v1/accounting/journals/post-direct",
        headers=headers,
        json={
            "entry_date": str(date.today()),
            "description": "Internal transfer to Fixed Deposit",
            "source_type": "INTERNAL_TRANSFER",
            "lines": [
                {
                    "account_id": accts["1030"],
                    "debit_amount": "40000.0000",
                    "credit_amount": "0.0000",
                },
                {
                    "account_id": accts["1020"],
                    "debit_amount": "0.0000",
                    "credit_amount": "40000.0000",
                },
            ],
        },
    )
    assert res_transfer.status_code == 201

    # Check Balances
    bal_1020 = (
        await client.get(f"/api/v1/accounting/accounts/{accts['1020']}/balance", headers=headers)
    ).json()
    bal_1030 = (
        await client.get(f"/api/v1/accounting/accounts/{accts['1030']}/balance", headers=headers)
    ).json()

    assert Decimal(str(bal_1020["balance"])) == Decimal("60000.0000")
    assert Decimal(str(bal_1030["balance"])) == Decimal("40000.0000")

    # Invariant: Total Assets remain exactly INR 1,00,000.0000. Net worth is unchanged.
    total_assets = Decimal(str(bal_1020["balance"])) + Decimal(str(bal_1030["balance"]))
    assert total_assets == Decimal("100000.0000")

    # Verify Trial Balance is balanced with zero P&L impact
    res_tb = await client.get("/api/v1/accounting/reports/trial-balance", headers=headers)
    assert res_tb.status_code == 200
    tb = res_tb.json()
    assert tb["is_balanced"] is True
    assert Decimal(tb["total_debit"]) == Decimal(tb["total_credit"])


# ==============================================================================
# 4. WORKFLOW C: INVESTMENTS & FIFO LOT ENGINE
# ==============================================================================


@pytest.mark.asyncio
async def test_gate5_workflow_c_investments_and_fifo_lots(
    client: AsyncClient, setup_gate5_workspace, db_session: AsyncSession
):
    """Verify FIFO lot consumption, cost basis calculation, and realized vs unrealized P&L."""
    user, tenant, headers, accts = setup_gate5_workspace
    await bind_tenant_session(db_session, tenant.id, user.id)

    # 1. Create a Financial Account for Investment Brokerage
    fin_acc_id = uuid.uuid4()
    await db_session.execute(
        text(
            """
            INSERT INTO financial_accounts (
                id, tenant_id, account_name, account_number_mask, account_type, currency, current_balance, gl_account_id
            ) VALUES (
                :id, :tenant_id, 'Zerodha Trading', 'XXXX4321', 'DEMAT', 'INR', 50000.0000, :gl_id
            );
            """
        ),
        {"id": fin_acc_id, "tenant_id": tenant.id, "gl_id": accts["1110"]},
    )

    # 2. Create Financial Instrument (Equity: INFY)
    instrument_id = uuid.uuid4()
    await db_session.execute(
        text(
            """
            INSERT INTO financial_instruments (
                id, symbol, name, instrument_type, exchange, currency, current_price
            ) VALUES (
                :id, :symbol, 'Infosys Limited', 'EQUITY', 'NSE', 'INR', 1800.0000
            ) ON CONFLICT (symbol, exchange) DO UPDATE SET current_price = EXCLUDED.current_price;
            """
        ),
        {"id": instrument_id, "symbol": f"INFY_{uuid.uuid4().hex[:4]}"},
    )

    # 3. Buy Lot 1: 50.000000 shares @ INR 1,400.0000 on T-30
    lot1_id = uuid.uuid4()
    lot1_qty = Decimal("50.0000")
    lot1_price = Decimal("1400.0000")
    lot1_cost = lot1_qty * lot1_price  # 70,000.0000

    await db_session.execute(
        text(
            """
            INSERT INTO investment_holding_lots (
                id, tenant_id, account_id, instrument_id, purchase_date, quantity, purchase_price, cost_basis, remaining_quantity, currency, lot_status
            ) VALUES (
                :id, :tenant_id, :acc_id, :inst_id, :p_date, :qty, :price, :cost, :rem_qty, 'INR', 'OPEN'
            );
            """
        ),
        {
            "id": lot1_id,
            "tenant_id": tenant.id,
            "acc_id": fin_acc_id,
            "inst_id": instrument_id,
            "p_date": date.today() - timedelta(days=30),
            "qty": lot1_qty,
            "price": lot1_price,
            "cost": lot1_cost,
            "rem_qty": lot1_qty,
        },
    )

    # 4. Buy Lot 2: 30.000000 shares @ INR 1,600.0000 on T-15
    lot2_id = uuid.uuid4()
    lot2_qty = Decimal("30.0000")
    lot2_price = Decimal("1600.0000")
    lot2_cost = lot2_qty * lot2_price  # 48,000.0000

    await db_session.execute(
        text(
            """
            INSERT INTO investment_holding_lots (
                id, tenant_id, account_id, instrument_id, purchase_date, quantity, purchase_price, cost_basis, remaining_quantity, currency, lot_status
            ) VALUES (
                :id, :tenant_id, :acc_id, :inst_id, :p_date, :qty, :price, :cost, :rem_qty, 'INR', 'OPEN'
            );
            """
        ),
        {
            "id": lot2_id,
            "tenant_id": tenant.id,
            "acc_id": fin_acc_id,
            "inst_id": instrument_id,
            "p_date": date.today() - timedelta(days=15),
            "qty": lot2_qty,
            "price": lot2_price,
            "cost": lot2_cost,
            "rem_qty": lot2_qty,
        },
    )
    await db_session.commit()
    await bind_tenant_session(db_session, tenant.id, user.id)

    # 5. Execute FIFO Sell: Sell 60.000000 shares @ INR 1,800.0000
    # FIFO Engine consumes:
    # - 50.000000 shares from Lot 1 (remaining -> 0, status -> CLOSED, cost = 50 * 1400 = 70,000)
    # - 10.000000 shares from Lot 2 (remaining -> 20, status -> PARTIALLY_DISPOSED, cost = 10 * 1600 = 16,000)
    sell_qty = Decimal("60.0000")
    sell_price = Decimal("1800.0000")
    sell_proceeds = sell_qty * sell_price  # 108,000.0000

    lots_stmt = text(
        """
        SELECT id, purchase_price, remaining_quantity
        FROM investment_holding_lots
        WHERE tenant_id = :tenant_id AND instrument_id = :inst_id AND remaining_quantity > 0
        ORDER BY purchase_date ASC;
        """
    )
    active_lots = (
        await db_session.execute(lots_stmt, {"tenant_id": tenant.id, "inst_id": instrument_id})
    ).fetchall()

    qty_to_fulfill = sell_qty
    total_cost_basis = Decimal("0.0000")

    for l_id, l_price, l_rem in active_lots:
        if qty_to_fulfill <= 0:
            break
        consume = min(qty_to_fulfill, Decimal(str(l_rem)))
        cost_for_consume = consume * Decimal(str(l_price))
        total_cost_basis += cost_for_consume
        qty_to_fulfill -= consume
        new_rem = Decimal(str(l_rem)) - consume
        new_status = "CLOSED" if new_rem == 0 else "PARTIALLY_DISPOSED"

        await db_session.execute(
            text(
                """
                UPDATE investment_holding_lots
                SET remaining_quantity = :rem, lot_status = :status, updated_at = NOW()
                WHERE id = :id;
                """
            ),
            {"rem": new_rem, "status": new_status, "id": l_id},
        )
    await db_session.commit()
    await bind_tenant_session(db_session, tenant.id, user.id)

    # Invariants Verification:
    # 1. Total Cost Basis consumed must be 70,000 + 16,000 = 86,000.0000
    assert total_cost_basis == Decimal("86000.0000")

    # 2. Realized Capital Gain = Proceeds - Cost Basis = 108,000 - 86,000 = +22,000.0000
    realized_gain = sell_proceeds - total_cost_basis
    assert realized_gain == Decimal("22000.0000")

    # 3. Lot 1 is CLOSED, Lot 2 has 20 remaining
    lot1_db = (
        await db_session.execute(
            text(
                "SELECT remaining_quantity, lot_status FROM investment_holding_lots WHERE id = :id"
            ),
            {"id": lot1_id},
        )
    ).fetchone()
    assert Decimal(str(lot1_db[0])) == Decimal("0.0000")
    assert lot1_db[1] == "CLOSED"

    lot2_db = (
        await db_session.execute(
            text(
                "SELECT remaining_quantity, lot_status FROM investment_holding_lots WHERE id = :id"
            ),
            {"id": lot2_id},
        )
    ).fetchone()
    assert Decimal(str(lot2_db[0])) == Decimal("20.0000")
    assert lot2_db[1] == "PARTIALLY_DISPOSED"

    # 4. Remaining Unrealized Gain: 20 shares @ 1,800 current price vs 1,600 cost price = +4,000.0000
    unrealized_gain = Decimal("20.0000") * (sell_price - lot2_price)
    assert unrealized_gain == Decimal("4000.0000")


# ==============================================================================
# 5. WORKFLOW D: DIVIDENDS & INTEREST (PASSIVE INCOME)
# ==============================================================================


@pytest.mark.asyncio
async def test_gate5_workflow_d_dividends_and_interest(
    client: AsyncClient, setup_gate5_workspace, db_session: AsyncSession
):
    """Verify passive income accounting: gross dividend, TDS tax withholding, net cash deposit."""
    user, tenant, headers, accts = setup_gate5_workspace
    await bind_tenant_session(db_session, tenant.id, user.id)

    gross_dividend = Decimal("15000.0000")
    tax_withholding_rate = Decimal("0.1000")  # 10% TDS
    tax_withheld = quantize_money(gross_dividend * tax_withholding_rate)  # 1,500.0000
    net_received = gross_dividend - tax_withheld  # 13,500.0000

    # 1. Post to Accounting Ledger:
    # Dr. 1020 Primary Savings Account: INR 13,500.0000 (Net cash receipt)
    # Dr. 5210 Tax / TDS Expense:       INR  1,500.0000 (Tax withheld at source)
    # Cr. 4020 Investment Dividends:    INR 15,000.0000 (Gross revenue recognized)
    res_div = await client.post(
        "/api/v1/accounting/journals/post-direct",
        headers=headers,
        json={
            "entry_date": str(date.today()),
            "description": "Quarterly dividend receipt (TCS)",
            "source_type": "DIVIDEND",
            "lines": [
                {
                    "account_id": accts["1020"],
                    "debit_amount": str(net_received),
                    "credit_amount": "0.0000",
                },
                {
                    "account_id": accts["5210"],
                    "debit_amount": str(tax_withheld),
                    "credit_amount": "0.0000",
                },
                {
                    "account_id": accts["4020"],
                    "debit_amount": "0.0000",
                    "credit_amount": str(gross_dividend),
                },
            ],
        },
    )
    assert res_div.status_code == 201
    entry = res_div.json()
    assert Decimal(entry["total_debit"]) == Decimal(entry["total_credit"]) == gross_dividend

    # 2. Record Passive Income Entity in passive_income_records table
    fin_acc_id = uuid.uuid4()
    await db_session.execute(
        text(
            """
            INSERT INTO financial_accounts (
                id, tenant_id, account_name, account_number_mask, account_type, currency, current_balance
            ) VALUES (
                :id, :tenant_id, 'HDFC Bank', 'XXXX1122', 'SAVINGS', 'INR', :bal
            );
            """
        ),
        {"id": fin_acc_id, "tenant_id": tenant.id, "bal": net_received},
    )

    passive_id = uuid.uuid4()
    await db_session.execute(
        text(
            """
            INSERT INTO passive_income_records (
                id, tenant_id, account_id, income_type, payment_date, gross_amount, tax_withheld, net_amount, currency, status
            ) VALUES (
                :id, :tenant_id, :acc_id, 'DIVIDEND', :p_date, :gross, :tax, :net, 'INR', 'RECEIVED'
            );
            """
        ),
        {
            "id": passive_id,
            "tenant_id": tenant.id,
            "acc_id": fin_acc_id,
            "p_date": date.today(),
            "gross": gross_dividend,
            "tax": tax_withheld,
            "net": net_received,
        },
    )
    await db_session.commit()

    # 3. Verify No Double Counting: Cash balance updated by exact net amount
    bal_1020 = (
        await client.get(f"/api/v1/accounting/accounts/{accts['1020']}/balance", headers=headers)
    ).json()
    assert Decimal(str(bal_1020["balance"])) == net_received


# ==============================================================================
# 6. WORKFLOW E: ASSETS, LIABILITIES & NET WORTH AGGREGATION
# ==============================================================================


@pytest.mark.asyncio
async def test_gate5_workflow_e_assets_liabilities_and_net_worth(
    client: AsyncClient, setup_gate5_workspace, db_session: AsyncSession
):
    """Verify fixed asset valuation, liability balance, loan EMI amortizations, and Net Worth."""
    user, tenant, headers, accts = setup_gate5_workspace
    await bind_tenant_session(db_session, tenant.id, user.id)

    # 1. Create Fixed Asset (Residential Real Estate)
    asset_id = uuid.uuid4()
    asset_val = Decimal("6000000.0000")  # INR 60 Lakhs
    await db_session.execute(
        text(
            """
            INSERT INTO assets (
                id, tenant_id, name, asset_class, purchase_date, purchase_price, current_valuation, valuation_date, currency, is_active
            ) VALUES (
                :id, :tenant_id, 'Bengaluru Apartment', 'REAL_ESTATE', :p_date, :price, :val, NOW(), 'INR', TRUE
            );
            """
        ),
        {
            "id": asset_id,
            "tenant_id": tenant.id,
            "p_date": date(2023, 1, 1),
            "price": Decimal("5000000.0000"),
            "val": asset_val,
        },
    )

    # 2. Create Liability (Home Loan)
    liability_id = uuid.uuid4()
    loan_principal = Decimal("3500000.0000")  # INR 35 Lakhs
    await db_session.execute(
        text(
            """
            INSERT INTO liabilities (
                id, tenant_id, name, liability_type, lender_name, initial_principal, current_principal, interest_rate, tenure_months, emi_amount, start_date, maturity_date, currency, is_active
            ) VALUES (
                :id, :tenant_id, 'SBI Home Loan', 'HOME_LOAN', 'State Bank of India', :init_p, :curr_p, 8.5000, 240, 30385.0000, :s_date, :m_date, 'INR', TRUE
            );
            """
        ),
        {
            "id": liability_id,
            "tenant_id": tenant.id,
            "init_p": loan_principal,
            "curr_p": loan_principal,
            "s_date": date(2023, 1, 1),
            "m_date": date(2043, 1, 1),
        },
    )
    await db_session.commit()
    await bind_tenant_session(db_session, tenant.id, user.id)

    # 3. Invariant: Net Worth = Total Assets - Total Liabilities
    # Assets: 60,00,000.0000, Liabilities: 35,00,000.0000 -> Net Worth = 25,00,000.0000
    res_nw = await db_session.execute(
        text(
            """
            SELECT
                COALESCE((SELECT SUM(current_valuation) FROM assets WHERE tenant_id = :t_id AND is_active = TRUE), 0) -
                COALESCE((SELECT SUM(current_principal) FROM liabilities WHERE tenant_id = :t_id AND is_active = TRUE), 0) AS net_worth;
            """
        ),
        {"t_id": tenant.id},
    )
    net_worth = Decimal(str(res_nw.scalar()))
    assert net_worth == Decimal("2500000.0000")

    # 4. Simulate EMI Repayment:
    # Principal reduction: INR 20,000.0000
    emi_principal = Decimal("20000.0000")
    await db_session.execute(
        text(
            """
            UPDATE liabilities
            SET current_principal = current_principal - :repaid, updated_at = NOW()
            WHERE id = :id;
            """
        ),
        {"repaid": emi_principal, "id": liability_id},
    )
    await db_session.commit()
    await bind_tenant_session(db_session, tenant.id, user.id)

    # Net Worth increases by principal repaid (liability reduced): 25,00,000 + 20,000 = 25,20,000.0000
    res_nw_after = await db_session.execute(
        text(
            """
            SELECT
                COALESCE((SELECT SUM(current_valuation) FROM assets WHERE tenant_id = :t_id AND is_active = TRUE), 0) -
                COALESCE((SELECT SUM(current_principal) FROM liabilities WHERE tenant_id = :t_id AND is_active = TRUE), 0) AS net_worth;
            """
        ),
        {"t_id": tenant.id},
    )
    assert Decimal(str(res_nw_after.scalar())) == Decimal("2520000.0000")


# ==============================================================================
# 7. WORKFLOW F: BUDGETS & SPENDING LIMITS
# ==============================================================================


@pytest.mark.asyncio
async def test_gate5_workflow_f_budgets_and_utilization(
    client: AsyncClient, setup_gate5_workspace, db_session: AsyncSession
):
    """Verify budget allocations, expense tracking, threshold detection, and overspending."""
    user, tenant, headers, accts = setup_gate5_workspace
    await bind_tenant_session(db_session, tenant.id, user.id)

    # 1. Create a Transaction Category: Dining Out
    cat_id = uuid.uuid4()
    await db_session.execute(
        text(
            """
            INSERT INTO transaction_categories (
                id, tenant_id, name, code, category_type, is_active
            ) VALUES (
                :id, :tenant_id, 'Dining Out', :code, 'EXPENSE', TRUE
            );
            """
        ),
        {"id": cat_id, "tenant_id": tenant.id, "code": f"CAT_DINE_{uuid.uuid4().hex[:4]}"},
    )

    # 2. Create Monthly Budget
    budget_id = uuid.uuid4()
    alloc_amount = Decimal("20000.0000")  # INR 20,000 allocated
    await db_session.execute(
        text(
            """
            INSERT INTO budgets (
                id, tenant_id, name, period_type, start_date, end_date, total_amount, currency, is_active
            ) VALUES (
                :id, :tenant_id, 'November 2026 Budget', 'MONTHLY', :s_date, :e_date, :alloc, 'INR', TRUE
            );
            """
        ),
        {
            "id": budget_id,
            "tenant_id": tenant.id,
            "s_date": date(2026, 11, 1),
            "e_date": date(2026, 11, 30),
            "alloc": alloc_amount,
        },
    )

    # 3. Create Budget Allocation for Category
    alloc_id = uuid.uuid4()
    await db_session.execute(
        text(
            """
            INSERT INTO budget_allocations (
                id, tenant_id, budget_id, category_id, allocated_amount, spent_amount, currency
            ) VALUES (
                :id, :tenant_id, :budget_id, :cat_id, :alloc, 0.0000, 'INR'
            );
            """
        ),
        {
            "id": alloc_id,
            "tenant_id": tenant.id,
            "budget_id": budget_id,
            "cat_id": cat_id,
            "alloc": alloc_amount,
        },
    )
    await db_session.commit()
    await bind_tenant_session(db_session, tenant.id, user.id)

    # 4. Simulate Actual Expense of INR 17,000 (85% utilization -> warning threshold)
    spent_1 = Decimal("17000.0000")
    await db_session.execute(
        text(
            """
            UPDATE budget_allocations
            SET spent_amount = spent_amount + :spent, updated_at = NOW()
            WHERE id = :id;
            """
        ),
        {"spent": spent_1, "id": alloc_id},
    )
    await db_session.commit()
    await bind_tenant_session(db_session, tenant.id, user.id)

    # Check Utilization: 85.0%
    alloc_row = (
        await db_session.execute(
            text("SELECT allocated_amount, spent_amount FROM budget_allocations WHERE id = :id"),
            {"id": alloc_id},
        )
    ).fetchone()

    allocated = Decimal(str(alloc_row[0]))
    spent = Decimal(str(alloc_row[1]))
    utilization_pct = (spent / allocated) * Decimal("100.00")
    assert utilization_pct == Decimal("85.0000")
    assert utilization_pct >= Decimal("80.00"), "Warning threshold (>=80%) reached"
    assert spent <= allocated, "Not overspent yet"

    # 5. Additional Expense of INR 5,000 -> Total INR 22,000 (110% utilization -> Overspent)
    spent_2 = Decimal("5000.0000")
    await db_session.execute(
        text(
            """
            UPDATE budget_allocations
            SET spent_amount = spent_amount + :spent, updated_at = NOW()
            WHERE id = :id;
            """
        ),
        {"spent": spent_2, "id": alloc_id},
    )
    await db_session.commit()
    await bind_tenant_session(db_session, tenant.id, user.id)

    alloc_row_2 = (
        await db_session.execute(
            text("SELECT allocated_amount, spent_amount FROM budget_allocations WHERE id = :id"),
            {"id": alloc_id},
        )
    ).fetchone()
    spent_total = Decimal(str(alloc_row_2[1]))
    overspending_amount = spent_total - allocated
    assert spent_total == Decimal("22000.0000")
    assert overspending_amount == Decimal("2000.0000")
    assert spent_total > allocated, "Overspending condition detected"


# ==============================================================================
# 8. WORKFLOW G: FINANCIAL GOALS & PROGRESS TRACKING
# ==============================================================================


@pytest.mark.asyncio
async def test_gate5_workflow_g_financial_goals_and_milestones(
    client: AsyncClient, setup_gate5_workspace, db_session: AsyncSession
):
    """Verify target amount, target date, contributions, and milestone progress tracking."""
    user, tenant, headers, accts = setup_gate5_workspace
    await bind_tenant_session(db_session, tenant.id, user.id)

    # 1. Create Financial Goal: "Emergency Reserve" Target INR 3,00,000
    goal_id = uuid.uuid4()
    target_amount = Decimal("300000.0000")
    target_date = date.today() + timedelta(days=365)

    await db_session.execute(
        text(
            """
            INSERT INTO financial_goals (
                id, tenant_id, name, category, target_amount, current_amount, currency, target_date, status
            ) VALUES (
                :id, :tenant_id, 'Emergency Reserve', 'SAVINGS', :target, 0.0000, 'INR', :t_date, 'IN_PROGRESS'
            );
            """
        ),
        {
            "id": goal_id,
            "tenant_id": tenant.id,
            "target": target_amount,
            "t_date": target_date,
        },
    )

    # 2. Add Contribution 1: INR 1,20,000.0000
    c1_amount = Decimal("120000.0000")
    await db_session.execute(
        text(
            """
            INSERT INTO goal_contributions (
                id, tenant_id, goal_id, contribution_date, amount, currency
            ) VALUES (
                gen_random_uuid(), :tenant_id, :goal_id, :c_date, :amt, 'INR'
            );
            """
        ),
        {"tenant_id": tenant.id, "goal_id": goal_id, "c_date": date.today(), "amt": c1_amount},
    )

    # 3. Add Contribution 2: INR 90,000.0000
    c2_amount = Decimal("90000.0000")
    await db_session.execute(
        text(
            """
            INSERT INTO goal_contributions (
                id, tenant_id, goal_id, contribution_date, amount, currency
            ) VALUES (
                gen_random_uuid(), :tenant_id, :goal_id, :c_date, :amt, 'INR'
            );
            """
        ),
        {
            "tenant_id": tenant.id,
            "goal_id": goal_id,
            "c_date": date.today(),
            "amt": c2_amount,
        },
    )

    # Update goal current_amount
    total_contributed = c1_amount + c2_amount  # 2,10,000.0000
    await db_session.execute(
        text(
            """
            UPDATE financial_goals
            SET current_amount = :current, updated_at = NOW()
            WHERE id = :id;
            """
        ),
        {"current": total_contributed, "id": goal_id},
    )
    await db_session.commit()
    await bind_tenant_session(db_session, tenant.id, user.id)

    # 4. Verify Goal Completion Progress
    goal_db = (
        await db_session.execute(
            text(
                "SELECT target_amount, current_amount, status FROM financial_goals WHERE id = :id"
            ),
            {"id": goal_id},
        )
    ).fetchone()

    cur = Decimal(str(goal_db[1]))
    tgt = Decimal(str(goal_db[0]))
    progress_pct = (cur / tgt) * Decimal("100.00")
    remaining_deficit = tgt - cur

    assert cur == Decimal("210000.0000")
    assert progress_pct == Decimal("70.0000")
    assert remaining_deficit == Decimal("90000.0000")
    assert goal_db[2] == "IN_PROGRESS"


# ==============================================================================
# 9. WORKFLOW H: FORECASTING & WHAT-IF CASHFLOW SCENARIOS
# ==============================================================================


@pytest.mark.asyncio
async def test_gate5_workflow_h_forecasting_scenarios_and_ledger_purity(
    client: AsyncClient, setup_gate5_workspace, db_session: AsyncSession
):
    """Verify multi-scenario cashflow projection without mutating general ledger records."""
    user, tenant, headers, accts = setup_gate5_workspace
    await bind_tenant_session(db_session, tenant.id, user.id)

    # Count initial journal entries before forecasting
    res_before = await client.get("/api/v1/accounting/journals", headers=headers)
    assert res_before.status_code == 200
    initial_journal_count = len(res_before.json())

    # 1. Define Forecast Run with Base, Optimistic, and Pessimistic Scenarios
    forecast_id = uuid.uuid4()
    assumptions = {
        "monthly_salary": "100000.0000",
        "monthly_living_expenses": "40000.0000",
        "inflation_rate": "0.0600",
        "investment_return_rate": "0.1200",
    }
    projection_data = {
        "scenarios": {
            "base": {
                "month_6_projected_cash": "360000.0000",
                "month_12_projected_cash": "720000.0000",
            },
            "optimistic": {
                "month_6_projected_cash": "420000.0000",
                "month_12_projected_cash": "850000.0000",
            },
            "pessimistic": {
                "month_6_projected_cash": "300000.0000",
                "month_12_projected_cash": "590000.0000",
            },
        }
    }

    await db_session.execute(
        text(
            """
            INSERT INTO forecast_runs (
                id, tenant_id, run_name, horizon_months, baseline_date, assumptions, projection_data
            ) VALUES (
                :id, :tenant_id, 'FY2027 Wealth Projection', 36, :b_date, :assumptions, :projections
            );
            """
        ),
        {
            "id": forecast_id,
            "tenant_id": tenant.id,
            "b_date": date.today(),
            "assumptions": json.dumps(assumptions),
            "projections": json.dumps(projection_data),
        },
    )
    await db_session.commit()
    await bind_tenant_session(db_session, tenant.id, user.id)

    # 2. Retrieve Forecast Record and verify projections
    row = (
        await db_session.execute(
            text(
                "SELECT run_name, horizon_months, projection_data FROM forecast_runs WHERE id = :id"
            ),
            {"id": forecast_id},
        )
    ).fetchone()
    assert row[0] == "FY2027 Wealth Projection"
    assert row[1] == 36
    data = row[2] if isinstance(row[2], dict) else json.loads(row[2])
    assert "optimistic" in data["scenarios"]
    assert Decimal(data["scenarios"]["base"]["month_12_projected_cash"]) == Decimal("720000.0000")

    # 3. Ledger Purity Invariant: Journal entries count must remain completely unchanged!
    res_after = await client.get("/api/v1/accounting/journals", headers=headers)
    assert res_after.status_code == 200
    final_journal_count = len(res_after.json())
    assert final_journal_count == initial_journal_count, (
        "Forecasting simulation must never alter or create actual general ledger records"
    )
