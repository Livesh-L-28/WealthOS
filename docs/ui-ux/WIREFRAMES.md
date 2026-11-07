# WEALTHOS — DETAILED SCREEN WIREFRAMES & STRUCTURAL LAYOUTS

**Document Reference:** WOS-UX-WIR-001  
**Version:** 1.0.0-RELEASE-CANDIDATE  
**Status:** APPROVED / FROZEN BASELINE  
**Classification:** Product Design Specification  

---

## 1. GLOBAL APP SHELL & NAVIGATION LAYOUT

```
+-----------------------------------------------------------------------------------------------------------------------------+
| WEALTHOS [LOGO]  | Workspace: [ Sharma Family Office (Owner) v ]  | [ Search accounts, trades, docs... Cmd+K ] | * Live | + | (3) | [Avatar]|
+------------------+---------------------------------------------------------------------------------------------+--------------------+
| CORE WEALTH      | BREADCRUMBS: Dashboard > Executive Wealth Summary                                                       Nov 07, 2026 |
| > Overview       +------------------------------------------------------------------------------------------------------------------+
|   Net Worth      |                                                                                                                  |
|   Copilot        |   [ MAIN APPLICATION CONTENT AREA ]                                                                              |
|                  |                                                                                                                  |
| BANKING          |                                                                                                                  |
|   Accounts       |                                                                                                                  |
|   Transactions   |                                                                                                                  |
|   Income         |                                                                                                                  |
|   Expenses       |                                                                                                                  |
|   Budgets        |                                                                                                                  |
|                  |                                                                                                                  |
| INVESTMENTS      |                                                                                                                  |
|   Holdings       |                                                                                                                  |
|   Trades & Lots  |                                                                                                                  |
|   Dividends      |                                                                                                                  |
|                  |                                                                                                                  |
| ASSETS & DEBT    |                                                                                                                  |
|   Real Assets    |                                                                                                                  |
|   Liabilities    |                                                                                                                  |
|                  |                                                                                                                  |
| VAULT            |                                                                                                                  |
|   Documents (2)  |                                                                                                                  |
|   Reconciliation |                                                                                                                  |
|                  |                                                                                                                  |
| [Settings] [MFA] |                                                                                                                  |
+------------------+------------------------------------------------------------------------------------------------------------------+
```

---

## 2. MASTER EXECUTIVE DASHBOARD (`/dashboard`)

```
+-----------------------------------------------------------------------------------------------------------------------------+
| TOTAL NET WORTH               | LIQUID CASH & BANK            | INVESTED CAPITAL              | TOTAL LIABILITIES & DEBT     |
| Rs 1,42,85,920.00             | Rs 14,50,000.00               | Rs 1,84,35,920.00             | -Rs 56,00,000.00             |
| ^ +Rs 4,20,500.00 (+3.03%)    | 10.15% of Net Worth           | Unrealized: +Rs 32.4L (+21%)  | Home Loan EMI: Rs 62,000/mo  |
| [~~~~~~~~~~~~~~~~~~~~~ Spark] | [ 3 Active Bank Accounts    ] | [ XIRR: 16.4% | Alpha: +3.2%] | [ Debt-to-Asset: 28.1%     ] |
+-------------------------------+-------------------------------+-------------------------------+------------------------------+
| NET WORTH TRAJECTORY (HISTORICAL)                             [ 1M | 3M | 6M | 1Y | 3Y | ALL ] | ASSET ALLOCATION            |
| Rs 1.5Cr +-----------------------------------------------------------------------------------+ | [ Equity: 48%             ] |
|          |                                                             /~~~~~\               | | [ Real Estate: 30%        ] |
| Rs 1.2Cr |                                           /~~~~~~~~~~~~~~~~~       \              | | [ Cash & FDs: 12%         ] |
|          |                 /~~~~~~~~~~~~~~~~~~~~~~~~~                                        | | [ Gold & SGB: 7%          ] |
| Rs 90L   |~~~~~~~~~~~~~~~~~                                                                  | | [ Alternative: 3%         ] |
|          +-----------------------------------------------------------------------------------+ |                             |
|            Nov 25      Feb 26        May 26        Aug 26        Nov 26                        | [ Donut Chart View        ] |
+---------------------------------------------------------------+-------------------------------+------------------------------+
| MONTHLY CASH FLOW (OCT 2026)                                  | RECENT TRANSACTIONS                    [ View All Ledger > ] |
| Income:   Rs 3,85,000.00 [==================================] | Nov 06 | HDFC Salary   | Salary Credit       | +Rs 2,69,800.00 |
| Expenses: Rs 1,42,300.00 [==============                    ] | Nov 05 | ICICI CC      | Star Health Ins.    |  -Rs 24,500.00 |
| Savings:  Rs 2,42,700.00 (Savings Rate: 63.04%)               | Nov 04 | Zerodha Demat | Infosys Dividend    |   +Rs 7,560.00 |
| Runway:   18.4 Months of Baseline Living Expenses             | Nov 02 | HDFC Bank     | Tata Power Utility  |   -Rs 4,120.00 |
+---------------------------------------------------------------+--------------------------------------------------------------+
| UPCOMING BILLS & EMIs (NEXT 14 DAYS)                          | PENDING DOCUMENT REVIEWS & INTEGRITY                         |
| Nov 10 (3 days)  | SBI Home Loan EMI        |  Rs 62,000.00   | [!] 2 Bank Statements Awaiting Human Approval                |
| Nov 15 (8 days)  | ICICI Credit Card Due    |  Rs 48,200.00   |     - HDFC_Oct_2026.pdf (42 Extracted Lines | 100% Math Match) |
| Nov 18 (11 days) | Airtel Broadband Fibre   |   Rs 1,414.00   |     - Zerodha_Contract_Nov.pdf (5 Trades | Ready for review) |
+---------------------------------------------------------------+--------------------------------------------------------------+
```

