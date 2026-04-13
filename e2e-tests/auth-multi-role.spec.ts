import { test, expect } from '@playwright/test';
import { login, logout, OWNER_EMAIL, RUN_ID, TENANT_PASSWORD } from './test-utils';

test.describe('Multi-Role Context Switching', () => {

    const MUTUAL_PHONE = `90000${RUN_ID}`;
    const MUTUAL_NAME = `Multi Role User ${RUN_ID}`;

    test.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        await login(page, OWNER_EMAIL);
        
        // 1. Create as Tenant
        await page.goto('/dashboard/tenant-management');
        await page.getByRole('button', { name: /Add Guest/i }).first().click();
        await page.locator('input[name="name"]').fill(MUTUAL_NAME);
        await page.keyboard.press('Tab');
        await page.keyboard.type(MUTUAL_PHONE);
        await page.locator('button[role="combobox"]').first().click();
        await page.getByRole('option').first().click();
        await page.locator('input[name="rentAmount"]').fill('5000');
        await page.getByRole('button', { name: /Add Guest/i }).first().click();
        await page.waitForTimeout(2000);

        // 2. Create as Staff (Same Phone)
        await page.goto('/dashboard/staff');
        await page.getByRole('button', { name: /Add Staff/i }).first().click();
        await page.getByRole('combobox', { name: /Property/i }).click();
        await page.getByRole('option').first().click();
        await page.getByLabel(/Full Name/i).fill(MUTUAL_NAME);
        await page.getByLabel(/Phone Number/i).fill(MUTUAL_PHONE);
        await page.getByRole('combobox', { name: /Role/i }).click();
        await page.getByRole('option', { name: /manager/i }).click();
        await page.getByLabel(/Salary/i).fill('10000');
        await page.getByRole('button', { name: /Add Staff/i, exact: true }).click();
        await page.waitForTimeout(2000);

        await page.close();
        await context.close();
    });

    test.beforeEach(async ({ page }) => {
        await logout(page);
    });

    test('User with Multi-Role should see Context Switcher after login', async ({ page }) => {
        // Since it's a new user, they might need to set password first via Invite Code
        // But for this test, we assume they already have a password set (seeding usually handles it or we use login helper)
        
        await page.goto('/login');
        await page.locator('#phone').fill(MUTUAL_PHONE);
        await page.getByRole('button', { name: 'Next', exact: true }).click();

        
        // Handle Password (login helper does this but we'll do it manually to watch for switcher)
        const passInput = page.locator('#pass');
        await expect(passInput).toBeVisible({ timeout: 10000 });
        await passInput.fill(TENANT_PASSWORD);
        await page.getByRole('button', { name: /Sign In/i }).click();
        
        // EXPECT CONTEXT SWITCHER
        const switcherHeading = page.getByText(/Select Context|Pick a profile/i);
        await expect(switcherHeading).toBeVisible({ timeout: 15000 });
        
        // Verify both contexts exist
        const staffCard = page.locator('div.grid.gap-4 .cursor-pointer').filter({ hasText: /manager|staff/i });
        const tenantCard = page.locator('div.grid.gap-4 .cursor-pointer').filter({ hasText: /Resident/i });
        
        await expect(staffCard).toBeVisible();
        await expect(tenantCard).toBeVisible();
        
        // Select Staff and verify redirect to /dashboard
        await staffCard.click();
        await page.waitForURL(/.*dashboard(\/)?$/, { timeout: 15000 });
        console.log('Successfully switched to Staff context.');
    });

});
