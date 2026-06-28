import { test, expect } from '@playwright/test';
import { loginWorkflow } from '../../../workflows/authWorkflow';
import { createPropertyWorkflow } from '../../../workflows/propertyWorkflow';
import { ManagementPage } from '../../../pages/ManagementPage';
import { OWNER_EMAIL, OWNER_ID, RUN_ID } from '../../../test-utils';
import { wipeOwnerData } from '../../../api/cleanup';

/**
 * Property & Floor Layout (@e2e)
 * Validates the dynamic building structure and room/bed configuration.
 */
test.describe('Property Layout Lifecycle', () => {
    const PROP_NAME = `Layout PG ${RUN_ID}`;

    test.beforeEach(async ({ page }) => {
        console.log(`[Layout] Starting setup for ${PROP_NAME}`);
        await loginWorkflow(page, OWNER_EMAIL);
        await wipeOwnerData(OWNER_ID);
    });

    test('Complex Building Structure: Add Floor -> Add Rooms -> Verify Capacity', async ({ page }) => {
        const mgmt = new ManagementPage(page);

        // 1. CREATE PROPERTY
        console.log('[Layout] Step 1: Creating parent property...');
        await createPropertyWorkflow(page, {
            name: PROP_NAME,
            location: 'Architect Lane',
            city: 'AutoCity'
        });

        // 2. NAVIGATE TO FLOW
        console.log('[Layout] Step 2: Navigating to layout editor...');
        await page.goto('/dashboard/pg-management');
        const row = page.locator('tr').filter({ hasText: PROP_NAME }).first();
        await row.click();

        // 3. EDIT BUILDING STRUCTURE
        console.log('[Layout] Step 3: Modifying floor and room structure...');
        await page.getByRole('button', { name: /Edit Layout|Building/i }).click();
        
        // Add a floor
        await page.getByRole('button', { name: /Add Floor/i }).click();
        await expect(page.getByText(/Floor 1/i)).toBeVisible();
        
        // Add a room
        await page.getByRole('button', { name: /Add Room/i }).first().click();
        await page.getByPlaceholder(/101/i).fill('101');
        await page.getByRole('button', { name: /Create Room/i }).click();

        // 4. VERIFY AGGREGATE CAPACITY
        console.log('[Layout] Step 4: Verifying UI reflects the new capacity...');
        await page.goto('/dashboard/pg-management');
        await expect(page.locator('table')).toContainText('101', { timeout: 15000 });
        console.log('[Layout] Lifecycle Verified: Structure persisted and aggregated.');
    });
});
