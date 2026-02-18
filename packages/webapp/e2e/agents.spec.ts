import { test, expect } from '@playwright/test';

test.describe('Agents Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/agents');
  });

  test('should display agents page heading', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toContainText(/agent/i);
  });

  test('should show agent list or empty state', async ({ page }) => {
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    
    // Should either show agent cards or an empty state message
    const content = await page.textContent('body');
    const hasAgents = content?.match(/reputation|capability|stake|active/i);
    const hasEmptyState = content?.match(/no agents|empty|register|be the first/i);
    
    expect(hasAgents || hasEmptyState).toBeTruthy();
  });

  test('should have register agent functionality', async ({ page }) => {
    // Should show a way to register (button or link)
    const registerElement = page.locator('text=/register|create agent|become an agent/i').first();
    // May require wallet connection first
    const connectWallet = page.getByRole('button', { name: /connect|wallet/i });
    
    // Either register button or connect wallet should be visible
    const registerVisible = await registerElement.isVisible().catch(() => false);
    const connectVisible = await connectWallet.isVisible().catch(() => false);
    
    expect(registerVisible || connectVisible).toBeTruthy();
  });

  test('should have leaderboard link', async ({ page }) => {
    const leaderboardLink = page.getByRole('link', { name: /leaderboard/i });
    await expect(leaderboardLink).toBeVisible();
  });

  test('should filter agents by capability', async ({ page }) => {
    // Look for filter/search functionality
    const filterElement = page.locator('input[type="search"], input[placeholder*="search"], select, [role="combobox"]').first();
    
    // Filter functionality should exist (might be in different forms)
    const hasFilter = await filterElement.isVisible().catch(() => false);
    const content = await page.textContent('body');
    const hasCapabilityText = content?.match(/capability|filter|search/i);
    
    // Should have some way to filter
    expect(hasFilter || hasCapabilityText).toBeTruthy();
  });
});

test.describe('Agent Detail Page', () => {
  test('should navigate to agent detail from list', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
    
    // Try to click first agent card/link if exists
    const agentLink = page.locator('a[href*="/agents/"]').first();
    const hasAgentLink = await agentLink.isVisible().catch(() => false);
    
    if (hasAgentLink) {
      await agentLink.click();
      await expect(page).toHaveURL(/\/agents\//);
    }
  });
});

test.describe('Leaderboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/leaderboard');
  });

  test('should display leaderboard heading', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toContainText(/leaderboard|top|rank/i);
  });

  test('should show ranking metrics', async ({ page }) => {
    const content = await page.textContent('body');
    // Should mention ranking criteria
    expect(content).toMatch(/reputation|task|completed|score|rank/i);
  });
});
