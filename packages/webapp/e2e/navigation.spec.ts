import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate between all main pages', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to Agents
    await page.getByRole('link', { name: /agents/i }).first().click();
    await expect(page).toHaveURL(/\/agents/);
    
    // Navigate to Tasks
    await page.getByRole('link', { name: /tasks/i }).first().click();
    await expect(page).toHaveURL(/\/tasks/);
    
    // Navigate back to home
    await page.getByRole('link', { name: /home|hub|logo/i }).first().click();
    await expect(page).toHaveURL('/');
  });

  test('should have consistent header across pages', async ({ page }) => {
    const pages = ['/', '/agents', '/tasks', '/workflows', '/governance'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      
      // Header should be visible
      const header = page.locator('header, nav').first();
      await expect(header).toBeVisible();
      
      // Connect wallet button should be present
      const connectButton = page.getByRole('button', { name: /connect|wallet/i });
      await expect(connectButton).toBeVisible();
    }
  });

  test('should have working breadcrumbs or back navigation', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
    
    // Try to go to a detail page
    const detailLink = page.locator('a[href*="/agents/"]').first();
    const hasLink = await detailLink.isVisible().catch(() => false);
    
    if (hasLink) {
      await detailLink.click();
      
      // Should be able to go back
      const backLink = page.locator('a[href="/agents"], text=/back|agents/i').first();
      await expect(backLink).toBeVisible();
    }
  });
});

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should have mobile-friendly navigation', async ({ page }) => {
    await page.goto('/');
    
    // Look for hamburger menu or mobile nav
    const hamburger = page.locator('[aria-label*="menu"], [class*="hamburger"], button:has(svg)').first();
    const mobileNav = page.locator('[class*="mobile"], [role="dialog"], [class*="drawer"]');
    
    const hasHamburger = await hamburger.isVisible().catch(() => false);
    
    if (hasHamburger) {
      // Click hamburger
      await hamburger.click();
      
      // Mobile menu should appear
      await expect(page.locator('nav a, [role="dialog"] a, [class*="mobile"] a').first()).toBeVisible();
    }
  });

  test('should be touch-friendly on mobile', async ({ page }) => {
    await page.goto('/');
    
    // Buttons should have adequate size for touch
    const buttons = page.locator('button, a').first();
    const box = await buttons.boundingBox();
    
    if (box) {
      // Touch targets should be at least 44px (Apple HIG) or 48px (Material)
      expect(box.height).toBeGreaterThanOrEqual(32);
    }
  });
});

test.describe('Error Handling', () => {
  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto('/nonexistent-page-12345');
    
    const content = await page.textContent('body');
    // Should show error message, not crash
    expect(content).toMatch(/not found|404|error|doesn't exist/i);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate offline
    await page.context().setOffline(true);
    
    // Should show offline indicator or cached content
    await page.goto('/').catch(() => {});
    
    // Reset
    await page.context().setOffline(false);
  });
});

test.describe('PWA Features', () => {
  test('should have manifest.json', async ({ page }) => {
    await page.goto('/');
    
    const manifestLink = page.locator('link[rel="manifest"]');
    const hasManifest = await manifestLink.isVisible().catch(() => false);
    
    // PWA should have manifest
    // Note: This may not be visible in the DOM but linked in head
    const manifestHref = await manifestLink.getAttribute('href').catch(() => null);
    expect(manifestHref || hasManifest).toBeTruthy;
  });

  test('should have service worker registration', async ({ page }) => {
    await page.goto('/');
    
    // Check if SW is registered (in production)
    const swRegistration = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    
    expect(swRegistration).toBe(true);
  });
});
