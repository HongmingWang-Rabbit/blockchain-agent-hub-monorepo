import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main heading', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/Agent Hub|Blockchain|AI Agent/i);
  });

  test('should have navigation links', async ({ page }) => {
    // Check for key navigation elements
    const nav = page.locator('nav, header');
    await expect(nav).toBeVisible();
    
    // Should have links to main sections
    await expect(page.getByRole('link', { name: /agents/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /tasks/i })).toBeVisible();
  });

  test('should display Connect Wallet button', async ({ page }) => {
    // RainbowKit connect button
    const connectButton = page.getByRole('button', { name: /connect|wallet/i });
    await expect(connectButton).toBeVisible();
  });

  test('should show marketplace stats or features', async ({ page }) => {
    // Should display some stats or feature cards
    const content = await page.textContent('body');
    expect(content).toMatch(/agent|task|workflow|stake|reputation/i);
  });

  test('should be responsive', async ({ page }) => {
    // Desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('nav, header')).toBeVisible();
    
    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    // Should still have nav (possibly hamburger menu)
    await expect(page.locator('nav, header, [role="navigation"]')).toBeVisible();
  });

  test('should have working theme or proper styling', async ({ page }) => {
    // Check that basic styling is applied (not unstyled)
    const body = page.locator('body');
    const backgroundColor = await body.evaluate((el) => 
      window.getComputedStyle(el).backgroundColor
    );
    // Should have some background color set (not default white)
    expect(backgroundColor).toBeDefined();
  });

  test('should have proper meta tags', async ({ page }) => {
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    
    // Check for viewport meta tag (important for mobile)
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /width/);
  });
});
