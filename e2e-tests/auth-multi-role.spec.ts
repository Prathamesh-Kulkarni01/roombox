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
        await page.getByRole('button', { name: /Add New Guest/i }).first().click();
        
        const guestForm = page.locator('[role="dialog"]');
        await guestForm.getByLabel(/Property/i).click();
        await page.getByRole('option').first().click();
        await guestForm.getByLabel(/Room/i).click();
        await page.getByRole('option').first().click();
        await guestForm.getByLabel(/Bed/i).click();
        await page.getByRole('option').first().click();

        await guestForm.getByLabel(/Full Name/i).fill(MUTUAL_NAME);
        await guestForm.getByLabel(/Phone Number/i).fill(MUTUAL_PHONE);
        await guestForm.locator('input[name="rentAmount"]').fill('5000');
        await guestForm.getByRole('button', { name: /Add Guest/i, exact: true }).click();
        await expect(guestForm).toBeHidden({ timeout: 15_000 });

        // 2. Create as Staff (Same Phone)
        await page.goto('/dashboard/staff');
        await page.getByRole('button', { name: /Add Staff/i }).first().click();
        const staffForm = page.locator('[role="dialog"]');
        
        await staffForm.getByRole('combobox', { name: /Properties/i }).click();
        await page.getByRole('option').first().click();
        await page.keyboard.press('Escape'); // Close multi-select
        
        await staffForm.getByLabel(/Full Name/i).fill(MUTUAL_NAME);
        await staffForm.getByLabel(/Phone Number/i).fill(MUTUAL_PHONE);
        await staffForm.getByRole('combobox', { name: /Role/i }).click();
        await page.getByRole('option', { name: /manager/i }).click();
        await staffForm.getByLabel(/Salary/i).fill('10000');
        await staffForm.getByRole('button', { name: /Add Staff/i, exact: true }).click();
        await expect(staffForm).toBeHidden({ timeout: 15_000 });

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
