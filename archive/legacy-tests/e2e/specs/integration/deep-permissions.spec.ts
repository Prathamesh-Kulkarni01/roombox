import { test, expect } from '@playwright/test';
import { loginWorkflow, logoutWorkflow } from '../../workflows/authWorkflow';
import { onboardStaffWorkflow } from '../../workflows/staffWorkflow';
import { wipeOwnerData } from '../../api/cleanup';
import { OWNER_EMAIL, OWNER_ID, RUN_ID } from '../../test-utils';

/**
 * Deep Permissions & Access Control (@integration)
 * Validates the vertical enforcement of staff permissions across UI and Routes.
 */
test.describe('Deep Permissions Enforcement', () => {
    const STAFF_PHONE = `88888${RUN_ID}`;
    const STAFF_NAME = `Deep Perms Staff ${RUN_ID}`;

    test.beforeEach(async ({ page }) => {
        console.log(`[RBAC Security] Starting setup for ${STAFF_NAME}`);
        await loginWorkflow(page, OWNER_EMAIL);
        await wipeOwnerData(OWNER_ID);
        
        // Setup the staff member once
        await onboardStaffWorkflow(page, {
            name: STAFF_NAME,
            phone: STAFF_PHONE,
            role: 'manager'
        });
    });

    test('Sidebar Visibility: Revoked Financials should hide UI and block routes', async ({ page }) => {
        console.log('[RBAC Security] Step 1: Revoking Financials permission as Owner...');
        await page.goto('/dashboard/staff');
        const row = page.locator('tr').filter({ hasText: STAFF_NAME }).first();
        await row.locator('button').filter({ has: page.locator('.sr-only:text("Toggle menu")') }).click();
        await page.getByRole('menuitem', { name: /Permissions/i }).click();

        // Toggle Financials OFF
        const financialsToggle = page.locator('#finances-view'); // Using IDs for reliability
        if (await financialsToggle.getAttribute('aria-checked') === 'true') {
            await financialsToggle.click();
        }
        await page.getByRole('button', { name: /Save Permissions/i }).click();
        await expect(page.getByText(/Permissions Updated/i)).toBeVisible();

        // Verify as Staff
        console.log('[RBAC Security] Step 2: Verifying UI restrictions as Staff member...');
        await logoutWorkflow(page);
        await loginWorkflow(page, STAFF_PHONE, undefined, { otp: true });
        
        await page.waitForTimeout(2000); 
        await expect(page.locator('nav')).not.toContainText(/Passbook|Expenses/i);
        
        console.log('[RBAC Security] Step 3: Verifying direct route protection...');
        await page.goto('/dashboard/expense');
        await expect(page).toHaveURL(/.*dashboard(?!\/expense)/, { timeout: 10000 });
        
        console.log('[RBAC Security] Verified: Sidebar and Direct Routes are both protected.');
    });

    test('Action Restriction: View-Only Staff cannot see Add buttons', async ({ page }) => {
        console.log('[RBAC Security] Step 4: Revoking Add Guest permission...');
        await page.goto('/dashboard/staff');
        const row = page.locator('tr').filter({ hasText: STAFF_NAME }).first();
        await row.locator('button').filter({ has: page.locator('.sr-only:text("Toggle menu")') }).click();
        await page.getByRole('menuitem', { name: /Permissions/i }).click();

        const guestsAdd = page.locator('#guests-add');
        if (await guestsAdd.getAttribute('aria-checked') === 'true') {
            await guestsAdd.click();
        }
        await page.getByRole('button', { name: /Save Permissions/i }).click();

        // Verify as Staff
        console.log('[RBAC Security] Step 5: Verifying Add button removal...');
        await logoutWorkflow(page);
        await loginWorkflow(page, STAFF_PHONE, undefined, { otp: true });
        
        await page.goto('/dashboard/tenant-management');
        await expect(page.getByRole('button', { name: /Add|New/i })).not.toBeVisible();
        
        console.log('[RBAC Security] Verified: Specific UI actions are correctly restricted.');
    });
});