---

## 3. ACCOUNTS DIRECTORY & BALANCE OVERVIEW (`/accounts`)

```
+-----------------------------------------------------------------------------------------------------------------------------+
| ACCOUNTS & LIQUID BALANCES                                                          [ Transfer Funds ]  [ + Add New Account ]|
+-----------------------------------------------------------------------------------------------------------------------------+
| Filter: [ All Types v ] [ All Currencies v ] [ Active Accounts v ]                   Search: [ Find account by name...     ] |
+-----------------------------------------------------------------------------------------------------------------------------+
| SAVINGS & CURRENT ACCOUNTS                                                                                  Total: Rs 14,50,000.00  |
| +-------------------------------------------------------------------------------------------------------------------------+ |
| | HDFC Bank Salary Account    | Acct: **** 4892 | Currency: INR | Cleared: Rs 8,42,100.00 | Avail: Rs 8,42,100.00 | [•••] | |
| | ICICI Bank Wealth Account   | Acct: **** 1092 | Currency: INR | Cleared: Rs 5,82,900.00 | Avail: Rs 5,82,900.00 | [•••] | |
| | Cash On Hand (Physical)     | Safe Deposit Box| Currency: INR | Cleared:   Rs 25,000.00 | Avail:   Rs 25,000.00 | [•••] | |
| +-------------------------------------------------------------------------------------------------------------------------+ |
| CREDIT CARDS & REVOLVING FACILITIES                                                                        Total: -Rs 1,28,400.00 |
| +-------------------------------------------------------------------------------------------------------------------------+ |
| | ICICI Emeralde Credit Card  | Card: **** 8821 | Limit: Rs 10L | Outstanding: -Rs 82,400 | Due: Nov 15 (Rs 82,400) | [•••] | |
| | HDFC Regalia Gold           | Card: **** 3312 | Limit: Rs 6L  | Outstanding: -Rs 46,000 | Due: Nov 22 (Rs 46,000) | [•••] | |
| +-------------------------------------------------------------------------------------------------------------------------+ |
| BROKER CASH BALANCES (UNINVESTED)                                                                            Total: Rs 62,400.00   |
| +-------------------------------------------------------------------------------------------------------------------------+ |
| | Zerodha Kite Trading Ledger | Demat: 12081600 | Currency: INR | Unsettled: Rs 0.00      | Cleared Cash: Rs 62,400 | [•••] | |
+-----------------------------------------------------------------------------------------------------------------------------+
```

---

## 4. MASTER TRANSACTION REGISTER & SPLIT MANAGER (`/transactions`)

