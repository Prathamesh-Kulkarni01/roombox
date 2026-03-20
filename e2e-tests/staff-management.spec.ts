import { test, expect } from '@playwright/test';

// Staff Management E2E Tests - Continuous Flow
test.describe('Staff Management Flow', () => {
    const TEST_STAFF_PHONE = '8888888888';
    const TEST_STAFF_NAME = 'Full Flow Staff';
    const STAFF_URL = '/dashboard/staff';
    const LOGIN_URL = '/login';

    test('Complete Staff Management Lifecycle', async ({ page }) => {
        const uniqueSuffix = Date.now().toString().slice(-4);
        const TEST_STAFF_NAME = `Staff ${uniqueSuffix}`;
        test.setTimeout(120000); 

        const logout = async () => {
            console.log('Logging out...');
            // Try desktop logout button first
            const desktopLogout = page.getByRole('button', { name: 'Logout', exact: true });
            if (await desktopLogout.isVisible()) {
                await desktopLogout.click();
            } else {
                // Fallback to mobile menu if needed
                const menuBtn = page.getByRole('button', { name: 'Toggle Menu' });
                if (await menuBtn.isVisible()) {
                    await menuBtn.click();
                    await page.getByRole('button', { name: 'Logout' }).click();
                } else {
                    // Force logout via storage
                    await page.evaluate(() => {
                        localStorage.clear();
                        sessionStorage.set('auth-logout', 'true');
                        window.location.href = '/login';
                    });
                }
            }
            await page.waitForURL('**/login', { timeout: 15000 });
            console.log('Logged out.');
        };

        // 1. LOGIN AS OWNER
        console.log('Logging in as Owner...');
        await page.goto(LOGIN_URL);
        
        await page.getByLabel('Email').fill('bot_tester_7@roombox.app');
        await page.getByLabel('Password').fill('Password123!');
        await page.getByRole('button', { name: 'Log In as Owner' }).click();
        
        await page.waitForURL('**/dashboard', { timeout: 20000 });
        console.log('Logged in as Owner.');

        // 2. ADD STAFF
        console.log('Navigating to Staff page...');
        await page.goto(STAFF_URL);
        await expect(page.getByRole('heading', { name: /Staff & Operations/i })).toBeVisible({ timeout: 15000 });

        console.log('Clicking Add Staff button...');
        await page.getByRole('button', { name: 'Add Staff' }).click();
        
        await expect(page.getByRole('heading', { name: 'Add New Staff Member' })).toBeVisible();

        console.log('Filling staff details...');
        await page.getByRole('combobox', { name: 'Property' }).click();
        await page.getByRole('option').first().click();
        
        await page.getByLabel('Full Name').fill(TEST_STAFF_NAME);
        await page.getByLabel('Phone Number').fill(TEST_STAFF_PHONE);
        
        await page.getByRole('combobox', { name: 'Role' }).click();
        await page.getByRole('option', { name: 'manager' }).click();
        
        await page.getByLabel('Salary').fill('25000');

        console.log('Saving Staff...');
        await page.getByRole('button', { name: 'Add Staff', exact: true }).click(); 

        // Verify staff in list
        await expect(page.locator('table')).toContainText(TEST_STAFF_NAME, { timeout: 15000 });
        console.log('Staff added successfully.');

        // 3. EDIT PERMISSIONS
        console.log('Opening Permissions dialog...');
        const staffRow = page.locator('tr', { hasText: TEST_STAFF_NAME }).first();
        // The trigger button has "Toggle menu" sr-only text
        await staffRow.locator('button').filter({ has: page.locator('.sr-only:text("Toggle menu")') }).click();
        
        await page.getByRole('menuitem', { name: /Permissions/i }).click();
        await expect(page.getByRole('heading', { name: /Manage Permissions/i })).toBeVisible({ timeout: 10000 });

        console.log('Toggling View Guest Details permission...');
        await page.getByLabel('View Guest Details').click();
        await page.getByRole('button', { name: 'Save Permissions' }).click();
        
        await expect(page.getByRole('heading', { name: /Manage Permissions/i })).not.toBeVisible();
        console.log('Permissions updated.');

        // 4. LOGOUT OWNER
        await logout();

        // 5. STAFF LOGIN
        console.log('Verifying Staff Login...');
        await page.getByRole('tab', { name: 'Staff / Tenant' }).click();
        await page.getByPlaceholder('e.g. 9876543210').fill(TEST_STAFF_PHONE);
        await page.getByRole('button', { name: 'Send OTP' }).click();

        console.log('Entering OTP...');
        await expect(page.locator('input#otp')).toBeVisible({ timeout: 15000 });
        await page.locator('input#otp').fill('123456');
        await page.getByRole('button', { name: 'Verify & Log In' }).click();

        await page.waitForURL('**/dashboard', { timeout: 20000 });
        console.log('Staff logged in successfully.');
        
        await expect(page.getByRole('heading', { name: /Dashboard/i }).first()).toBeVisible();

        // 6. LOGOUT STAFF
        await logout();

        // 7. LOGIN AS OWNER REMOVAL
        console.log('Logging back in as Owner for cleanup...');
        await page.getByLabel('Email').fill('bot_tester_7@roombox.app');
        await page.getByLabel('Password').fill('Password123!');
        await page.getByRole('button', { name: 'Log In as Owner' }).click();
        await page.waitForURL('**/dashboard');

        // 8. DELETE STAFF
        console.log('Deleting Staff...');
        await page.goto(STAFF_URL);
        const staffRowToDelete = page.locator('tr', { hasText: TEST_STAFF_NAME }).first();
        await staffRowToDelete.locator('button').filter({ has: page.locator('.sr-only:text("Toggle menu")') }).click();
        
        // Handle dialog
        page.once('dialog', d => d.accept());
        await page.getByRole('menuitem', { name: /Delete/i }).click();

        // Verify removal by checking that this specific staff name is gone
        await expect(page.locator('table')).not.toContainText(TEST_STAFF_NAME, { timeout: 15000 });
        console.log('Staff deleted successfully.');
    });
});
