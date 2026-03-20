import { test, expect } from '@playwright/test';

// Common constants
const OWNER_EMAIL = 'bot_tester_7@roombox.app';
const OWNER_PASS = 'Password123!';
const STAFF_PHONE = '8888888888';
const STAFF_NAME = 'Deep Permissions Staff';
const LOGOUT_TIMEOUT = 15000;

test.describe('Deep Permissions & Access Control', () => {
    
    test.setTimeout(180000);

    const loginAsOwner = async (page: any) => {
        console.log('Logging in as Owner...');
        await page.goto('/login');
        await page.getByLabel('Email').fill(OWNER_EMAIL);
        await page.getByLabel('Password').fill(OWNER_PASS);
        await page.getByRole('button', { name: 'Log In as Owner' }).click();
        await page.waitForURL('**/dashboard', { timeout: 20000 });
    };

    const loginAsStaff = async (page: any) => {
        console.log('Logging in as Staff...');
        await page.goto('/login');
        console.log('Clicking Staff / Tenant tab');
        await page.getByRole('tab', { name: 'Staff / Tenant' }).click();
        console.log('Filling phone number');
        await page.getByPlaceholder('e.g. 9876543210').fill(STAFF_PHONE);
        console.log('Clicking Send OTP');
        await page.getByRole('button', { name: 'Send OTP' }).click();
        
        await page.screenshot({ path: 'e2e-tests/debug-staff-login-otp-sent.png' });
        
        console.log('Waiting for OTP input');
        await expect(page.locator('input#otp')).toBeVisible({ timeout: 15000 });
        console.log('Filling OTP');
        await page.locator('input#otp').fill('123456');
        console.log('Clicking Verify & Log In');
        await page.getByRole('button', { name: 'Verify & Log In' }).click();
        console.log('Waiting for dashboard redirect');
        await page.waitForURL('**/dashboard', { timeout: 20000 });
        console.log('Staff logged in successfully');
    };

    const logout = async (page: any) => {
        console.log('Logging out...');
        const desktopLogout = page.getByRole('button', { name: 'Logout', exact: true });
        if (await desktopLogout.isVisible()) {
            await desktopLogout.click();
        } else {
            // Force logout if UI button is tricky
            await page.evaluate(() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/login';
            });
        }
        await page.waitForURL('**/login', { timeout: LOGOUT_TIMEOUT });
    };

    const openPermissionsModal = async (page: any) => {
        await page.goto('/dashboard/staff');
        // Wait for table to load
        await expect(page.locator('table')).toBeVisible({ timeout: 15000 });
        
        console.log('Checking for staff:', STAFF_NAME);
        let staffRow = page.locator('tr', { hasText: STAFF_NAME }).first();
        if (!(await staffRow.isVisible())) {
            console.log('Staff missing, creating...');
            await page.getByRole('button', { name: 'Add Staff' }).click();
            await page.getByRole('combobox', { name: 'Property' }).click();
            await page.getByRole('option').first().click();
            await page.getByLabel('Full Name').fill(STAFF_NAME);
            await page.getByLabel('Phone Number').fill(STAFF_PHONE);
            await page.getByRole('combobox', { name: 'Role' }).click();
            await page.getByRole('option', { name: 'manager' }).click();
            await page.getByLabel('Salary').fill('20000');
            await page.getByRole('button', { name: 'Add Staff', exact: true }).click();
            
            // Wait for creation toast or table update
            await expect(page.locator('table')).toContainText(STAFF_NAME, { timeout: 15000 });
            console.log('Staff created.');
            // Re-locate staff row after creation
            staffRow = page.locator('tr', { hasText: STAFF_NAME }).first();
        } else {
            console.log('Staff already exists.');
        }

        console.log('Opening permissions for:', STAFF_NAME);
        await staffRow.locator('button').filter({ has: page.locator('.sr-only:text("Toggle menu")') }).click();
        
        // Wait for the menu item to be visible and click it
        const permissionsItem = page.getByRole('menuitem', { name: /Permissions/i });
        await expect(permissionsItem).toBeVisible({ timeout: 5000 });
        await permissionsItem.click();
        
        await page.waitForSelector('text=Manage Permissions', { state: 'visible' });
        // Capture screenshot of the modal for visual confirmation
        await page.screenshot({ path: 'e2e-tests/debug-permissions-modal.png' });
    };

    test('Sidebar Visibility & Route Protection', async ({ page }) => {
        // 1. OWNER: Revoke "View Expenses"
        await loginAsOwner(page);
        await openPermissionsModal(page);

        // 2. Configure Permissions (Toggle off 'Financials:view' and 'Guests:add')
        // Based on src/lib/permissions.ts and src/app/dashboard/staff/page.tsx
        
        console.log('Toggling Financials View OFF');
        const financialsViewSwitch = page.locator('#finances-view');
        if (await financialsViewSwitch.getAttribute('aria-checked') === 'true') {
            await financialsViewSwitch.click();
            await expect(financialsViewSwitch).toHaveAttribute('aria-checked', 'false');
        }

        console.log('Toggling Guests Add OFF');
        const guestsAddSwitch = page.locator('#guests-add');
        if (await guestsAddSwitch.getAttribute('aria-checked') === 'true') {
            await guestsAddSwitch.click();
            await expect(guestsAddSwitch).toHaveAttribute('aria-checked', 'false');
        }

        await page.getByRole('button', { name: /Save Permissions/i }).click();
        // Wait for toast
        await expect(page.getByText(/Permissions Updated/i)).toBeVisible();
        await logout(page);

        // 2. STAFF: Verify "Expenses" hidden and route blocked
        await loginAsStaff(page);
        // Give sidebar time to render with new permissions
        await page.waitForTimeout(2000); 
        await expect(page.locator('nav')).not.toContainText(/Expenses/i);
        
        console.log('Verifying Route Protection for /dashboard/expense');
        await page.goto('/dashboard/expense');
        // Wait for redirect or access denied state
        await expect(page).toHaveURL(/.*dashboard(?!\/expense)/, { timeout: 10000 });
        await logout(page);
    });

    test('Action Restriction: Add Tenant', async ({ page }) => {
        // 1. OWNER: Enable "Tenants" View, but disable "Add"
        await loginAsOwner(page);
        await openPermissionsModal(page);
        
        // View ON, Add OFF
        const guestsViewSwitch = page.locator('#guests-view');
        const guestsAddSwitch = page.locator('#guests-add');

        if (await guestsViewSwitch.getAttribute('aria-checked') !== 'true') await guestsViewSwitch.click();
        if (await guestsAddSwitch.getAttribute('aria-checked') === 'true') await guestsAddSwitch.click();
        
        await page.getByRole('button', { name: 'Save Permissions' }).click();
        await logout(page);

        // 2. STAFF: Verify Add button hidden in Tenant Management
        await loginAsStaff(page);
        await page.goto('/dashboard/tenant-management');
        // Based on app, it might be "Add Guest" or "Add Tenant"
        await expect(page.getByRole('button', { name: /Add/i })).not.toBeVisible();
        await logout(page);
    });

    test('Staff Management Hierarchy', async ({ page }) => {
        // 1. OWNER: Grant "Staff: View" only
        await loginAsOwner(page);
        await openPermissionsModal(page);
        
        const staffViewSwitch = page.locator('#staff-view');
        const staffAddSwitch = page.locator('#staff-add');
        const staffEditSwitch = page.locator('#staff-edit');
        const staffDeleteSwitch = page.locator('#staff-delete');
        
        // View ON, others OFF
        if (await staffViewSwitch.getAttribute('aria-checked') !== 'true') await staffViewSwitch.click();
        if (await staffAddSwitch.getAttribute('aria-checked') === 'true') await staffAddSwitch.click();
        if (await staffEditSwitch.getAttribute('aria-checked') === 'true') await staffEditSwitch.click();
        if (await staffDeleteSwitch.getAttribute('aria-checked') === 'true') await staffDeleteSwitch.click();
        
        await page.getByRole('button', { name: 'Save Permissions' }).click();
        await logout(page);

        // 2. STAFF: Verify cannot add/edit other staff
        await loginAsStaff(page);
        await page.goto('/dashboard/staff');
        await expect(page.getByRole('button', { name: /Add Staff/i })).not.toBeVisible();
        
        // Check actions menu on another staff member
        const otherStaffRow = page.locator('tr').filter({ hasNotText: STAFF_NAME }).filter({ hasText: /\d{10}/ }).first();
        if (await otherStaffRow.count() > 0) {
            await otherStaffRow.locator('button').filter({ has: page.locator('.sr-only:text("Toggle menu")') }).click();
            await expect(page.getByRole('menuitem', { name: /Edit/i })).not.toBeVisible();
            await expect(page.getByRole('menuitem', { name: /Delete/i })).not.toBeVisible();
        }
        await logout(page);
    });

    test.afterAll(async ({ page }) => {
        // Cleanup staff member
        // (Optional: depending on whether we want to keep test data)
    });
});