```
+-----------------------------------------------------------------------------------------------------------------------------+
| TRANSACTIONS REGISTER (DOUBLE-ENTRY GENERAL LEDGER)                         [ Export CSV ] [ Filter v ] [ + Add Transaction ]|
+-----------------------------------------------------------------------------------------------------------------------------+
| [ Search transactions, merchants, memos... Cmd+K ] | Date: [ Oct 01, 2026 - Nov 07, 2026 v ] | Account: [ All Accounts v ]  |
+-----------------------------------------------------------------------------------------------------------------------------+
| DATE        | ACCOUNT         | PAYEE / DESCRIPTION        | CATEGORY                 | STATUS     |      DEBIT |      CREDIT |
+-------------+-----------------+----------------------------+--------------------------+------------+------------+-------------+
| 06 Nov 2026 | HDFC Salary     | TechCorp India Pvt Ltd     | Income:Salary:Base Pay   | POSTED [*] |          - | 2,69,800.00 |
| 05 Nov 2026 | ICICI Emeralde  | Star Health Insurance      | Expense:Health:Insurance | POSTED [*] |  24,500.00 |           - |
| 04 Nov 2026 | Zerodha Demat   | Infosys Ltd (Dividend)     | Income:Dividends:Equities| RECONCILED |          - |    7,560.00 |
| 04 Nov 2026 | ICICI Emeralde  | Reliance Retail Superstore | [ SPLIT: 2 Categories v] | POSTED [*] |  12,800.00 |           - |
|             |                 |   -> Groceries & Household | Expense:Household        |            | (8,600.00) |           - |
|             |                 |   -> Business Supplies     | Expense:Business (80C)   |            | (4,200.00) |           - |
| 02 Nov 2026 | HDFC Salary     | Internal Transfer -> Zerod | Transfer:Internal        | POSTED [*] |  50,000.00 |           - |
| 02 Nov 2026 | Zerodha Demat   | Internal Transfer <- HDFC  | Transfer:Internal        | POSTED [*] |          - |   50,000.00 |
+-------------+-----------------+----------------------------+--------------------------+------------+------------+-------------+
| Showing 1 to 6 of 384 Transactions                                                Page: [ < ] [ 1 ] 2 3 4 5 [ > ] [ 50/page ]|
+-----------------------------------------------------------------------------------------------------------------------------+
```

---

## 5. SIDE-BY-SIDE DOCUMENT REVIEW & ARITHMETIC GATE (`/documents/[id]/review`)

```
+-----------------------------------------------------------------------------------------------------------------------------+
| REVIEW DOCUMENT: HDFC_Oct_2026.pdf (Statement Period: Oct 01 - Oct 31, 2026)      [ Reject Doc ]  [ Confirm & Post 42 Lines ]|
+-----------------------------------------------------------------------------------------------------------------------------+
| ARITHMETIC INTEGRITY: [ OK: ZERO DISCREPANCY ]                                                                               |
| Opening Balance: Rs 1,50,000.00 | Total Credits: +Rs 3,20,000.00 | Total Debits: -Rs 1,80,000.00 | Closing: Rs 2,90,000.00   |
+-------------------------------------------------------------+---------------------------------------------------------------+
| ORIGINAL STATEMENT VIEWER (Page 1 of 3) [ Zoom: 100% ]      | EXTRACTED TRANSACTION BATCH (42 Rows)                         |
| +---------------------------------------------------------+ | +-----------------------------------------------------------+ |
| | HDFC BANK LIMITED                                       | | | DATE        | DESCRIPTION           | CATEGORY       | AMOUNT   | |
| | Statement of Account: 501004892100                      | | +-------------+-----------------------+----------------+----------+ |
| | Customer: ADITYA SHARMA                                 | | | 01 Oct 2026 | SALARY TechCorp       | Salary [v]     |+2,69,800 | |
| |                                                         | | | 04 Oct 2026 | SWIGGY BANGALORE      | Food & Dining  |   -1,240 | |
| | [HIGHLIGHT BOX 1] 01/10/26 SALARY CR  2,69,800.00       | | | 08 Oct 2026 | UBER INDIA TRIPS      | Transportation |     -480 | |
| | [HIGHLIGHT BOX 2] 04/10/26 SWIGGY BLR     1,240.00      | | | 12 Oct 2026 | AMAZON SELLER RETAIL  | Shopping       |   -4,500 | |
| | [HIGHLIGHT BOX 3] 12/10/26 AMAZON RT      4,500.00      | | | 18 Oct 2026 | TATA POWER UTILITY    | Utilities [v]  |   -3,890 | |
| |                                                         | | | 24 Oct 2026 | NEFT RETURN (DUP!)    | [!] DUPLICATE? |  +10,000 | |
| |                                                         | | +-----------------------------------------------------------+ |
| |                                                         | | Action for Row 24: [ Skip Duplicate (Do not post) v ]       | |
| +---------------------------------------------------------+ | +-----------------------------------------------------------+ |
+-------------------------------------------------------------+---------------------------------------------------------------+
```

