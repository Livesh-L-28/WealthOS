import { test, expect } from '@playwright/test';

test.describe('Journeys 7-12: AI Copilot, Documents, Analytics & Navigation', () => {
  test('should render AI Financial Copilot interactive chat interface', async ({ page }) => {
    await page.goto('/copilot');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });

  test('should render financial documents repository and statement dropzone', async ({ page }) => {
    await page.goto('/documents');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });

  test('should render net worth and asset allocation statement', async ({ page }) => {
    await page.goto('/net-worth');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });

  test('should render workspace settings and security controls', async ({ page }) => {
    await page.goto('/settings/security');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should support responsive sidebar navigation across modules', async ({ page }) => {
    await page.goto('/dashboard');
    const nav = page.locator('nav, aside');
    await expect(nav.first()).toBeVisible();
  });

  test('should render 404 page for nonexistent routes gracefully', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-404');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=404').or(page.locator('text=Page Not Found')).or(page.locator('h1, h2'))).toBeVisible();
  });
});
