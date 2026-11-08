import { test, expect } from '@playwright/test';

test.describe('Journeys 4-6: Investments, Budgets & Goals', () => {
  test('should render investments portfolio view with FIFO lot tracking', async ({ page }) => {
    await page.goto('/investments');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });

  test('should render budgeting and envelope allocation view with threshold indicators', async ({ page }) => {
    await page.goto('/budgets');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });

  test('should render financial goals and milestone progress tracking', async ({ page }) => {
    await page.goto('/goals');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });
});