---

## 6. FIFO TAX LOTS INSPECTOR (`/investments/lots`)

```
+-----------------------------------------------------------------------------------------------------------------------------+
| FIFO COST-BASIS TAX LOTS: Infosys Ltd (INFY) | ISIN: INE009A01021                          [ + Record Buy ] [ - Record Sell ]|
+-----------------------------------------------------------------------------------------------------------------------------+
| Total Units Held: 300 | Average Cost Basis: Rs 1,480.00 | CMP: Rs 1,850.00 | Unrealized LTCG: +Rs 1,11,000.00 (+25.00%)      |
+-----------------------------------------------------------------------------------------------------------------------------+
| LOT ID    | ACQUIRED DATE | ORIGINAL UNITS | UNITS REMAINING | UNIT COST PRICE | TOTAL COST BASIS | HOLDING TERM | STATUS    |
+-----------+---------------+----------------+-----------------+-----------------+------------------+--------------+-----------+
| LOT-8491  | 14 Jan 2024   | 100.00000000   | 100.00000000    | Rs 1,400.0000   | Rs 1,40,000.00   | > 12M (LTCG) | OPEN      |
| LOT-9022  | 18 May 2024   | 100.00000000   | 100.00000000    | Rs 1,490.0000   | Rs 1,49,000.00   | > 12M (LTCG) | OPEN      |
| LOT-9941  | 02 Feb 2025   | 150.00000000   | 100.00000000    | Rs 1,550.0000   | Rs 1,55,000.00   | < 12M (STCG) | DEPLETED  |
|           | (Note: 50 units sold on 10 Oct 2026 @ Rs 1,820 -> Realized Gain: Rs 13,500.00 allocated via FIFO)                       |
+-----------+---------------+----------------+-----------------+-----------------+------------------+--------------+-----------+
```

---

## 7. FINANCIAL COPILOT CONVERSATIONAL WORKSPACE (`/copilot`)

```
+-----------------------------------------------------------------------------------------------------------------------------+
| FINANCIAL COPILOT (GROUNDED DETERMINISTIC ASSISTANT)                                    [ Clear History ] [ Export Thread ] |
+-----------------------------------------------------------------------------------------------------------------------------+
| [System Notice: Answers are strictly grounded in your tenant's double-entry records. Zero AI ledger writes permitted.]      |
|                                                                                                                             |
| (User) 14:02                                                                                                                |
| How much dividend income did I receive this financial year, and what was the net take-home after TDS?                       |
|                                                                                                                             |
| (Copilot) 14:02                                                                                                             |
| For Financial Year 2026-27 (Apr 01, 2026 to date), you have received:                                                       |
|                                                                                                                             |
| - Total Gross Dividends Declared:  Rs 1,48,200.00                                                                            |
| - Total TDS Deducted (Sec 194):     -Rs 14,820.00 (10.00% withholding rate)                                                 |
| - Net Bank Credits Received:       Rs 1,33,380.00                                                                            |
|                                                                                                                             |
| Supporting Record Provenance (3 Verified Journal Postings):                                                                 |
| 1. Infosys Ltd (INFY)   | Paid: Nov 04, 2026 | Gross: Rs 8,400.00  | TDS: Rs 840.00  | Net: Rs 7,560.00  [ View Journal #184 ] |
| 2. Tata Consultancy Svc | Paid: Oct 24, 2026 | Gross: Rs 14,000.00 | TDS: Rs 1,400.00| Net: Rs 12,600.00 [ View Journal #142 ] |
| 3. ITC Limited          | Paid: Aug 04, 2026 | Gross: Rs 1,25,800  | TDS: Rs 12,580  | Net: Rs 1,13,220  [ View Journal #091 ] |
|                                                                                                                             |
+-----------------------------------------------------------------------------------------------------------------------------+
| [ Prompt: Ask about spending, net worth, dividend yield, or upcoming bills...                              ] [ Submit > ]   |
+-----------------------------------------------------------------------------------------------------------------------------+
```
