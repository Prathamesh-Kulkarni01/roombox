import { test, expect } from '@playwright/test';

test.describe('RentSutra Smoke Tests', () => {
    test('Landing Page loads successfully [@smoke]', async ({ page }) => {
        await page.goto('/');
        
        // Critical elements check
        await expect(page).toHaveTitle(/RentSutra/);
        await expect(page.getByRole('link', { name: 'Login' }).first()).toBeVisible();
        await expect(page.getByText('Modern PG & Hostel Management')).toBeVisible();
    });

    test('Login Page is accessible [@smoke]', async ({ page }) => {
        await page.goto('/login');
        
        await expect(page).toHaveURL(/\/login/);
        await expect(page.getByRole('button', { name: /Login/i })).toBeVisible();
        await expect(page.getByPlaceholder(/Phone Number/i)).toBeVisible();
    });

    test('Basic SEO elements are present [@smoke]', async ({ page }) => {
        await page.goto('/');
        
        const description = await page.locator('meta[name="description"]').getAttribute('content');
        expect(description).toContain('management');
        expect(description).toContain('RentSutra');
    });
});
