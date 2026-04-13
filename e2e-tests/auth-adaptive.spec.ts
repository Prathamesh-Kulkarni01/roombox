import { test, expect } from '@playwright/test';
import { login, logout, TENANT_PHONE, TENANT_PASSWORD, OWNER_EMAIL, RUN_ID, getOtpFromEmulator } from './test-utils';

test.describe('Identity-First Adaptive Auth Flow', () => {
    
    test.beforeEach(async ({ page }) => {
        await logout(page);
    });

    test('Resident: Successful Password Login', async ({ page }) => {
        await login(page, TENANT_PHONE, { password: TENANT_PASSWORD });
        // Tenants land on /tenants/my-pg or /dashboard depending on PG settings
        await expect(page.url()).toMatch(/dashboard|tenants\/my-pg/);
        console.log('Tenant password login successful.');
    });

    test('Resident: Successful OTP Login (Fallback)', async ({ page }) => {
        await login(page, TENANT_PHONE, { otp: true });
        await expect(page.url()).toMatch(/dashboard|tenants\/my-pg/);
        console.log('Tenant OTP login successful.');
    });

    test('Staff/Resident: Invocation Onboarding Journey', async ({ page }) => {
        // 1. Owner creates a new invite
        await login(page, OWNER_EMAIL);
        await page.goto('/dashboard/tenant-management');
        
        const NEW_TENANT_PHONE = `77777${RUN_ID}`;
        
        // Cleanup if exists
        const existing = page.locator('tr').filter({ hasText: NEW_TENANT_PHONE }).first();
        if (await existing.isVisible()) {
            await existing.locator('button').last().click();
            await page.getByRole('menuitem', { name: /Delete/i }).click();
            await page.getByRole('button', { name: /Confirm/i }).click();
            await page.waitForTimeout(1000);
        }

        await page.getByRole('button', { name: /Add New Guest/i }).first().click();
        await page.locator('input[name="name"]').fill(`Invite Tester ${RUN_ID}`);
        // Tab to phone
        await page.keyboard.press('Tab');
        await page.keyboard.type(NEW_TENANT_PHONE);
        
        // Select PG
        await page.locator('button[role="combobox"]').first().click();
        await page.getByRole('option').first().click();
        
        // Rent
        await page.locator('input[name="rentAmount"]').fill('1000');
        await page.getByRole('button', { name: /Add New Guest|Save/i }).first().click();
        
        // 2. Tenant logs in with invite code
        await logout(page);
        
        // Identity entry
        await page.goto('/login');
        await page.locator('#phone').fill(NEW_TENANT_PHONE);
        await page.getByRole('button', { name: 'Next', exact: true }).click();

        

        // Should show invite code challenge
        const inviteInput = page.locator('#invite-code');
        await expect(inviteInput).toBeVisible({ timeout: 10000 });
        
        const code = await getOtpFromEmulator(NEW_TENANT_PHONE);
        expect(code).toBeDefined();
        await inviteInput.fill(code!);
        await page.getByRole('button', { name: /Verify & Join/i }).click();
        
        // Successful onboarding
        await expect(page.url()).toMatch(/dashboard|tenants\/my-pg/);
        console.log('Invitation onboarding journey completed.');
    });

});
