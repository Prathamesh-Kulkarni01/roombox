import { test, expect } from '@playwright/test';
import { loginWorkflow, logoutWorkflow } from '../../workflows/authWorkflow';
import { onboardStaffWorkflow } from '../../workflows/staffWorkflow';
import { createPropertyWorkflow } from '../../workflows/propertyWorkflow';
import { wipeOwnerData } from '../../api/cleanup';
import { OWNER_EMAIL, OWNER_ID, RUN_ID } from '../../test-utils';

/**
 * Complex Permission Management (@integration)
 * Validates the dynamic permission matrix by switching roles and verifying sidebar visibility.
 */
test.describe('Complex Permission Matrix', () => {
    const TEST_PHONE = `99999${RUN_ID}`;
    const TEST_NAME = `Perm Tester ${RUN_ID}`;

    test.beforeEach(async ({ page }) => {
        console.log(`[RBAC Matrix] Starting setup for ${TEST_NAME}`);
        await loginWorkflow(page, OWNER_EMAIL);
        await wipeOwnerData(OWNER_ID);
        
        // 1. Ensure a property exists
        await createPropertyWorkflow(page, { name: `Perm PG ${RUN_ID}`, location: 'Matrix St', city: 'Auto' });
        
        // 2. Create the test staff
        await onboardStaffWorkflow(page, { name: TEST_NAME, phone: TEST_PHONE, role: 'manager' });
    });

    test('Logic Cluster: Financial Accountant Profile (View Finances Only)', async ({ page, context }) => {
        console.log('[RBAC Matrix] Step 1: Configuring Accountant profile (Finances=ON, Others=OFF)...');
        await page.goto('/dashboard/staff');
        await page.locator('tr').filter({ hasText: TEST_NAME }).first().click(); // Go to profile
        
        await page.getByRole('button', { name: /Edit Granularly/i }).click();
        
        // Turn everything OFF first
        const switches = await page.getByRole('switch').all();
        for (const sw of switches) {
            if (await sw.getAttribute('aria-checked') === 'true') await sw.click();
        }
        
        // Turn ON View Finances
        await page.getByRole('switch', { name: /View passbook & expenses/i }).click();
        await page.getByRole('button', { name: /Save Changes/i }).click();
        
        console.log('[RBAC Matrix] Step 2: Retrieving logic code for staff login...');
        await page.getByRole('button', { name: /Generate Magic Link|Regenerate Magic Link/i }).click();
        const inviteCode = await page.locator('span').filter({ hasText: /^[0-9]{6}$/ }).first().innerText();
        await page.getByRole('button', { name: 'Close' }).click();

        // 3. Verify as Staff
        console.log('[RBAC Matrix] Step 3: Verifying Accountant profile in a fresh context...');
        const staffCtx = await context.browser().newContext();
        const staffPage = await staffCtx.newPage();
        
        await staffPage.goto('/login');
        await staffPage.getByRole('tab', { name: /Staff \/ Tenant/i }).click();
        await staffPage.getByRole('button', { name: /Use Setup Code/i }).click();
        await staffPage.getByLabel('Phone Number').fill(TEST_PHONE);
        await staffPage.getByLabel('6-Digit Setup Code').fill(inviteCode);
        await staffPage.getByRole('button', { name: 'Verify & Log In' }).click();
        
        await staffPage.waitForURL(/.*dashboard/);
        
        // Sidebar Audit
        const sidebar = staffPage.locator('aside').first();
        await expect(sidebar.getByRole('link', { name: /Rent Tracker|Passbook/i })).toBeVisible();
        await expect(sidebar.getByRole('link', { name: /Guests|Properties/i })).not.toBeVisible();
        
        console.log('[RBAC Matrix] Verified: Accountant profile successfully enforced.');
        await staffPage.close();
        await staffCtx.close();
    });
});
