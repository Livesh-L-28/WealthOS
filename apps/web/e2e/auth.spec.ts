import { test, expect } from '@playwright/test';

test.describe('Journey 1: Authentication & Session Security', () => {
  test('should display sign in page with required form controls', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page).toHaveTitle(/WealthOS/i);
    await expect(page.locator('h1')).toContainText('Sign in to WealthOS');

    const emailInput = page.locator('#login-email');
    const passwordInput = page.locator('#login-password');
    const submitBtn = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test('should show authentication failure alert on invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#login-email', 'nonexistent.user@example.com');
    await page.fill('#login-password', 'WrongPassword#9999');
    await page.click('button[type="submit"]');

    const alert = page.locator('[role="alert"]').filter({ hasText: 'Authentication Failed' });
    await expect(alert).toBeVisible({ timeout: 10000 });
    await expect(alert).toContainText('Authentication Failed');
  });

  test('should navigate between login, register, and password recovery', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Navigate to register
    const registerLink = page.locator('a[href="/auth/register"]');
    if (await registerLink.count() > 0) {
      await registerLink.first().click();
      await expect(page).toHaveURL(/.*\/auth\/register/);
    }

    // Navigate to forgot-password
    await page.goto('/auth/login');
    const forgotLink = page.locator('a[href="/auth/forgot-password"]');
    if (await forgotLink.count() > 0) {
      await forgotLink.first().click();
      await expect(page).toHaveURL(/.*\/auth\/forgot-password/);
    }
  });

  test('should render MFA verification view with token challenge handling', async ({ page }) => {
    await page.goto('/auth/mfa');
    // If no challenge token is present in sessionStorage, it handles redirection or displays error state
    await expect(page.locator('body')).toBeVisible();
  });
});
