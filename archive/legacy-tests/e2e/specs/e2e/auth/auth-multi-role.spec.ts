import { test, expect } from '@playwright/test';
import { loginWorkflow, logoutWorkflow } from '../../../workflows/authWorkflow';
import { createPropertyWorkflow, setupFullPropertyLayout } from '../../../workflows/propertyWorkflow';
import { onboardTenantWorkflow } from '../../../workflows/tenantWorkflow';
import { onboardStaffWorkflow } from '../../../workflows/staffWorkflow';
import { wipeOwnerData, ensureOwnerExists, ensurePropertyExists, ensureTenantExists, ensureStaffExists } from '../../../api/cleanup';
import { OWNER_EMAIL, RUN_ID, OWNER_ID, TARGET_PG_NAME, OWNER_PASSWORD } from '../../../test-utils';

test.describe('Multi-Role Context Switching', () => {

    const MUTUAL_PHONE = `99${Date.now().toString().slice(-8)}`;
    const MUTUAL_NAME = `Multi Role User ${RUN_ID}`;
    const UNIQUE_PG_NAME = `PG ${RUN_ID} ${Date.now()}`;

    test.beforeAll(async ({ browser }) => {
        // Fast SDK provisioning
        await ensureOwnerExists(OWNER_ID, OWNER_EMAIL, OWNER_PASSWORD);

        // We use a phone-based identity for the multi-role user to test OTP flow
        const MUTUAL_ID = `user-${MUTUAL_PHONE}`;
        const MUTUAL_EMAIL = `${MUTUAL_PHONE}@roombox.app`;

        const context = await browser.newContext();
        const page = await context.newPage();
        
        // High-speed API wipe
        await wipeOwnerData(OWNER_ID);

        // Ensure property exists via high-speed provisioning
        const pgId = await ensurePropertyExists(OWNER_ID, UNIQUE_PG_NAME);
        
        // 1. Create as Tenant
        console.log(`[Setup] Creating Tenant profile for ${MUTUAL_PHONE}`);
        await ensureTenantExists(OWNER_ID, pgId, MUTUAL_ID, MUTUAL_PHONE);

        // 2. Create as Staff
        console.log(`[Setup] Creating Staff profile for ${MUTUAL_PHONE}`);
        await ensureStaffExists(OWNER_ID, pgId, MUTUAL_ID, MUTUAL_PHONE);

        await page.close();
        await context.close();
    });

    test.beforeEach(async ({ page }) => {
        // Use atomic logout workflow
        await page.goto('/login');
        await page.evaluate(() => localStorage.clear());
        await page.context().clearCookies();
    });

    test('User with Multi-Role should see Context Switcher after login', async ({ page }) => {
        await loginWorkflow(page, MUTUAL_PHONE, undefined, { otp: true, autoSelectContext: false });
        
        const switcherHeading = page.getByText(/Select Context|Pick a profile/i);
        await expect(switcherHeading).toBeVisible({ timeout: 15000 });
        
        const staffCard = page.locator('div.grid.gap-4 .cursor-pointer').filter({ hasText: /manager|staff/i });
        const tenantCard = page.locator('div.grid.gap-4 .cursor-pointer').filter({ hasText: /Resident/i });
        
        await expect(staffCard).toBeVisible();
        await expect(tenantCard).toBeVisible();
        
        await staffCard.click();
        await page.waitForURL(/.*dashboard(\/)?$/, { timeout: 15000 });
        console.log('Successfully switched to Staff context.');
    });

});
