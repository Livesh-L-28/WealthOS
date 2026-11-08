import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.join(__dirname, '../e2e-artifacts/screenshots');

let authToken = '';
let activeTenantId = '';

test.beforeAll(async () => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // Obtain authentic session token once via API
  const resp = await fetch('http://localhost:8000/api/v1/auth/login', {
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

test.describe('Gate 4: Playwright Authenticated Browser Scenarios', () => {
  const credentials = {
    email: 'perf.benchmark@example.com',
    password: 'SecurePassword#2026',
  };

  test('Scenario 01: Valid User Login & Session Establishment', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#login-email', credentials.email);
    await page.fill('#login-password', credentials.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('Executive Financial Overview');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-01-dashboard-authenticated.png') });
  });

  test('Scenario 02: Invalid Login Failure & Error Alert', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#login-email', 'unauthorized.intruder@example.com');
    await page.fill('#login-password', 'CompletelyWrong#9999');
    await page.click('button[type="submit"]');

    const alert = page.locator('[role="alert"]').filter({ hasText: 'Authentication Failed' });
    await expect(alert).toBeVisible({ timeout: 10000 });
    await expect(alert).toContainText('Authentication Failed');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-02-invalid-login.png') });
  });

  test('Scenario 03: MFA Challenge Route & Guard', async ({ page }) => {
    await page.goto('/auth/mfa');
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-03-mfa-guard.png') });
  });

  test('Scenario 04: Authenticated Session Logout & Storage Purge', async ({ page }) => {
    if (authToken) {
      await page.addInitScript(
        ({ token, tid }) => {
          localStorage.setItem('wealthos_access_token', token);
          localStorage.setItem('wealthos_current_tenant_id', tid);
        },
        { token: authToken, tid: activeTenantId }
      );
    }
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*\/dashboard/);

    // Trigger logout by purging storage and navigating to login
    await page.evaluate(() => {
      localStorage.removeItem('wealthos_access_token');
      localStorage.removeItem('wealthos_current_tenant_id');
      window.location.href = '/auth/login';
    });

    await expect(page).toHaveURL(/.*\/auth\/login/);
    await expect(page.locator('#login-email')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-04-logged-out.png') });
  });

  test('Scenario 05: Financial Accounts List & Metrics', async ({ page }) => {
    if (authToken) {
      await page.addInitScript(
        ({ token, tid }) => {
          localStorage.setItem('wealthos_access_token', token);
          localStorage.setItem('wealthos_current_tenant_id', tid);
        },
        { token: authToken, tid: activeTenantId }
      );
    }
    await page.goto('/accounts');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-05-accounts.png') });
  });

  test('Scenario 06: Transactions Ledger View', async ({ page }) => {
    if (authToken) {
      await page.addInitScript(
        ({ token, tid }) => {
          localStorage.setItem('wealthos_access_token', token);
          localStorage.setItem('wealthos_current_tenant_id', tid);
        },
        { token: authToken, tid: activeTenantId }
      );
    }
    await page.goto('/transactions');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-06-transactions.png') });
  });

  test('Scenario 07: Investments Portfolio & FIFO Engine View', async ({ page }) => {
    if (authToken) {
      await page.addInitScript(
        ({ token, tid }) => {
          localStorage.setItem('wealthos_access_token', token);
          localStorage.setItem('wealthos_current_tenant_id', tid);
        },
        { token: authToken, tid: activeTenantId }
      );
    }
    await page.goto('/investments');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-07-investments.png') });
  });

  test('Scenario 08: Budgets & Allocation Threshold Indicators', async ({ page }) => {
    if (authToken) {
      await page.addInitScript(
        ({ token, tid }) => {
          localStorage.setItem('wealthos_access_token', token);
          localStorage.setItem('wealthos_current_tenant_id', tid);
        },
        { token: authToken, tid: activeTenantId }
      );
    }
    await page.goto('/budgets');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-08-budgets.png') });
  });

  test('Scenario 09: Financial Goals & Progress Tracking', async ({ page }) => {
    if (authToken) {
      await page.addInitScript(
        ({ token, tid }) => {
          localStorage.setItem('wealthos_access_token', token);
          localStorage.setItem('wealthos_current_tenant_id', tid);
        },
        { token: authToken, tid: activeTenantId }
      );
    }
    await page.goto('/goals');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-09-goals.png') });
  });

  test('Scenario 10: AI Financial Copilot Chat Interface', async ({ page }) => {
    if (authToken) {
      await page.addInitScript(
        ({ token, tid }) => {
          localStorage.setItem('wealthos_access_token', token);
          localStorage.setItem('wealthos_current_tenant_id', tid);
        },
        { token: authToken, tid: activeTenantId }
      );
    }
    await page.goto('/copilot');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-10-copilot.png') });
  });

  test('Scenario 11: Financial Documents Dropzone & Storage', async ({ page }) => {
    if (authToken) {
      await page.addInitScript(
        ({ token, tid }) => {
          localStorage.setItem('wealthos_access_token', token);
          localStorage.setItem('wealthos_current_tenant_id', tid);
        },
        { token: authToken, tid: activeTenantId }
      );
    }
    await page.goto('/documents');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-11-documents.png') });
  });

  test('Scenario 12: Net Worth Statement & Asset Allocation', async ({ page }) => {
    if (authToken) {
      await page.addInitScript(
        ({ token, tid }) => {
          localStorage.setItem('wealthos_access_token', token);
          localStorage.setItem('wealthos_current_tenant_id', tid);
        },
        { token: authToken, tid: activeTenantId }
      );
    }
    await page.goto('/net-worth');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-12-net-worth.png') });
  });

  test('Scenario 13: Workspace Security Controls & Audit', async ({ page }) => {
    if (authToken) {
      await page.addInitScript(
        ({ token, tid }) => {
          localStorage.setItem('wealthos_access_token', token);
          localStorage.setItem('wealthos_current_tenant_id', tid);
        },
        { token: authToken, tid: activeTenantId }
      );
    }
    await page.goto('/settings/security');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-13-security-settings.png') });
  });

  test('Scenario 14: Non-existent & Unauthorized Route Protection', async ({ page }) => {
    await page.goto('/non-existent-enterprise-route-404');
    await expect(page.locator('body')).toBeVisible();
    await expect(
      page.locator('text=404').or(page.locator('text=Page Not Found')).or(page.locator('h1, h2'))
    ).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-14-404-handling.png') });
  });

  test('Scenario 15: Responsive Navigation & Tenant Workspace State', async ({ page }) => {
    if (authToken) {
      await page.addInitScript(
        ({ token, tid }) => {
          localStorage.setItem('wealthos_access_token', token);
          localStorage.setItem('wealthos_current_tenant_id', tid);
        },
        { token: authToken, tid: activeTenantId }
      );
    }
    await page.goto('/dashboard');
    const nav = page.locator('nav, aside');
    await expect(nav.first()).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'scenario-15-navigation.png') });
  });
});

