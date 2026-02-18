import { test, expect } from '@playwright/test';

test.describe('Workflows Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workflows');
  });

  test('should display workflows page heading', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toContainText(/workflow/i);
  });

  test('should explain workflow concept', async ({ page }) => {
    const content = await page.textContent('body');
    // Should explain multi-step workflows
    expect(content).toMatch(/step|multi|chain|sequence|compose/i);
  });

  test('should show create workflow option', async ({ page }) => {
    const createButton = page.locator('text=/create workflow|new workflow/i').first();
    const connectWallet = page.getByRole('button', { name: /connect|wallet/i });
    
    const createVisible = await createButton.isVisible().catch(() => false);
    const connectVisible = await connectWallet.isVisible().catch(() => false);
    
    expect(createVisible || connectVisible).toBeTruthy();
  });

  test('should show workflow list or examples', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const content = await page.textContent('body');
    const hasWorkflows = content?.match(/budget|progress|step|pending|completed/i);
    const hasEmptyState = content?.match(/no workflow|empty|create your first/i);
    
    expect(hasWorkflows || hasEmptyState).toBeTruthy();
  });
});

test.describe('Governance Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/governance');
  });

  test('should display governance page heading', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toContainText(/governance|proposal|vote/i);
  });

  test('should explain governance mechanics', async ({ page }) => {
    const content = await page.textContent('body');
    // Should mention DAO/governance concepts
    expect(content).toMatch(/proposal|vote|quorum|treasury|token holder/i);
  });

  test('should show proposal list or create option', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const content = await page.textContent('body');
    // Should show proposals or how to create them
    expect(content).toMatch(/proposal|active|pending|create|vote/i);
  });
});

test.describe('Cross-Chain Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cross-chain');
  });

  test('should display cross-chain page heading', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toContainText(/cross.*chain|multi.*chain|discover/i);
  });

  test('should explain cross-chain functionality', async ({ page }) => {
    const content = await page.textContent('body');
    // Should mention cross-chain concepts
    expect(content).toMatch(/chain|broadcast|remote|sync|discover/i);
  });

  test('should show supported chains', async ({ page }) => {
    const content = await page.textContent('body');
    // Should mention chain names
    expect(content).toMatch(/hashkey|ethereum|polygon|arbitrum|chain/i);
  });
});

test.describe('Analytics Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analytics');
  });

  test('should display analytics page heading', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toContainText(/analytics|stats|dashboard|metrics/i);
  });

  test('should show marketplace metrics', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const content = await page.textContent('body');
    // Should show key metrics
    expect(content).toMatch(/agent|task|total|active|volume/i);
  });

  test('should have visual charts or graphs', async ({ page }) => {
    // Look for chart elements or SVG graphics
    const charts = page.locator('svg, canvas, [class*="chart"], [class*="graph"]');
    const chartsCount = await charts.count();
    
    // Should have some visualizations
    const content = await page.textContent('body');
    expect(chartsCount > 0 || content?.match(/trend|growth|history/i)).toBeTruthy();
  });
});
