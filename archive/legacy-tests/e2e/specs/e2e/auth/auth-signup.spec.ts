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

    test('Owner account creation and setup flow', async ({ page }) => {
        // Enable browser console logging for better debugging
        page.on('console', msg => {
            if (msg.type() === 'error' || msg.text().includes('[StoreProvider]') || msg.text().includes('[Onboarding]')) {
                console.log(`[Browser] ${msg.type().toUpperCase()}: ${msg.text()}`);
            }
        });

        const uniqueEmail = `playwright_owner_${Date.now()}_${RUN_ID}@rentsutra.com`;
        const password = 'testpassword123';

        console.log(`[Auth Signup] Step 1: Attempting signup for ${uniqueEmail}...`);
        await page.goto('/signup');

        await page.fill('input[type="email"]', uniqueEmail);
        await page.fill('input[type="password"]', password);

        await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeEnabled();
        await page.getByRole('button', { name: 'Sign Up', exact: true }).click();

        await expect(page).toHaveURL(/.*(complete-profile)/, { timeout: 20000 });
        console.log('[Auth Signup] Verified: Owner successfully reached profile completion.');

        // Step 2: ROLE step
        console.log('[Auth Signup] Step 2: Selecting Owner role...');
        await expect(page.getByRole('heading', { name: /Design your/i })).toBeVisible({ timeout: 10000 });
        await page.locator('h3:has-text("Owner")').click();

        // Step 3: PROFILE step
        console.log('[Auth Signup] Step 3: Filling profile details...');
        await expect(page.getByText(/About You/i)).toBeVisible({ timeout: 10000 });
        await page.getByPlaceholder(/e.g. John Doe/i).fill('Test Owner');
        await page.getByPlaceholder(/e.g. 9876543210/i).fill('9999999999');
        await page.getByRole('button', { name: /Continue/i }).click();

        // Step 4: BASICS step
        console.log('[Auth Signup] Step 4: Filling property basics...');
        await expect(page.getByText(/Identity & Presence/i)).toBeVisible({ timeout: 10000 });
        await page.getByPlaceholder(/e.g., Skyview Luxury Residency/i).fill(`Auto PG ${RUN_ID}`);
        await page.getByPlaceholder(/e.g. Pune/i).fill('TestCity');
        await page.getByPlaceholder(/e.g. Opposite Phoenix Mall/i).fill('123 Test Street');
        await page.getByRole('button', { name: /Configure Layout/i }).click();

        // Step 5: LAYOUT step
        console.log('[Auth Signup] Step 5: Configuring smart layout...');
        await expect(page.getByText(/Smart Architecture/i)).toBeVisible({ timeout: 10000 });
        // Use a preset to make it easy
        await page.getByRole('button', { name: /Small PG/i }).click();
        await page.getByRole('button', { name: /Final Review/i }).click();

        // Step 6: REVIEW step
        console.log('[Auth Signup] Step 6: Final review and launch...');
        await expect(page.getByText(/Systems Check/i)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(`Auto PG ${RUN_ID}`)).toBeVisible();
        
        await page.getByRole('button', { name: /LAUNCH DASHBOARD/i }).click();

        // Step 7: Verify Dashboard
        console.log('[Auth Signup] Step 7: Waiting for dashboard redirection...');
        await expect(page).toHaveURL(/.*dashboard/, { timeout: 20000 });
        await expect(page.getByText(/Dashboard/i).first()).toBeVisible({ timeout: 15000 });
        
        console.log('[Auth Signup] Success: Full onboarding flow completed.');
    });

    test('Barrier Check: Tenant self-signup is blocked', async ({ page }) => {
        console.log('[Auth Signup] Step 3: Verifying tenant signup barrier...');
        await page.goto('/complete-profile');

        const tenantCard = page.locator('h3:has-text("Tenant")');
        await expect(tenantCard).toBeVisible({ timeout: 10000 });

        await expect(page.getByText(/Access requires an invitation/i)).toBeVisible();
        console.log('[Auth Signup] Verified: Tenant self-signup is correctly marked as invite-only.');
    });
});
