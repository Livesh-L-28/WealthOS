import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BankAccount,
  Transaction,
  InvestmentHolding,
  BudgetEnvelope,
  FinancialGoal,
  DocumentItem,
  CopilotMessage,
} from '../types';

export const STORAGE_KEYS = {
  HAS_ONBOARDED: '@wealthos/has_onboarded',
  ACCOUNTS: '@wealthos/accounts',
  TRANSACTIONS: '@wealthos/transactions',
  HOLDINGS: '@wealthos/holdings',
  BUDGETS: '@wealthos/budgets',
  GOALS: '@wealthos/goals',
  DOCUMENTS: '@wealthos/documents',
  COPILOT_MESSAGES: '@wealthos/copilot_messages',
  WORKSPACE: '@wealthos/workspace',
  CUSTOM_SERVER_URL: '@wealthos/custom_server_url',
} as const;

export interface StoredLedgerState {
  hasOnboarded: boolean;
  accounts: BankAccount[];
  transactions: Transaction[];
  holdings: InvestmentHolding[];
  budgets: BudgetEnvelope[];
  goals: FinancialGoal[];
  documents: DocumentItem[];
  copilotMessages: CopilotMessage[];
  workspace: string;
}

const DEFAULT_WELCOME_COPILOT: CopilotMessage[] = [
  {
    id: 'welcome-clean',
    sender: 'copilot',
    text: 'Welcome to WealthOS. Your secure personal ledger is initialized. Add an account or record your first transaction to begin building your financial digital twin.',
    timestamp: 'Just now',
  },
];

export const localStore = {
  /**
   * Load entire persistent ledger state from device storage.
   * If first launch, initializes clean state with zero dummy data.
   */
  async loadLedgerState(): Promise<StoredLedgerState> {
    try {
      const hasOnboardedStr = await AsyncStorage.getItem(STORAGE_KEYS.HAS_ONBOARDED);
      if (!hasOnboardedStr) {
        // First run: brand new clean slate
        const cleanState: StoredLedgerState = {
          hasOnboarded: true,
          accounts: [],
          transactions: [],
          holdings: [],
          budgets: [],
          goals: [],
          documents: [],
          copilotMessages: DEFAULT_WELCOME_COPILOT,
          workspace: 'Personal Ledger',
        };
        await this.saveLedgerState(cleanState);
        return cleanState;
      }

      // Existing user: load persisted data safely
      const [
        accountsJson,
        txsJson,
        holdingsJson,
        budgetsJson,
        goalsJson,
        docsJson,
        copilotJson,
        workspace,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ACCOUNTS),
        AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS),
        AsyncStorage.getItem(STORAGE_KEYS.HOLDINGS),
        AsyncStorage.getItem(STORAGE_KEYS.BUDGETS),
        AsyncStorage.getItem(STORAGE_KEYS.GOALS),
        AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS),
        AsyncStorage.getItem(STORAGE_KEYS.COPILOT_MESSAGES),
        AsyncStorage.getItem(STORAGE_KEYS.WORKSPACE),
      ]);

      return {
        hasOnboarded: true,
        accounts: accountsJson ? JSON.parse(accountsJson) : [],
        transactions: txsJson ? JSON.parse(txsJson) : [],
        holdings: holdingsJson ? JSON.parse(holdingsJson) : [],
        budgets: budgetsJson ? JSON.parse(budgetsJson) : [],
        goals: goalsJson ? JSON.parse(goalsJson) : [],
        documents: docsJson ? JSON.parse(docsJson) : [],
        copilotMessages: copilotJson ? JSON.parse(copilotJson) : DEFAULT_WELCOME_COPILOT,
        workspace: workspace || 'Personal Ledger',
      };
    } catch (err) {
      console.warn('Failed to load local storage:', err);
      return {
        hasOnboarded: true,
        accounts: [],
        transactions: [],
        holdings: [],
        budgets: [],
        goals: [],
        documents: [],
        copilotMessages: DEFAULT_WELCOME_COPILOT,
        workspace: 'Personal Ledger',
      };
    }
  },

  /**
   * Atomically persist the entire state to AsyncStorage.
   */
  async saveLedgerState(state: StoredLedgerState): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.HAS_ONBOARDED, 'true'],
        [STORAGE_KEYS.ACCOUNTS, JSON.stringify(state.accounts)],
        [STORAGE_KEYS.TRANSACTIONS, JSON.stringify(state.transactions)],
        [STORAGE_KEYS.HOLDINGS, JSON.stringify(state.holdings)],
        [STORAGE_KEYS.BUDGETS, JSON.stringify(state.budgets)],
        [STORAGE_KEYS.GOALS, JSON.stringify(state.goals)],
        [STORAGE_KEYS.DOCUMENTS, JSON.stringify(state.documents)],
        [STORAGE_KEYS.COPILOT_MESSAGES, JSON.stringify(state.copilotMessages)],
        [STORAGE_KEYS.WORKSPACE, state.workspace || 'Personal Ledger'],
      ]);
    } catch (err) {
      console.warn('Failed to persist ledger state:', err);
    }
  },

  async saveAccounts(accounts: BankAccount[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
    } catch (err) {
      console.warn('Failed to save accounts:', err);
    }
  },

  async saveTransactions(transactions: Transaction[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    } catch (err) {
      console.warn('Failed to save transactions:', err);
    }
  },

  async saveHoldings(holdings: InvestmentHolding[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HOLDINGS, JSON.stringify(holdings));
    } catch (err) {
      console.warn('Failed to save holdings:', err);
    }
  },

  async saveBudgets(budgets: BudgetEnvelope[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
    } catch (err) {
      console.warn('Failed to save budgets:', err);
    }
  },

  async saveGoals(goals: FinancialGoal[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
    } catch (err) {
      console.warn('Failed to save goals:', err);
    }
  },

  async saveCopilotMessages(messages: CopilotMessage[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.COPILOT_MESSAGES, JSON.stringify(messages));
    } catch (err) {
      console.warn('Failed to save copilot messages:', err);
    }
  },

  async resetToCleanSlate(): Promise<StoredLedgerState> {
    const cleanState: StoredLedgerState = {
      hasOnboarded: true,
      accounts: [],
      transactions: [],
      holdings: [],
      budgets: [],
      goals: [],
      documents: [],
      copilotMessages: DEFAULT_WELCOME_COPILOT,
      workspace: 'Personal Ledger',
    };
    await this.saveLedgerState(cleanState);
    return cleanState;
  },

  async getCustomServerUrl(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_SERVER_URL);
    } catch {
      return null;
    }
  },

  async setCustomServerUrl(url: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_SERVER_URL, url);
    } catch (err) {
      console.warn('Failed to save custom server url:', err);
    }
  },
};

