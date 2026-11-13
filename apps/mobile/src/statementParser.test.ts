import { describe, it, expect } from 'vitest';
import {
  parseBankStatementCsv,
  parseZerodhaTradebook,
  parseCamsCas,
  parseStatementUniversal,
  SAMPLE_HDFC_STATEMENT_CSV,
  SAMPLE_ZERODHA_TRADEBOOK_CSV,
  SAMPLE_CAMS_CAS_TEXT,
} from './statementParserService';

describe('Universal Statement & CAS Parser Engine', () => {
  it('parses real HDFC Bank Statement CSV with debit, credit, balance math', () => {
    const result = parseBankStatementCsv(SAMPLE_HDFC_STATEMENT_CSV, 'hdfc_nov2026.csv');

    expect(result.institution).toBe('HDFC Bank');
    expect(result.accountNumberMask).toBe('50100234567890');
    expect(result.transactions.length).toBe(6);
    expect(result.totalCredits).toBe(126680.0);
    expect(result.totalDebits).toBe(8059.0);
    expect(result.netChange).toBe(118621.0);
    expect(result.openingBalance).toBe(84200.0);
    expect(result.closingBalance).toBe(202821.0);
    expect(result.isBalanced).toBe(true);

    const salary = result.transactions.find((t) => t.description.includes('SALARY'));
    expect(salary).toBeDefined();
    expect(salary?.type).toBe('CREDIT');
    expect(salary?.amount).toBe(125000.0);
    expect(salary?.category).toBe('Income & Salary');

    const swiggy = result.transactions.find((t) => t.description.includes('SWIGGY'));
    expect(swiggy).toBeDefined();
    expect(swiggy?.type).toBe('DEBIT');
    expect(swiggy?.amount).toBe(840.0);
    expect(swiggy?.category).toBe('Food & Dining');

    const shell = result.transactions.find((t) => t.description.includes('SHELL'));
    expect(shell).toBeDefined();
    expect(shell?.type).toBe('DEBIT');
    expect(shell?.amount).toBe(2500.0);
    expect(shell?.category).toBe('Transport & Fuel');

    const bescom = result.transactions.find((t) => t.description.includes('BESCOM'));
    expect(bescom).toBeDefined();
    expect(bescom?.category).toBe('Utilities & Bills');
  });

  it('parses Zerodha tradebook CSV into trades and equity holdings', () => {
    const result = parseZerodhaTradebook(SAMPLE_ZERODHA_TRADEBOOK_CSV, 'zerodha_trades.csv');

    expect(result.institution).toBe('Zerodha Broking Ltd');
    expect(result.documentFormat).toBe('ZERODHA');
    expect(result.transactions.length).toBe(4);
    expect(result.holdings.length).toBe(4);

    const hdfc = result.holdings.find((h) => h.symbol === 'HDFCBANK');
    expect(hdfc).toBeDefined();
    expect(hdfc?.quantity).toBe(25);
    expect(hdfc?.avgBuyPrice).toBe(1650.0);
    expect(hdfc?.investedValue).toBe(41250.0);

    const rel = result.holdings.find((h) => h.symbol === 'RELIANCE');
    expect(rel).toBeDefined();
    expect(rel?.quantity).toBe(10);
    expect(rel?.avgBuyPrice).toBe(2950.0);
    expect(rel?.investedValue).toBe(29500.0);
  });

  it('parses CAMS CAS text into mutual fund folios and transactions', () => {
    const result = parseCamsCas(SAMPLE_CAMS_CAS_TEXT, 'cams_cas.txt');

    expect(result.institution).toBe('CAMS Mutual Fund Registry');
    expect(result.documentFormat).toBe('CAS');
    expect(result.transactions.length).toBe(2);
    expect(result.holdings.length).toBe(2);

    expect(result.transactions[0].amount).toBe(5000.0);
    expect(result.transactions[0].type).toBe('DEBIT');
    expect(result.transactions[1].amount).toBe(3000.0);
  });

  it('detects format dynamically with parseStatementUniversal', () => {
    const r1 = parseStatementUniversal(SAMPLE_HDFC_STATEMENT_CSV);
    expect(r1.documentFormat).toBe('BANK_CSV');

    const r2 = parseStatementUniversal(SAMPLE_ZERODHA_TRADEBOOK_CSV);
    expect(r2.documentFormat).toBe('ZERODHA');

    const r3 = parseStatementUniversal(SAMPLE_CAMS_CAS_TEXT);
    expect(r3.documentFormat).toBe('CAS');
  });

  it('flags arithmetic variance when opening + net != closing', () => {
    const unbalancedCsv = `Account Number: 123456
Opening Balance: 1000.00
Closing Balance: 5000.00

Date,Narration,Withdrawal,Deposit,Balance
01/11/2026,Coffee,50.00,0,950.00
`;
    const result = parseBankStatementCsv(unbalancedCsv);
    expect(result.isBalanced).toBe(false);
  });
});

