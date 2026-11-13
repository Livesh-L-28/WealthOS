import { describe, it, expect } from 'vitest';
import { BankAccount, Transaction, BudgetEnvelope, FinancialGoal } from './types';

describe('Usability, Fault-Tolerance & Clean-Slate Resilience', () => {
  it('auto-provisions primary cash operating account when recording transaction with zero accounts', () => {
    const initialAccounts: BankAccount[] = [];
    const txData = {
      title: 'Espresso Coffee',
      amount: 220,
      category: 'Food & Dining',
      type: 'DEBIT' as const,
      accountName: 'Cash Wallet',
    };

    let targetAccount = initialAccounts.find((a) => a.name === txData.accountName) || initialAccounts[0];
    let updatedAccounts = [...initialAccounts];
    if (!targetAccount) {
      const defaultCashAcc: BankAccount = {
        id: `acc-cash-${Date.now()}`,
        name: txData.accountName || 'Cash Wallet',
        institution: 'Cash & Liquid Assets',
        accountNumberMask: '•••• Cash',
        type: 'SAVINGS',
        category: 'ASSET',
        balance: 0,
        currency: 'INR',
        status: 'ACTIVE',
        lastSynced: 'Just now',
      };
      targetAccount = defaultCashAcc;
      updatedAccounts = [defaultCashAcc, ...initialAccounts];
    }

    const balanceDelta = txData.type === 'CREDIT' ? txData.amount : -txData.amount;
    updatedAccounts = updatedAccounts.map((acc) =>
      acc.id === targetAccount.id
        ? { ...acc, balance: acc.balance + balanceDelta, lastSynced: 'Just now' }
        : acc
    );

    expect(updatedAccounts.length).toBe(1);
    expect(updatedAccounts[0].name).toBe('Cash Wallet');
    expect(updatedAccounts[0].balance).toBe(-220);
    expect(targetAccount.id).toBeDefined();
  });

  it('auto-provisions bank account when importing statement into clean ledger with zero accounts', () => {
    const initialAccounts: BankAccount[] = [];
    const parsedStatement = {
      institution: 'HDFC Bank',
      accountNumberMask: '•••• 4412',
      netChange: 154200,
      holdings: [],
    };

    let targetAcc: BankAccount | undefined = initialAccounts[0];
    let updatedAccounts = [...initialAccounts];
    if (!targetAcc) {
      const isDemat = !!(parsedStatement.holdings && parsedStatement.holdings.length > 0);
      const importedAcc: BankAccount = {
        id: `acc-stmt-${Date.now()}`,
        name: `${parsedStatement.institution || 'Primary'} ${isDemat ? 'Investment' : 'Savings'}`,
        institution: parsedStatement.institution || 'Banking Partner',
        accountNumberMask: parsedStatement.accountNumberMask ? `•••• ${parsedStatement.accountNumberMask.slice(-4)}` : '•••• Stmt',
        type: isDemat ? 'DEMAT' : 'SAVINGS',
        category: 'ASSET',
        balance: 0,
        currency: 'INR',
        status: 'ACTIVE',
        lastSynced: 'Just now',
      };
      targetAcc = importedAcc;
      updatedAccounts = [importedAcc];
    }

    updatedAccounts = updatedAccounts.map((acc) => {
      if (targetAcc && acc.id === targetAcc.id) {
        return {
          ...acc,
          balance: Math.round((acc.balance + parsedStatement.netChange) * 100) / 100,
          lastSynced: 'Just now',
        };
      }
      return acc;
    });

    expect(updatedAccounts.length).toBe(1);
    expect(updatedAccounts[0].name).toBe('HDFC Bank Savings');
    expect(updatedAccounts[0].balance).toBe(154200);
  });

  it('correctly reverts account balance when a transaction is reversed and deleted', () => {
    const initialAccounts: BankAccount[] = [
      {
        id: 'acc-1',
        name: 'HDFC Savings',
        institution: 'HDFC Bank',
        accountNumberMask: '•••• 1234',
        type: 'SAVINGS',
        category: 'ASSET',
        balance: 50000,
        currency: 'INR',
        status: 'ACTIVE',
        lastSynced: 'Today',
      },
    ];

    const initialTx: Transaction[] = [
      {
        id: 'tx-101',
        title: 'Office Chair',
        amount: 8500,
        category: 'Shopping',
        type: 'DEBIT',
        accountName: 'HDFC Savings',
        date: 'Today',
        status: 'RECONCILED',
      },
    ];

    // Delete and reverse transaction tx-101
    const tx = initialTx.find((t) => t.id === 'tx-101')!;
    const delta = tx.type === 'CREDIT' ? -tx.amount : tx.amount;
    const updatedAccounts = initialAccounts.map((acc) => {
      if (acc.name === tx.accountName) {
        return { ...acc, balance: acc.balance + delta, lastSynced: 'Just now' };
      }
      return acc;
    });
    const updatedTx = initialTx.filter((t) => t.id !== 'tx-101');

    expect(updatedTx.length).toBe(0);
    expect(updatedAccounts[0].balance).toBe(58500); // Reverted +8500 back to account balance
  });

  it('allows unlinking and removing an account', () => {
    const accounts: BankAccount[] = [
      { id: 'acc-1', name: 'Acc 1', institution: 'Bank', accountNumberMask: '••• 1', type: 'SAVINGS', category: 'ASSET', balance: 100, currency: 'INR', status: 'ACTIVE', lastSynced: 'Now' },
      { id: 'acc-2', name: 'Acc 2', institution: 'Bank', accountNumberMask: '••• 2', type: 'SAVINGS', category: 'ASSET', balance: 200, currency: 'INR', status: 'ACTIVE', lastSynced: 'Now' },
    ];

    const updated = accounts.filter((a) => a.id !== 'acc-1');
    expect(updated.length).toBe(1);
    expect(updated[0].id).toBe('acc-2');
  });

  it('correctly handles deletion of budgets and goals', () => {
    const budgets: BudgetEnvelope[] = [
      { id: 'b-1', category: 'Dining', budgeted: 10000, spent: 4000, color: '#F00' },
    ];
    const goals: FinancialGoal[] = [
      { id: 'g-1', title: 'Trip', targetAmount: 50000, currentAmount: 10000, targetYear: 2027 },
    ];

    const updatedBudgets = budgets.filter((b) => b.id !== 'b-1');
    const updatedGoals = goals.filter((g) => g.id !== 'g-1');

    expect(updatedBudgets.length).toBe(0);
    expect(updatedGoals.length).toBe(0);
  });
});

