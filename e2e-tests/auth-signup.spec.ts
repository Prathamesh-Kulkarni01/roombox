import { test, expect } from '@playwright/test';

/**
 * AUTH - SIGNUP PAGE TESTS
 * The /signup page is now OWNER ONLY.
 * Tenants cannot self-register — they are onboarded by their property owner.
 */

test.describe('Authentication - Sign Up (Owner Only)', () => {

    test('Signup page shows owner-only title and description', async ({ page }) => {
        await page.goto('/signup');
        await expect(page.getByRole('heading', { name: /Owner Sign Up/i })).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/Tenants are added by owners/i)).toBeVisible();
    });

    test('Owner can create a new account using the password form', async ({ page }) => {
        const uniqueEmail = `playwright_owner_${Date.now()}@rentsutra.com`;
        const password = 'testpassword123';

        await page.goto('/signup');

        await page.fill('input[type="email"]', uniqueEmail);
        await page.fill('input[type="password"]', password);

        await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeEnabled();
        await page.getByRole('button', { name: 'Sign Up', exact: true }).click();

        // After signup, unassigned user gets redirected to complete-profile (owner setup only)
        await expect(page).toHaveURL(/.*(complete-profile|dashboard)/, { timeout: 15000 });

        // If on complete-profile, only the owner button should be present — NOT a tenant button
        if (page.url().includes('complete-profile')) {
            await expect(page.getByRole('button', { name: /Property Owner/i })).toBeVisible({ timeout: 10000 });
            // Renting a room button must NOT exist
            await expect(page.getByRole('button', { name: /Renting a room/i })).not.toBeVisible();
            // Info text for tenants should be shown instead
            await expect(page.getByText(/Tenant accounts are created by your property owner/i)).toBeVisible();
        }
    });

    test('Tenant cannot self-signup — no tenant option on complete-profile', async ({ page }) => {
        await page.goto('/complete-profile');

        // The "Renting a room" button should NOT be present
        await expect(page.getByRole('button', { name: /Renting a room/i })).not.toBeVisible({ timeout: 10000 });

        // Instead an informational message should be displayed
        await expect(page.getByText(/Tenant accounts are created by your property owner/i)).toBeVisible();
    });

    test('Tenant phone login is blocked if not added by owner', async ({ page }) => {
        const unknownPhone = '9000000001';

        await page.goto('/login');
        await expect(page.getByText(/Welcome Back/i)).toBeVisible({ timeout: 15000 });

        // Switch to OTP mode on tenant tab
        const tenantTab = page.getByRole('tab', { name: /Staff \/ Tenant/i });
        await tenantTab.click();

        // If not already on OTP mode, switch to it
        const switchToOtpBtn = page.getByRole('button', { name: /Back to OTP Login/i });
        if (await switchToOtpBtn.isVisible()) {
            await switchToOtpBtn.click();
        }

        const phoneInput = page.locator('#phone');
        await expect(phoneInput).toBeVisible({ timeout: 10000 });
        await phoneInput.fill(unknownPhone);

        await page.getByRole('button', { name: /Send OTP/i }).click();

        // Should show a blocking error — not added by owner
        await expect(page.getByText(/not added to any property|contact your property owner/i)).toBeVisible({ timeout: 10000 });
    });
});
