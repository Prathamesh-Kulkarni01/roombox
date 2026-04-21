import { test, expect } from '@playwright/test';
import { loginWorkflow } from '../../../workflows/authWorkflow';
import { onboardTenantWorkflow } from '../../../workflows/tenantWorkflow';
import { wipeOwnerData } from '../../../api/cleanup';
import { AuthPage } from '../../../pages/AuthPage';
import { TENANT_PHONE, TENANT_PASSWORD, OWNER_EMAIL, RUN_ID, OWNER_ID } from '../../../test-utils';

test.describe('Identity-First Adaptive Auth Flow', () => {
    let authPage: AuthPage;

    test.beforeEach(async ({ page }) => {
        authPage = new AuthPage(page);
        await authPage.logout();
    });

    test('Resident: Successful Password Login', async ({ page }) => {
        await loginWorkflow(page, TENANT_PHONE, TENANT_PASSWORD);
        await expect(page).toHaveURL(/dashboard|tenants\/my-pg/, { timeout: 30000 });
        console.log('Tenant password login successful.');
    });

    test('Resident: Successful OTP Login (Fallback) @smoke', async ({ page }) => {
        await loginWorkflow(page, TENANT_PHONE, undefined, { otp: true });
        await expect(page).toHaveURL(/dashboard|tenants\/my-pg/, { timeout: 30000 });
        console.log('Tenant OTP login successful.');
    });

    test('Staff/Resident: Invocation Onboarding Journey', async ({ page }) => {
        // 1. Owner creates a new invite
        await loginWorkflow(page, OWNER_EMAIL);
        
        // Ensure completely empty property for reliable additions (High-speed API wipe)
        await wipeOwnerData(OWNER_ID);
        
        const NEW_TENANT_PHONE = `77777${RUN_ID}`;

        await onboardTenantWorkflow(page, { 
            name: `Invite Tester ${RUN_ID}`, 
            phone: NEW_TENANT_PHONE, 
            pgName: `PG ${RUN_ID}`, // Assuming a PG exists from RUN_ID
            rent: '1000' 
        });
        
        console.log(`[Test] Guest added for ${NEW_TENANT_PHONE}. Starting tenant login...`);

        // 2. Tenant logs in with OTP
        await authPage.logout();
        await loginWorkflow(page, NEW_TENANT_PHONE, undefined, { otp: true });
        
        await expect(page).toHaveURL(/dashboard|tenants\/my-pg/, { timeout: 30000 });
        console.log('Invitation onboarding journey completed.');
    });

});
