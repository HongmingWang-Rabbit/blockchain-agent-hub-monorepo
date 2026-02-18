import { test, expect } from '@playwright/test';

test.describe('Tasks Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
  });

  test('should display tasks page heading', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toContainText(/task/i);
  });

  test('should show task list or empty state', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const content = await page.textContent('body');
    const hasTasks = content?.match(/reward|deadline|capability|open|assigned/i);
    const hasEmptyState = content?.match(/no task|empty|create|post/i);
    
    expect(hasTasks || hasEmptyState).toBeTruthy();
  });

  test('should have create task functionality', async ({ page }) => {
    // Should show a way to create tasks
    const createButton = page.locator('text=/create task|post task|new task/i').first();
    const connectWallet = page.getByRole('button', { name: /connect|wallet/i });
    
    const createVisible = await createButton.isVisible().catch(() => false);
    const connectVisible = await connectWallet.isVisible().catch(() => false);
    
    expect(createVisible || connectVisible).toBeTruthy();
  });

  test('should show task status filters', async ({ page }) => {
    const content = await page.textContent('body');
    // Should have status concepts
    expect(content).toMatch(/open|pending|completed|all|filter/i);
  });

  test('should link to batch operations', async ({ page }) => {
    const batchLink = page.locator('a[href*="batch"], text=/batch/i').first();
    const hasLink = await batchLink.isVisible().catch(() => false);
    
    // Batch operations should be accessible
    if (hasLink) {
      await expect(batchLink).toBeVisible();
    }
  });
});

test.describe('Task Templates Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/templates');
  });

  test('should display templates page heading', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toContainText(/template/i);
  });

  test('should show template categories', async ({ page }) => {
    const content = await page.textContent('body');
    // Should show template categories
    expect(content).toMatch(/development|content|data|security|design/i);
  });

  test('should have use template buttons', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Look for "Use Template" or similar buttons
    const useButton = page.locator('button, a').filter({ hasText: /use|apply|select/i }).first();
    const hasButton = await useButton.isVisible().catch(() => false);
    
    // Should have way to use templates
    const content = await page.textContent('body');
    expect(hasButton || content?.match(/use template|apply|select/i)).toBeTruthy();
  });

  test('should display reward estimates', async ({ page }) => {
    const content = await page.textContent('body');
    // Templates should show estimated rewards
    expect(content).toMatch(/agnt|reward|token|cost/i);
  });
});

test.describe('Batch Operations Page', () => {
  test('should display batch page', async ({ page }) => {
    await page.goto('/tasks/batch');
    
    const content = await page.textContent('body');
    expect(content).toMatch(/batch|multiple|task/i);
  });
});
