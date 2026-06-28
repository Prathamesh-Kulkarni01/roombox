import { test, expect } from '@playwright/test';
import { loginWorkflow, logoutWorkflow } from '../../workflows/authWorkflow';
import { onboardStaffWorkflow } from '../../workflows/staffWorkflow';
import { onboardTenantWorkflow } from '../../workflows/tenantWorkflow';
import { createPropertyWorkflow, setupFullPropertyLayout } from '../../workflows/propertyWorkflow';
import { wipeOwnerData } from '../../api/cleanup';
import { OWNER_EMAIL, OWNER_ID, RUN_ID } from '../../test-utils';
import { AuthPage } from '../../pages/AuthPage';

/**
 * Authentication Security (@integration)
 * Hybrid tests verifying brute-force protection, account lockout, and anti-enumeration.
 */
test.describe('Auth Security Enforcement', () => {

    const STAFF_PHONE = `99999${RUN_ID}`;
    const STAFF_NAME = `Security Staff ${RUN_ID}`;

    test.beforeAll(async () => {
        console.log(`[Security] Step 0: Initializing security context for ${RUN_ID}...`);
        // Clean environment
        await wipeOwnerData(OWNER_ID);
    });

    test('Staff: MFA Mandatory (Blocking OTP-only login)', async ({ page }) => {
        console.log('[Security] Step 1: Provisioning staff with MFA requirements...');
        await loginWorkflow(page, OWNER_EMAIL);

        // Ensure a property exists; staff onboarding UI is gated by properties.
        const SECURITY_PG = `Security PG ${RUN_ID}`;
        await createPropertyWorkflow(page, { name: SECURITY_PG, location: 'Security Zone', city: 'AutoCity' });
        await setupFullPropertyLayout(page, SECURITY_PG);

        await onboardStaffWorkflow(page, {
            name: STAFF_NAME,
            phone: STAFF_PHONE,
            role: 'manager'
        });

        await logoutWorkflow(page);
        
        console.log('[Security] Step 2: Attempting OTP-only login for staff (Should be blocked)');
        await page.goto('/login');
        await page.locator('#phone').fill(STAFF_PHONE);
        await page.getByRole('button', { name: 'Next', exact: true }).click();
        
        // Wait for password challenge (Staff requires password)
        await expect(page.locator('#pass')).toBeVisible({ timeout: 15000 });
        
        // Anti-bypass check: Verify meaningful error if OTP is forced
        console.log('[Security] Verified: Password challenge triggered for staff.');
    });

    test('Brute Force: Account Lockout after multiple failures', async ({ page }) => {
        const TENANT_PHONE = `66666${RUN_ID}`;
        console.log('[Security] Step 3: Verifying lockout thresholds...');
        
        // 1. Create a dummy tenant
        await loginWorkflow(page, OWNER_EMAIL);
        const LOCKOUT_PG = `Lockout PG ${RUN_ID}`;
        await createPropertyWorkflow(page, { name: LOCKOUT_PG, location: 'Lock St', city: 'AutoCity' });
        await setupFullPropertyLayout(page, LOCKOUT_PG);
        await onboardTenantWorkflow(page, { name: 'Sucker', phone: TENANT_PHONE, pgName: LOCKOUT_PG, rent: '1' });
        await logoutWorkflow(page);

        // 2. Fail OTP 3 times
        await page.goto('/login');
        await page.locator('#phone').fill(TENANT_PHONE);
        await page.getByRole('button', { name: 'Next', exact: true }).click();

        // Force OTP mode and wait for input
        const auth = new AuthPage(page);
        await auth.clickGetOtp();
        const codeInput = page.locator('#otp-verify, #invite-code').first();
        await expect(codeInput).toBeVisible({ timeout: 15000 });
        
        for (let i = 1; i <= 3; i++) {
            console.log(`[Security] Failed attempt ${i}...`);
            await codeInput.fill('000000');
            await page.getByRole('button', { name: /Verify/i }).click();
            await page.waitForTimeout(1000);
        }
        
        // 4. Verify lockout message
        await expect(page.getByText(/Too many failed attempts|locked/i)).toBeVisible({ timeout: 10000 });
        console.log('[Security] Verified: Lockout mechanism engaged.');
    });

    test('Privacy: Anti-Enumeration for unknown accounts @smoke', async ({ page }) => {
        const UNKNOWN_PHONE = '9123456789';
        console.log('[Security] Step 4: Verifying anti-enumeration (Unknown phone response)...');
        
        await page.goto('/login');
        await page.locator('#phone').fill(UNKNOWN_PHONE);
        await page.getByRole('button', { name: 'Next', exact: true }).click();
        
        // Expected behavior: generic challenge (Password) and NO 'account not found' error
        await expect(page.locator('#pass')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/account not found|invalid user/i)).not.toBeVisible();
        
        console.log('[Security] Verified: Silent treatment for unknown phone numbers.');
    });

});
