import { test, expect } from '@playwright/test';
import { login, logout, OWNER_EMAIL, RUN_ID, getOtpFromEmulator } from './test-utils';

test.describe('Authentication Security Enforcement', () => {

    const STAFF_PHONE = `99999${RUN_ID}`;
    const STAFF_NAME = `Security Staff ${RUN_ID}`;

    test.beforeAll(async ({ browser }) => {
        // 1. Setup a Staff Member
        const context = await browser.newContext();
        const page = await context.newPage();
        await login(page, OWNER_EMAIL);
        await page.goto('/dashboard/staff');
        
        await page.getByRole('button', { name: /Add Staff/i }).first().click();
        await page.getByRole('combobox', { name: /Property/i }).click();
        await page.getByRole('option').first().click();
        await page.getByLabel(/Full Name/i).fill(STAFF_NAME);
        await page.getByLabel(/Phone Number/i).fill(STAFF_PHONE);
        await page.getByRole('combobox', { name: /Role/i }).click();
        await page.getByRole('option', { name: /manager/i }).click();
        await page.getByLabel(/Salary/i).fill('5000');
        await page.getByRole('button', { name: /Add Staff/i, exact: true }).click();
        await page.waitForTimeout(2000);
        await page.close();
        await context.close();
    });

    test.beforeEach(async ({ page }) => {
        await logout(page);
    });

    test('Staff: OTP Login should be BLOCKED (Password Mandatory)', async ({ page }) => {
        await page.goto('/login');
        await page.locator('#phone').fill(STAFF_PHONE);
        await page.getByRole('button', { name: 'Next', exact: true }).click();

        
        // Should show password challenge
        await expect(page.locator('#pass')).toBeVisible({ timeout: 10000 });
        
        // Force switch to OTP if button exists
        const otpBtn = page.getByRole('button', { name: /Use OTP Login|login via OTP/i });
        if (await otpBtn.isVisible()) {
            await otpBtn.click();
            await page.getByRole('button', { name: /Get One-Time Code/i }).click();
            
            // Wait for input
            const otpInput = page.locator('#otp-verify');
            await expect(otpInput).toBeVisible();
            
            const code = await getOtpFromEmulator(STAFF_PHONE);
            expect(code).toBeDefined();
            await otpInput.fill(code!);
            await page.getByRole('button', { name: 'Verify & Sign In', exact: true }).click();

            
            // EXPECT FAILURE
            await expect(page.getByText(/Administrative accounts must log in with a password/i)).toBeVisible();
        } else {
            console.log('OTP fallback button not found for staff (correct behavior).');
        }
    });

    test('Security: 3 failed OTP attempts should cause LOCKOUT', async ({ page }) => {
        const TENANT_PHONE = `66666${RUN_ID}`;
        
        // 1. Create a tenant for this test
        const context = await page.context().browser().newContext();
        const ownerPage = await context.newPage();
        await login(ownerPage, OWNER_EMAIL);
        await ownerPage.goto('/dashboard/tenant-management');
        await ownerPage.getByRole('button', { name: /Add New Guest/i }).first().click();
        await ownerPage.locator('input[name="name"]').fill(`Lockout Tester ${RUN_ID}`);
        await ownerPage.keyboard.press('Tab');
        await ownerPage.keyboard.type(TENANT_PHONE);
        await ownerPage.locator('button[role="combobox"]').first().click();
        await ownerPage.getByRole('option').first().click();
        await ownerPage.locator('input[name="rentAmount"]').fill('1000');
        await ownerPage.getByRole('button', { name: /Add New Guest/i }).first().click();
        await ownerPage.waitForTimeout(2000);
        await ownerPage.close();

        // 2. Trigger OTP
        await page.goto('/login');
        await page.locator('#phone').fill(TENANT_PHONE);
        await page.getByRole('button', { name: 'Next', exact: true }).click();

        
        // Switch to OTP (since it's a new user, it might show Invite Code or Password)
        // If it shows Invite Code, that's fine too.
        await page.waitForTimeout(2000);
        const codeInput = page.locator('#invite-code, #otp-verify').first();
        await expect(codeInput).toBeVisible();
        
        // 3. Fail 3 times
        await codeInput.fill('000000');
        await page.getByRole('button', { name: 'Verify', exact: true }).or(page.getByRole('button', { name: /Verify/ })).first().click();

        await page.waitForTimeout(1000);

        await codeInput.fill('111111');
        await page.getByRole('button', { name: /Verify/i }).click();
        await page.waitForTimeout(1000);

        await codeInput.fill('222222');
        await page.getByRole('button', { name: /Verify/i }).click();
        
        // 4. Verify lockout message
        await expect(page.getByText(/Too many failed attempts|locked/i)).toBeVisible({ timeout: 10000 });
    });

    test('Security: Unknown phone should show generic challenge (Anti-Enumeration)', async ({ page }) => {
        const UNKNOWN_PHONE = '9123456789';
        await page.goto('/login');
        await page.locator('#phone').fill(UNKNOWN_PHONE);
        await page.getByRole('button', { name: 'Next', exact: true }).click();

        
        // Should show Password challenge (default generic)
        const passwordInput = page.locator('#pass');
        await expect(passwordInput).toBeVisible({ timeout: 10000 });
        
        // Try to switch to OTP
        const otpBtn = page.getByRole('button', { name: /Use OTP Login|login via OTP/i });
        if (await otpBtn.isVisible()) {
            await otpBtn.click();
            await expect(page.getByText(/We will send a 6-digit code via SMS/i)).toBeVisible();
        }
        
        // Attempting to send OTP should succeed (generic message)
        const sendBtn = page.getByRole('button', { name: /Get One-Time Code/i });
        if (await sendBtn.isVisible()) {
            await sendBtn.click();
            await expect(page.getByText(/OTP Sent|generic success/i)).toBeVisible();
        }
    });

});
