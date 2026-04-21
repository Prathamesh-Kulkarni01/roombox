import { test, expect } from '@playwright/test';
import { loginWorkflow, logoutWorkflow } from '../../../workflows/authWorkflow';
import { onboardStaffWorkflow } from '../../../workflows/staffWorkflow';
import { wipeOwnerData } from '../../../api/cleanup';
import { OWNER_EMAIL, OWNER_ID, RUN_ID } from '../../../test-utils';

/**
 * Staff Management Lifecycle (@e2e)
 * Verified via UI orchestration and high-speed API cleanup.
 */
test.describe('Staff Management Lifecycle', () => {
    const TEST_STAFF_PHONE = `88888${RUN_ID}`;
    const TEST_STAFF_NAME = `Staff ${RUN_ID}`;

    test.beforeEach(async ({ page }) => {
        console.log(`[Staff Mgmt] Starting test setup for ${TEST_STAFF_NAME}`);
        await loginWorkflow(page, OWNER_EMAIL);
        // Ensure clean state before start
        await wipeOwnerData(OWNER_ID);
    });

    test('Complete Staff Workflow: Add -> Permission -> Login -> Delete', async ({ page }) => {
        // 1. ADD STAFF
        console.log('[Staff Mgmt] Step 1: Adding staff via workflow...');
        await onboardStaffWorkflow(page, {
            name: TEST_STAFF_NAME,
            phone: TEST_STAFF_PHONE,
            role: 'manager',
            salary: '25000'
        });

        // 2. VERIFY IN UI
        console.log('[Staff Mgmt] Step 2: Verifying staff in dashboard table...');
        await page.goto('/dashboard/staff');
        await expect(page.locator('table')).toContainText(TEST_STAFF_NAME, { timeout: 15000 });

        // 3. EDIT PERMISSIONS
        console.log('[Staff Mgmt] Step 3: Updating permissions...');
        const staffRow = page.locator('tr', { hasText: TEST_STAFF_NAME }).first();
        await staffRow.locator('button').filter({ has: page.locator('.sr-only:text("Toggle menu")') }).click();
        await page.getByRole('menuitem', { name: /Permissions/i }).click();
        
        await expect(page.getByRole('heading', { name: /Manage Permissions/i })).toBeVisible({ timeout: 10000 });
        await page.getByLabel('View Guest Details').click();
        await page.getByRole('button', { name: 'Save Permissions' }).click();
        
        await expect(page.getByRole('heading', { name: /Manage Permissions/i })).not.toBeVisible();
        console.log('[Staff Mgmt] Permissions updated successfully.');

        // 4. VERIFY STAFF LOGIN (Integration check)
        console.log('[Staff Mgmt] Step 4: Verifying staff login capability...');
        await logoutWorkflow(page);
        await loginWorkflow(page, TEST_STAFF_PHONE, undefined, { otp: true });
        
        await expect(page.getByRole('heading', { name: /Dashboard/i }).first()).toBeVisible();
        console.log('[Staff Mgmt] Staff logged in successfully.');

        // 5. CLEANUP / DELETE
        console.log('[Staff Mgmt] Step 5: Deleting staff for cleanup...');
        await logoutWorkflow(page);
        await loginWorkflow(page, OWNER_EMAIL);
        await page.goto('/dashboard/staff');
        
        const rowToDelete = page.locator('tr', { hasText: TEST_STAFF_NAME }).first();
        await rowToDelete.locator('button').filter({ has: page.locator('.sr-only:text("Toggle menu")') }).click();
        
        page.once('dialog', d => d.accept());
        await page.getByRole('menuitem', { name: /Delete/i }).click();

        await expect(page.locator('table')).not.toContainText(TEST_STAFF_NAME, { timeout: 15000 });
        console.log('[Staff Mgmt] Lifecycle verified and cleaned.');
    });
});
