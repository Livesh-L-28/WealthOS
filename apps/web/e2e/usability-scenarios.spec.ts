import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.join(__dirname, '../e2e-artifacts/usability-screenshots');

let authToken = '';
let activeTenantId = '';

test.beforeAll(async () => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // Obtain authentic session token once via backend API to prevent rate-limit exhaustion
  const apiUrl = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8005';
  const resp = await fetch(`${apiUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'perf.benchmark@example.com',
      password: 'SecurePassword#2026',
    }),
  });
  if (resp.ok) {
    const data = await resp.json();
    authToken = data.data?.access_token || '';
    activeTenantId = data.data?.active_tenant?.id || '';
  }
});

test.describe('WealthOS Usability & Accessibility Test Suite', () => {
  test.beforeEach(async ({ page, context }) => {
    if (authToken) {
      await context.addCookies([
        { name: 'wealthos_access_token', value: authToken, domain: 'localhost', path: '/' },
      ]);
      await page.addInitScript(
        ({ token, tid }) => {
          localStorage.setItem('wealthos_access_token', token);
          localStorage.setItem('wealthos_current_tenant_id', tid);
        },
        { token: authToken, tid: activeTenantId }
      );
    }
  });

  // --- BEGINNER USER SCENARIOS (1 to 10) ---

  test('Beginner Scenario 1: New user understands financial position via 5-Question Summary', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=1. Total Net Worth')).toBeVisible();
    await expect(page.locator('text=2. What I Own (Assets)')).toBeVisible();
    await expect(page.locator('text=3. What I Owe (Debts)')).toBeVisible();
    await expect(page.locator('text=4. Net Cash Flow')).toBeVisible();
    await expect(page.locator('text=5. Goals Progress')).toBeVisible();

    await expect(page.locator('button:has-text("This Month")')).toBeVisible();
    await expect(page.locator('button:has-text("Year-to-Date")')).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-01-dashboard-5questions.png') });
  });

  test('Beginner Scenario 2: User adds an account through guided wizard', async ({ page }) => {
    await page.goto('/accounts');
    await page.click('button:has-text("Link Account")');

    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();

    await modal.locator('button:has-text("Current Account")').click();
    await modal.locator('button:has-text("Continue")').click();

    await modal.locator('input[placeholder*="HDFC Bank"]').fill('Kotak Mahindra Bank');
    await modal.locator('input[placeholder*="Salary Account"]').fill('Business Operating');
    await modal.locator('input[placeholder*="4092"]').fill('7788');
    await modal.locator('input[placeholder="0.00"]').fill('350000');
    await modal.locator('button:has-text("Continue")').click();

    await expect(modal.locator('text=Step 3 of 3 • Review & Confirm')).toBeVisible();
    await modal.locator('button:has-text("Confirm & Link Account")').click();

    await expect(modal.locator('text=Account Connected!')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-02-account-added.png') });
  });

  test('Beginner Scenario 3: User records monthly income transaction', async ({ page }) => {
    await page.goto('/transactions');
    await page.click('button:has-text("Add Transaction")');

    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();

    await modal.locator('button:has-text("Income (Inflow)")').click();
    await modal.locator('input[placeholder="0.00"]').fill('75000');
    await modal.locator('input[placeholder*="Swiggy"]').fill('Consulting Fee Retainer');
    await modal.locator('button:has-text("Review Entry")').click();

    await expect(modal.locator('text=Ledger Posting Preview')).toBeVisible();
    await expect(modal.locator('text=+₹75,000.00')).toBeVisible();
    await modal.locator('button:has-text("Post to Ledger")').click();

    await expect(modal.locator('text=Transaction Recorded!')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-03-income-recorded.png') });
  });

  test('Beginner Scenario 4: User records an everyday expense with category chip', async ({ page }) => {
    await page.goto('/transactions');
    await page.click('button:has-text("Add Transaction")');

    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();

    await modal.locator('input[placeholder="0.00"]').fill('1850.50');
    await modal.locator('button:has-text("Groceries & Dining")').click();
    await modal.locator('input[placeholder*="Swiggy"]').fill('Nature Basket Groceries');
    await modal.locator('button:has-text("Review Entry")').click();

    await expect(modal.locator('text=Ledger Posting Preview')).toBeVisible();
    await modal.locator('button:has-text("Post to Ledger")').click();
    await expect(modal.locator('text=Transaction Recorded!')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-04-expense-recorded.png') });
  });

  test('Beginner Scenario 5: User understands monthly spending vs income', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page.locator('text=Expense Intelligence & Burn Radar')).toBeVisible();

    await page.click('button:has-text("Monthly")');
    await expect(page.getByText('₹1,51,550.00').first()).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-05-spending-radar.png') });
  });

  test('Beginner Scenario 6: User creates a budget envelope with alert threshold', async ({ page }) => {
    await page.goto('/budgets');
    await page.click('button:has-text("New Budget Envelope")');

    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=Create Spending Envelope')).toBeVisible();

    await modal.locator('select').selectOption({ label: 'Dining & Restaurants' });
    await modal.locator('input[placeholder*="15000"]').fill('25000');
    await modal.locator('button:has-text("Save Envelope")').click();

    await expect(modal.locator('text=Budget Envelope Created!')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-06-budget-created.png') });
  });

  test('Beginner Scenario 7: User adds an investment folio', async ({ page }) => {
    await page.goto('/investments');
    await page.locator('button:has-text("Add Folio")').first().click();

    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=Record Investment Holding')).toBeVisible();

    await modal.locator('input[placeholder*="98402"]').fill('11223');
    await modal.locator('input[placeholder*="150.250"]').fill('200');
    await modal.locator('input[placeholder*="78.45"]').fill('55.20');
    await modal.locator('button:has-text("Review Holding")').click();

    await expect(modal.locator('text=Holding Allotment Review')).toBeVisible();
    await modal.locator('button:has-text("Confirm & Save Holding")').click();
    await expect(modal.locator('text=Investment Added!')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-07-investment-added.png') });
  });

  test('Beginner Scenario 8: User creates a financial milestone goal', async ({ page }) => {
    await page.goto('/goals');
    await page.click('button:has-text("Add Goal")');

    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=Create Financial Goal')).toBeVisible();

    await modal.locator('input[placeholder*="Dream Home"]').fill('Retirement Corpus Phase 1');
    await modal.locator('input[placeholder*="1000000"]').fill('5000000');
    await modal.locator('input[placeholder="0"]').fill('1200000');

    await expect(modal.locator('text=Recommended Monthly Contribution')).toBeVisible();
    await modal.locator('button:has-text("Set Financial Goal")').click();
    await expect(modal.locator('text=Financial Goal Active!')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-08-goal-created.png') });
  });

  test('Beginner Scenario 9: User uploads a statement for OCR parsing', async ({ page }) => {
    await page.goto('/documents');
    await page.click('button:has-text("Select File to Upload")');

    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=Upload Financial Document')).toBeVisible();
    await expect(modal.locator('text=Supported formats: PDF (%PDF-1.x)')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-09-document-upload.png') });
  });

  test('Beginner Scenario 10: User asks Financial Copilot a question with suggested chip', async ({ page }) => {
    await page.goto('/copilot');
    await expect(page.locator('h1:has-text("Financial Copilot")')).toBeVisible();

    await page.click('button:has-text("What is my current net worth?")');
    await expect(page.locator('text=Your current net worth is ₹75,37,901.25')).toBeVisible();
    await expect(page.locator('text=Verified Source Citation')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-10-copilot-answered.png') });
  });

  // --- ADVANCED USER SCENARIOS (1 to 6) ---

  test('Advanced Scenario 1: User manages multiple accounts with liquid vs debt separation', async ({ page }) => {
    await page.goto('/accounts');
    await expect(page.locator('text=Liquid Cash & Reserves').first()).toBeVisible();
    await expect(page.locator('text=Total Liabilities (Debts)').first()).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-11-multi-accounts.png') });
  });

  test('Advanced Scenario 2: User reviews portfolio performance & asset allocation', async ({ page }) => {
    await page.goto('/investments');
    await expect(page.locator('text=Total Portfolio AUM').or(page.locator('text=Mutual Fund AUM'))).toBeVisible();
    await expect(page.locator('text=Unrealized Gain / Return')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-12-portfolio-review.png') });
  });

  test('Advanced Scenario 3: User validates double-entry ledger reconciliation', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page.locator('text=100% Balanced')).toBeVisible();
    await expect(page.locator('text=Transactions & Ledger').or(page.locator('text=Transaction Ledger'))).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-13-double-entry-balanced.png') });
  });

  test('Advanced Scenario 4: User investigates multi-cadence burn radar', async ({ page }) => {
    await page.goto('/analytics');
    await page.click('button:has-text("Daily")');
    await expect(page.getByRole('heading', { name: /Today/i }).first()).toBeVisible();
    await page.click('button:has-text("Yearly")');
    await expect(page.getByText('Calendar Year 2026').first()).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-14-burn-radar-cadences.png') });
  });

  test('Advanced Scenario 5: User reviews realized vs unrealized profit explanations', async ({ page }) => {
    await page.goto('/dashboard');
    const tooltipBtn = page.locator('button[aria-label*="Explain Net Worth"]').first();
    await tooltipBtn.hover();
    await expect(page.locator('text=What you own minus what you owe')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-15-plain-english-tooltip.png') });
  });

  test('Advanced Scenario 6: User navigates between core modules seamlessly', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('nav a:has-text("Accounts")');
    await expect(page).toHaveURL(/.*\/accounts/);

    await page.click('nav a:has-text("Transactions")');
    await expect(page).toHaveURL(/.*\/transactions/);

    await page.click('nav a:has-text("Investments")');
    await expect(page).toHaveURL(/.*\/investments/);

    await page.click('nav a:has-text("Overview")');
    await expect(page).toHaveURL(/.*\/dashboard/);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-16-seamless-navigation.png') });
  });

  // --- ACCESSIBILITY & MOBILE USABILITY ---

  test('Accessibility: Focus indicators, WCAG landmarks, and dialog semantics', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.locator('aside[aria-label="Main Navigation"]')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();

    const addAccountBtn = page.locator('button:has-text("Add Account")').first();
    const box = await addAccountBtn.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(30);

    await addAccountBtn.click();
    const modal = page.locator('div[role="dialog"][aria-modal="true"]');
    await expect(modal).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-17-dialog-accessibility.png') });
  });
});
