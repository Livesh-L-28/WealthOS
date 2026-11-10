import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.join(__dirname, '../e2e-artifacts/visualization-screenshots');

let authToken = '';
let activeTenantId = '';

test.beforeAll(async () => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // Obtain authentic session token via backend API
  try {
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
  } catch (e) {
    console.warn('Backend login unavailable; running in demo mode');
  }
});

test.describe('WealthOS Professional Data Visualization & Chart Design Suite', () => {
  test.beforeEach(async ({ page }) => {
    if (authToken) {
      await page.addInitScript(
        ({ token, tid }) => {
          localStorage.setItem('wealthos_access_token', token);
          localStorage.setItem('wealthos_current_tenant_id', tid);
        },
        { token: authToken, tid: activeTenantId }
      );
    }
  });

  test('Vis-01: Consolidated Net Worth Area Chart, Waterfall view & Accessible Table', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify Consolidated Net Worth container
    const netWorthSection = page.locator('text=Consolidated Net Worth').first();
    await expect(netWorthSection).toBeVisible();

    // Verify Freshness Badge
    await expect(page.locator('text=Double-Entry Grounded').first()).toBeVisible();

    // Verify Net Worth value
    await expect(page.locator('text=₹75,37,901.25').first()).toBeVisible();

    // Verify Time horizon pills
    await expect(page.locator('button:has-text("1M")').first()).toBeVisible();
    await expect(page.locator('button:has-text("3M")').first()).toBeVisible();
    await expect(page.locator('button:has-text("1Y")').first()).toBeVisible();

    // Click 3M range
    await page.locator('button:has-text("3M")').first().click();
    await page.waitForTimeout(300);

    // Capture Area Chart view
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'vis-01-net-worth-area-chart.png') });

    // Switch to Waterfall view
    const waterfallBtn = page.locator('button:has-text("Waterfall")').first();
    await expect(waterfallBtn).toBeVisible();
    await waterfallBtn.click();
    await page.waitForTimeout(300);

    // Verify waterfall step text
    await expect(page.locator('text=Oct 10 Net').first()).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'vis-01-net-worth-waterfall.png') });

    // Switch to Accessible Table View
    const tableViewBtn = page.locator('button:has-text("View as Table")').first();
    await expect(tableViewBtn).toBeVisible();
    await tableViewBtn.click();
    await page.waitForTimeout(300);

    // Verify accessible table audit ledger & export button
    await expect(page.locator('text=Consolidated Net Worth History (Audit Ledger)').first()).toBeVisible();
    await expect(page.locator('button:has-text("Export CSV")').first()).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'vis-01-net-worth-table-fallback.png') });
  });

  test('Vis-02: Monthly Cash Flow Grouped Bar Chart & Savings Rate Reconciliation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify Cash Flow card
    await expect(page.locator('text=Income vs Expenses (Monthly Cash Flow)').first()).toBeVisible();
    await expect(page.locator('text=Zero Double-Counting').first()).toBeVisible();

    // Verify stats row
    await expect(page.locator('text=Monthly Income').first()).toBeVisible();
    await expect(page.locator('text=Monthly Expenses').first()).toBeVisible();
    await expect(page.locator('text=Remaining Cash Flow').first()).toBeVisible();

    // Verify SVG bar chart is rendered
    const barChart = page.locator('svg[aria-label="Monthly Inflows vs Outflows Grouped Bar Chart"]');
    await expect(barChart).toBeVisible();

    // Toggle Table View on Cash Flow (button index 1)
    const tableToggle = page.getByRole('button', { name: 'Switch to accessible tabular view' }).nth(1);
    await expect(tableToggle).toBeVisible();
    await tableToggle.click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=Monthly Cash Flow Audit Ledger')).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'vis-02-cash-flow-chart.png') });
  });

  test('Vis-03: Portfolio Allocation Donut Chart & Sector Exposure Horizontal Bars', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify Portfolio Allocation card
    await expect(page.locator('text=Investment Portfolio & Asset Allocation').first()).toBeVisible();
    await expect(page.locator('text=Mark-to-Market').first()).toBeVisible();

    // Check KPI metrics
    await expect(page.locator('text=Portfolio Value').first()).toBeVisible();
    await expect(page.locator('text=Unrealized P&L').first()).toBeVisible();
    await expect(page.locator('text=Realized Capital Gains').first()).toBeVisible();

    // Verify Donut Chart distribution
    await expect(page.locator('div[aria-label="Multi-Asset Allocation Donut Chart"]').first()).toBeVisible();
    await expect(page.locator('text=Indian Equities (NSE/BSE)').first()).toBeVisible();

    // Switch to Sectors mode
    const sectorsBtn = page.locator('button:has-text("Sectors")').first();
    await expect(sectorsBtn).toBeVisible();
    await sectorsBtn.click();
    await page.waitForTimeout(300);

    // Verify Sector bars
    await expect(page.locator('text=Banking & Financial Services').first()).toBeVisible();
    await expect(page.locator('text=Technology & Cloud IT').first()).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'vis-03-portfolio-sector-exposure.png') });
  });

  test('Vis-04: Expense Intelligence Burn Radar, 30-Day Heatmap & India Tax Visualizer', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Verify Header & Cadence Switcher
    await expect(page.locator('text=Expense Intelligence & Burn Radar')).toBeVisible();
    await expect(page.locator('button:has-text("Daily")')).toBeVisible();
    await expect(page.locator('button:has-text("Monthly")')).toBeVisible();

    // Verify Cadence Velocity Bar Chart
    await expect(page.locator('text=Expense Distribution — November 2026')).toBeVisible();
    await expect(page.locator('text=Double-Entry Verified').first()).toBeVisible();

    // Verify 30-Day Spending Intensity Heatmap
    await expect(page.locator('text=30-Day Spending Intensity Heatmap (November 2026)')).toBeVisible();
    await expect(page.locator('text=Peak monthly burn occurred on 1st Nov')).toBeVisible();

    // Verify India Tax Readiness & Capital Gains Classification
    await expect(page.locator('text=India Tax Readiness & Planning')).toBeVisible();
    await expect(page.locator('text=Capital Gains Classification & Statutory Thresholds (FY 2026-27)')).toBeVisible();
    await expect(page.locator('text=LTCG (Sec 112A) — ₹1.25L Exemption Applied')).toBeVisible();
    await expect(page.locator('text=STCG (Sec 111A) — 20% Flat Rate')).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'vis-04-expense-heatmap-and-tax.png'), fullPage: true });
  });

  test('Vis-05: Debt Management Principal vs Interest Amortization & Strategy Engine', async ({ page }) => {
    await page.goto('/net-worth');
    await page.waitForLoadState('networkidle');

    // Verify Net Worth Statement
    await expect(page.locator('text=Consolidated Net Worth Statement')).toBeVisible();
    await expect(page.locator('text=Total Consolidated Net Worth')).toBeVisible();

    // Verify Debt Optimization Section
    await expect(page.locator('text=Debt Optimization & Payoff Strategy Engine')).toBeVisible();
    await expect(page.locator('button:has-text("Avalanche (Highest APR First)")')).toBeVisible();
    await expect(page.locator('button:has-text("Snowball (Lowest Balance First)")')).toBeVisible();

    // Verify Amortization Principal vs Interest Bar Chart
    await expect(page.locator('text=Housing Mortgage — Principal vs Interest Amortization')).toBeVisible();
    await expect(page.locator('svg[aria-label="Principal vs Interest Amortization Installment Bars"]')).toBeVisible();

    // Test Table Fallback on Amortization
    const amortContainer = page.locator('div:has-text("Housing Mortgage — Principal vs Interest Amortization")').first();
    const tableBtn = amortContainer.locator('button:has-text("View as Table")');
    if (await tableBtn.isVisible()) {
      await tableBtn.click();
      await page.waitForTimeout(300);
      await expect(page.locator('text=Amortization Installment Schedule (Audit Ledger)')).toBeVisible();
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'vis-05-debt-amortization-chart.png') });
  });

  test('Vis-06: Financial Health 4-Pillar Ratios with Visual Status Bars', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify Financial Health card
    await expect(page.locator('text=Financial Health & Solvency Ratios').first()).toBeVisible();
    await expect(page.locator('text=Score: 88/100').first()).toBeVisible();

    // Verify metric cards
    await expect(page.locator('text=Savings Rate').first()).toBeVisible();
    await expect(page.locator('text=Debt-to-Asset Solvency').first()).toBeVisible();
    await expect(page.locator('text=Emergency Liquidity').first()).toBeVisible();
    await expect(page.locator('text=Asset Diversification').first()).toBeVisible();

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'vis-06-financial-health-card.png') });
  });

  test('Vis-07: Responsive Mobile & Tablet Layout Validation', async ({ page }) => {
    // Test on Mobile Viewport (iPhone 14 width 390px)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify no overflowing or horizontal page clip
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(400);

    // Verify chart still readable and buttons wrap gracefully
    await expect(page.locator('text=Consolidated Net Worth').first()).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'vis-07-mobile-dashboard.png') });

    // Test on Tablet Viewport (iPad width 768px)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'vis-07-tablet-dashboard.png') });
  });
});
