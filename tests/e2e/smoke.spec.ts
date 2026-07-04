import { test, expect } from '@playwright/test';

test('App loads successfully @smoke', async ({ page }) => {
  await page.goto('/');
  // Basic assertion to ensure the page loads
  await expect(page.locator('body')).toBeVisible();
});
