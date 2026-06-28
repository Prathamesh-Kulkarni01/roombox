import { test, expect } from '@playwright/test';
import { loginWorkflow } from '../../../workflows/authWorkflow';
import { createPropertyWorkflow } from '../../../workflows/propertyWorkflow';
import { onboardTenantWorkflow } from '../../../workflows/tenantWorkflow';
import { wipeOwnerData } from '../../../api/cleanup';
import { OWNER_EMAIL, OWNER_ID, RUN_ID } from '../../../test-utils';

/**
 * Manual Payment Lifecycle (@e2e)
 * Validates the flow of recording a cash payment and verifying the ledger/passbook.
 */
test.describe('Manual Payment Lifecycle', () => {
    const TENANT_NAME = `Payer ${RUN_ID}`;
    const TENANT_PHONE = `77777${RUN_ID}`;

    test.beforeEach(async ({ page }) => {
        console.log(`[Payment] Starting setup for ${TENANT_NAME}`);
        await loginWorkflow(page, OWNER_EMAIL);
        await wipeOwnerData(OWNER_ID);
        
        // Setup environment
        await createPropertyWorkflow(page, { name: `PG ${RUN_ID}`, location: 'Cash St', city: 'Auto' });
        await onboardTenantWorkflow(page, { name: TENANT_NAME, phone: TENANT_PHONE, pgName: `PG ${RUN_ID}`, rent: '5000' });
    });

    test('Record Cash Payment -> Verify Passbook Entry', async ({ page }) => {
        console.log('[Payment] Step 1: Navigating to Rent Tracker...');
        await page.goto('/dashboard/rent-tracker');
        
        // Find tenant and record payment
        const row = page.locator('tr').filter({ hasText: TENANT_PHONE }).first();
        await row.getByRole('button', { name: /Record|Pay/i }).click();

        console.log('[Payment] Step 2: Filling payment dialog...');
        const dialog = page.getByRole('dialog');
        await dialog.getByLabel(/Amount/i).fill('5000');
        await dialog.getByRole('button', { name: /Record Payment|Confirm/i }).click();

        await expect(dialog).toBeHidden({ timeout: 15000 });
        console.log('[Payment] Step 3: Verifying ledger update...');
        
        // Verify balance reflects 0 or "Paid"
        await expect(row).toContainText(/Paid|Received/i, { timeout: 10000 });
        console.log('[Payment] Lifecycle Verified: Manual payment synced successfully.');
    });
});
