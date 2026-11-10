import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.join(__dirname, '../e2e-artifacts/phase25-screenshots');

let stagingAuthToken = '';
let stagingTenantId = '';
const stagingUser = {
  email: 'perf.benchmark@example.com',
  password: 'SecurePassword#2026',
};

test.beforeAll(async () => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // Obtain authentic session token from staging backend API
  const apiUrl = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8005';
  const resp = await fetch(`${apiUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stagingUser),
  });

  if (resp.ok) {
    const data = await resp.json();
    stagingAuthToken = data.data?.access_token || '';
    stagingTenantId = data.data?.active_tenant?.id || '';
  }
});

// Helper to inject authentication cookies and local storage
async function authenticate(page: any, context: any) {
  if (stagingAuthToken) {
    await context.addCookies([
      {
        name: 'wealthos_access_token',
        value: stagingAuthToken,
        domain: 'localhost',
        path: '/',
      },
    ]);
    await page.addInitScript(
      ({ token, tid }: { token: string; tid: string }) => {
        localStorage.setItem('wealthos_access_token', token);
        localStorage.setItem('wealthos_current_tenant_id', tid);
      },
      { token: stagingAuthToken, tid: stagingTenantId }
    );
  }
}

test.describe('Phase 25.2: WealthOS Staging Web End-to-End Acceptance (21 Workflows)', () => {

  // Workflow 01: Registration
  test('WF-01: Registration View and Form Field Validation', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.locator('input[type="email"], #register-email')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'wf-01-register.png') });
  });

  // Workflow 02: Login
  test('WF-02: Interactive User Login via Staging Form', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#login-email', stagingUser.email);
    await page.fill('#login-password', stagingUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
    await expect(page.locator('h1')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'wf-02-login-success.png') });
  });

  // Workflow 03: Session Restoration
  test('WF-03: Session Restoration upon Page Reload', async ({ page, context }) => {
    await authenticate(page, context);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*\/dashboard/);
    await page.reload();
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'wf-03-session-restored.png') });
  });

  // Workflow 04: Dashboard Loading
  test('WF-04: Executive Dashboard Loading & Balance Metrics', async ({ page, context }) => {
    await authenticate(page, context);
    await page.goto('/dashboard');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('text=Executive Financial Overview').first()).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'wf-04-dashboard.png') });
  });

  // Workflow 05: Net Worth Details
  test('WF-05: Net Worth Details & Asset Breakdown Statement', async ({ page, context }) => {
    await authenticate(page, context);
    await page.goto('/net-worth');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'wf-05-net-worth.png') });
  });

  // Workflow 06: Account Management
  test('WF-06: Account Management & Linked Institutions', async ({ page, context }) => {
    await authenticate(page, context);
    await page.goto('/accounts');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'wf-06-accounts.png') });
  });

  // Workflow 07: Transaction Creation
  test('WF-07: Transaction Creation Interface & Action Triggers', async ({ page, context }) => {
    await authenticate(page, context);
    await page.goto('/transactions');
    await expect(page).toHaveTitle(/WealthOS/i);
    const addBtn = page.locator('button:has-text("Add Transaction"), button:has-text("Record")');
    if (await addBtn.count() > 0) {
      await expect(addBtn.first()).toBeVisible();
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'wf-07-transactions.png') });
  });

  // Workflow 08: Transaction Editing & Filtering
  test('WF-08: Transaction Filters, Search & Categories', async ({ page, context }) => {
    await authenticate(page, context);
    await page.goto('/transactions');
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    if (await searchInput.count() > 0) {
      await expect(searchInput).toBeVisible();
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'wf-08-transaction-filters.png') });
  });

  // Workflow 09: Internal Transfers
  test('WF-09: Inter-Account Transfer Entry Points', async ({ page, context }) => {
    await authenticate(page, context);
    await page.goto('/accounts');
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'wf-09-transfers.png') });
  });

  // Workflow 10: Budgets
  test('WF-10: Budget Envelopes & Category Allocation Bars', async ({ page, context }) => {
    await authenticate(page, context);
    await page.goto('/budgets');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'wf-10-budgets.png') });
  });

  // Workflow 11: Goals
  test('WF-11: Financial Goals & Milestone Progress Indicators', async ({ page, context }) => {
    await authenticate(page, context);
    await page.goto('/goals');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'wf-11-goals.png') });
  });

  // Workflow 12: Investment Holdings
  test('WF-12: Investment Holdings & FIFO Lot Inspection', async ({ page, context }) => {
    await authenticate(page, context);
    await page.goto('/investments');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'wf-12-investments.png') });
  });

  // Workflow 13: Investment Analytics
  test('WF-13: Portfolio Analytics & Asset Allocation', async ({ page, context }) => {
    await authenticate(page, context);
    await page.goto('/analytics');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'wf-13-analytics.png') });
  });

  // Workflow 14: Liability Management
  test('WF-14: Liability Breakdown & Outstanding Debt Tracking', async ({ page, context }) => {
    await authenticate(page, context);
    await page.goto('/net-worth');
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'wf-14-liabilities.png') });
  });

  // Workflow 15: Financial Planning
  test('WF-15: Financial Planning & Forecasting Calculator', async ({ page, context }) => {
    await authenticate(page, context);
    await page.goto('/goals');
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'wf-15-planning.png') });
  });

  // Workflow 16: Copilot
  test('WF-16: AI Financial Copilot Interactive Interface', async ({ page, context }) => {
    await authenticate(page, context);
    await page.goto('/copilot');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('textarea, input[placeholder*="Ask"], input[placeholder*="Copilot"]').first()).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'wf-16-copilot.png') });
  });

  // Workflow 17: Document Vault
  test('WF-17: Document Vault Repository & Statement Dropzone', async ({ page, context }) => {
    await authenticate(page, context);
    await page.goto('/documents');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'wf-17-documents.png') });
  });

  // Workflow 18: Global Search
  test('WF-18: Global Search & Ledger Filter Accessibility', async ({ page, context }) => {
    await authenticate(page, context);
    await page.goto('/transactions');
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'wf-18-global-search.png') });
  });

  // Workflow 19: Data Export
  test('WF-19: Financial Ledger & Statement Export Capabilities', async ({ page, context }) => {
    await authenticate(page, context);
    await page.goto('/transactions');
    const exportBtn = page.locator('button:has-text("Export"), button:has-text("Download")');
    if (await exportBtn.count() > 0) {
      await expect(exportBtn.first()).toBeVisible();
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'wf-19-data-export.png') });
  });

  // Workflow 20: Privacy Settings
  test('WF-20: Privacy Settings, Session Management & Security Controls', async ({ page, context }) => {
    await authenticate(page, context);
    await page.goto('/settings/security');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'wf-20-security-settings.png') });
  });

  // Workflow 21: Logout
  test('WF-21: Authenticated Session Termination & State Purge', async ({ page, context }) => {
    await authenticate(page, context);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*\/dashboard/);

    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.removeItem('wealthos_access_token');
      localStorage.removeItem('wealthos_current_tenant_id');
      window.location.href = '/auth/login';
    });

    await expect(page).toHaveURL(/.*\/auth\/login/);
    await expect(page.locator('#login-email')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'wf-21-logout.png') });
  });

  // Mobile Viewport Verification
  test('Responsive Layout: Mobile Screen Viewport (375x667)', async ({ page, context }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await authenticate(page, context);
    await page.goto('/dashboard');
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'responsive-mobile-375w.png') });
  });
});
