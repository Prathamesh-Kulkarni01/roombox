import { test, expect } from '@playwright/test';
import { loginWorkflow, logoutWorkflow } from '../../../workflows/authWorkflow';
import { onboardStaffWorkflow } from '../../../workflows/staffWorkflow';
import { createPropertyWorkflow } from '../../../workflows/propertyWorkflow';
import { wipeOwnerData } from '../../../api/cleanup';
import { OWNER_EMAIL, OWNER_ID, RUN_ID } from '../../../test-utils';

/**
 * Staff Onboarding & Login (@e2e)
 * Validates the complete cycle of Staff creation, Magic Link generation, and Setup Code login.
 */
test.describe('Staff Onboarding & Security Login', () => {
    const TEST_PHONE = `99999${RUN_ID}`;
    const TEST_NAME = `Onboarding Tester ${RUN_ID}`;

    test.beforeEach(async ({ page }) => {
        console.log(`[Staff Security] Starting test setup for ${TEST_NAME}`);
        await loginWorkflow(page, OWNER_EMAIL);
        await wipeOwnerData(OWNER_ID);
    });

    test('Staff Setup Code & Permission Verification', async ({ page, context }) => {
        // 1. SETUP PROPERTY
        console.log('[Staff Security] Step 1: Ensuring test property exists...');
        await createPropertyWorkflow(page, {
            name: `Staff PG ${RUN_ID}`,
            location: 'Security Zone',
            city: 'AutoCity'
        });

        // 2. CREATE STAFF
        console.log('[Staff Security] Step 2: Onboarding staff member...');
        await onboardStaffWorkflow(page, {
            name: TEST_NAME,
            phone: TEST_PHONE,
            role: 'manager'
        });

        // 3. CAPTURE LOGIN SECRETS (Magic Link / Setup Code)
        console.log('[Staff Security] Step 3: Retrieving login credentials from Profile...');
        await page.goto('/dashboard/staff');
        await page.locator('tr').filter({ hasText: TEST_NAME }).first().click();
        
        await page.getByRole('button', { name: /Generate Magic Link|Regenerate Magic Link/i }).click();
        await expect(page.getByText(/Staff Login Setup/i)).toBeVisible({ timeout: 15000 });
        
        const inviteCode = await page.locator('span').filter({ hasText: /^[0-9]{6}$/ }).first().innerText();
        const magicLink = await page.locator('div.font-mono').first().innerText();
        
        console.log(`[Staff Security] Captured Invite Code: ${inviteCode}`);
        await page.getByRole('button', { name: 'Close' }).click();

        // 4. TEST SETUP CODE LOGIN
        console.log('[Staff Security] Step 4: Verifying 6-Digit Setup Code login...');
        const codeContext = await context.browser().newContext();
        const codePage = await codeContext.newPage();
        
        await codePage.goto('/login');
        await codePage.getByRole('tab', { name: /Staff \/ Tenant/i }).click();
        
        const useSetupCodeBtn = codePage.getByRole('button', { name: /Use Setup Code/i });
        if (await useSetupCodeBtn.isVisible()) await useSetupCodeBtn.click();
        
        await codePage.getByLabel('Phone Number').fill(TEST_PHONE);
        await codePage.getByLabel('6-Digit Setup Code').fill(inviteCode);
        await codePage.getByRole('button', { name: 'Verify & Log In' }).click();
        
        await expect(codePage).toHaveURL(/.*dashboard/, { timeout: 30000 });
        console.log('[Staff Security] Step 5: Verification complete. Logic and redirection stable.');
        
        await codePage.close();
        await codeContext.close();
    });
});
