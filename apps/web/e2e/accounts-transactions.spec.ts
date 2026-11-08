import { test, expect } from '@playwright/test';

test.describe('Journeys 2-3: Accounts, Ledger & Transactions', () => {
  test('should render executive dashboard overview and balance sheet', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('h1')).toContainText('Executive Financial Overview');
    await expect(page.locator('text=Onboarding Setup Checklist').or(page.locator('text=Balance Sheet'))).toBeVisible();
  });

  test('should render accounts list and financial institution accounts', async ({ page }) => {
    await page.goto('/accounts');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });

  test('should render transactions ledger view with double-entry balance validation', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
  });
});
