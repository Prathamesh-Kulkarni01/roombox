import { test, expect } from '@playwright/test';
import { loginWorkflow } from '../../../workflows/authWorkflow';
import { RUN_ID } from '../../../test-utils';

/**
 * Authentication - Sign Up (Owner Only) (@e2e)
 * Verifies that the signup barrier is active and only Owners can create accounts.
 */
test.describe('Authentication - Sign Up Flow', () => {

    test('Signup page shows owner-only branding', async ({ page }) => {
        console.log('[Auth Signup] Step 1: Navigating to signup...');
        await page.goto('/signup');
        await expect(page.getByRole('heading', { name: /Owner Sign Up/i })).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/Tenants are added by owners/i)).toBeVisible();
        console.log('[Auth Signup] Verified: Branding is owner-centric.');
    });

    test('Owner account creation flow', async ({ page }) => {
        const uniqueEmail = `playwright_owner_${Date.now()}_${RUN_ID}@rentsutra.com`;
        const password = 'testpassword123';

        console.log(`[Auth Signup] Step 2: Attempting signup for ${uniqueEmail}...`);
        await page.goto('/signup');

        await page.fill('input[type="email"]', uniqueEmail);
        await page.fill('input[type="password"]', password);

        await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeEnabled();
        await page.getByRole('button', { name: 'Sign Up', exact: true }).click();

        await expect(page).toHaveURL(/.*(complete-profile|dashboard)/, { timeout: 15000 });
        console.log('[Auth Signup] Verified: Owner successfully reached profile completion.');
    });

    test('Barrier Check: Tenant self-signup is blocked', async ({ page }) => {
        console.log('[Auth Signup] Step 3: Verifying tenant signup barrier...');
        await page.goto('/complete-profile');

        const tenantBtn = page.getByRole('button', { name: /Renting a room/i });
        await expect(tenantBtn).not.toBeVisible({ timeout: 10000 });

        await expect(page.getByText(/Tenant accounts are created by your property owner/i)).toBeVisible();
        console.log('[Auth Signup] Verified: Tenant self-signup button is removed.');
    });
});
