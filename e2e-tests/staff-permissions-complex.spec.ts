import { test, expect, Page, BrowserContext } from '@playwright/test';
import { login } from './test-utils';

test.describe('Complex Permission Management Matrix', () => {
    const STAFF_URL = '/dashboard/staff';
    const TEST_PHONE = '9999999998'; // Different from the standard one
    const TEST_NAME = 'Perm Tester';

    test('Test Multiple Combinations of Staff Permissions', async ({ page, context }) => {
        test.setTimeout(240_000); // 4 minutes

        // 1. LOGIN AS OWNER
        console.log('--- Phase 1: Owner Setup ---');
        await login(page, 'bot_tester_9@roombox.app');
        console.log('Logged in as Owner.');

        // 2. CREATE STAFF
        console.log('--- Phase 2: Create Staff ---');
        await page.goto(STAFF_URL);
        
        const addStaffBtn = page.getByRole('button', { name: 'Add Staff' });
        const noPropertiesHeading = page.getByRole('heading', { name: 'No Properties Found' });
        
        await Promise.race([
            addStaffBtn.waitFor({ state: 'visible', timeout: 15000 }),
            noPropertiesHeading.waitFor({ state: 'visible', timeout: 15000 })
        ]).catch(() => {
            console.log('Timeout waiting for Staff page to load initial state.');
        });
        
        // Setup property if none
        if (await noPropertiesHeading.isVisible().catch(()=>false)) {
            await page.getByRole('link', { name: 'Add Property' }).click();
            await page.waitForURL('**/dashboard/pg-management');
            await page.getByRole('button', { name: 'Add New Property' }).click();
            await page.locator('input[name="name"]').fill(`Perm Test Property ${Math.floor(Math.random() * 1000)}`);
            await page.locator('input[name="location"]').fill('Perm Area');
            await page.locator('input[name="city"]').fill('Perm City');
            await page.getByRole('button', { name: 'Add Property', exact: true }).click();
            await page.waitForTimeout(3000); 
            await page.goto(STAFF_URL);
            await addStaffBtn.waitFor({ state: 'visible', timeout: 15000 });
        }

        // Clean up old staff with this phone/name if exists
        let foundOld = true;
        while (foundOld) {
            const rowCount = await page.locator('tr').filter({ hasText: TEST_NAME }).count();
            if (rowCount === 0) {
                foundOld = false;
                break;
            }
            const staffRow = page.locator('tr').filter({ hasText: TEST_NAME }).first();
            const menuBtn = staffRow.locator('button').filter({ has: page.locator('.sr-only:text("Toggle menu")') });
            if (await menuBtn.isVisible()) {
                await menuBtn.click();
                page.once('dialog', d => d.accept());
                await page.getByRole('menuitem', { name: /Delete/i }).click();
                await page.waitForTimeout(2000); 
            } else {
                foundOld = false;
            }
        }

        await addStaffBtn.click();
        await page.getByRole('combobox', { name: 'Property' }).click();
        await page.getByRole('option').first().click();
        await page.getByLabel('Full Name').fill(TEST_NAME);
        await page.getByLabel('Phone Number').fill(TEST_PHONE);
        await page.getByRole('combobox', { name: 'Role' }).click();
        await page.getByRole('option', { name: 'manager' }).click();
        await page.getByLabel('Salary').fill('10000');
        await page.getByRole('button', { name: 'Add Staff', exact: true }).click();

        await expect(page.locator('table')).toContainText(TEST_NAME, { timeout: 15000 });
        console.log('Test Staff member created.');

        // Go to staff profile
        const staffRow = page.locator('tr').filter({ hasText: TEST_NAME }).first();
        const menuBtn = staffRow.locator('button').filter({ has: page.locator('.sr-only:text("Toggle menu")') });
        await menuBtn.click();
        await page.getByRole('menuitem', { name: /View Profile/i }).click();
        await page.waitForURL(/\/dashboard\/staff\/.+/);
        await expect(page.getByRole('heading', { name: TEST_NAME, exact: true })).toBeVisible({ timeout: 15000 });

        // Helper to set permissions
        const configurePermissions = async (permsToEnable: RegExp[]) => {
            await page.getByRole('button', { name: /Edit Granularly/i }).click();
            await expect(page.getByText(/Manage Permissions -/i)).toBeVisible();

            // Turn off all
            const allSwitches = await page.getByRole('switch').all();
            for (const sw of allSwitches) {
                if (await sw.getAttribute('aria-checked') === 'true') {
                    await sw.click();
                }
            }
            
            // Turn on requested
            for (const name of permsToEnable) {
                const sw = page.getByRole('switch', { name });
                if (await sw.getAttribute('aria-checked') !== 'true') {
                    await sw.click();
                }
            }
            
            await page.getByRole('button', { name: 'Save Changes' }).click();
            await expect(page.getByText(/Manage Permissions -/i)).not.toBeVisible({ timeout: 10000 });
        };

        // Helper to get login code
        const getLoginCode = async () => {
            await page.getByRole('button', { name: /Generate Magic Link|Regenerate Magic Link/i }).click();
            await page.waitForSelector('text=Staff Login Setup', { timeout: 15000 });
            const inviteCodeElement = page.locator('span').filter({ hasText: /^[0-9]{6}$/ }).first();
            await expect(inviteCodeElement).toBeVisible();
            const code = await inviteCodeElement.innerText();
            await page.getByRole('button', { name: 'Close' }).click();
            return code;
        };

        // Profile A: Accountant (Only Finances)
        console.log('--- Profile A: Accountant (Only Finances) ---');
        await configurePermissions([/View passbook & expenses/i]);
        let inviteCode = await getLoginCode();
        
        let staffContext = await context.browser().newContext();
        let staffPage = await staffContext.newPage();
        await staffPage.goto('/login');
        await staffPage.getByRole('tab', { name: /Staff \/ Tenant/i }).click();
        const useSetupCodeBtn = staffPage.getByRole('button', { name: /Use Setup Code/i });
        if (await useSetupCodeBtn.isVisible()) await useSetupCodeBtn.click();
        await staffPage.getByLabel('Phone Number').fill(TEST_PHONE);
        await staffPage.getByLabel('6-Digit Setup Code').fill(inviteCode);
        await staffPage.getByRole('button', { name: 'Verify & Log In' }).click();
        await staffPage.waitForURL(/.*dashboard/, { timeout: 60000 });
        
        let sidebar = staffPage.locator('aside').first();
        if (!(await sidebar.isVisible())) {
            const openMenu = staffPage.getByRole('button', { name: /Open menu|Toggle menu/i });
            if (await openMenu.isVisible()) await openMenu.click();
        }
        await expect(sidebar).toBeVisible({ timeout: 10000 });
        
        // Verify A
        await expect(staffPage.getByRole('link', { name: /Rent Tracker/i })).toBeVisible({ timeout: 15_000 });
        await expect(staffPage.getByRole('link', { name: /Properties/i })).not.toBeVisible();
        await expect(staffPage.getByRole('link', { name: /Guests/i })).not.toBeVisible();
        console.log('Profile A tested successfully.');
        await staffPage.close();
        await staffContext.close();

        // Profile B: Receptionist (Guests and properties view only)
        console.log('--- Profile B: Receptionist (Guests + Properties View) ---');
        await configurePermissions([/View Guest Details/i, /View Property Layout/i]);
        inviteCode = await getLoginCode(); // Assuming code hasn't changed or regenerating is fine but we just click the button again
        
        staffContext = await context.browser().newContext();
        staffPage = await staffContext.newPage();
        await staffPage.goto('/login');
        await staffPage.getByRole('tab', { name: /Staff \/ Tenant/i }).click();
        const useSetupCodeBtnB = staffPage.getByRole('button', { name: /Use Setup Code/i });
        if (await useSetupCodeBtnB.isVisible()) await useSetupCodeBtnB.click();
        await staffPage.getByLabel('Phone Number').fill(TEST_PHONE);
        await staffPage.getByLabel('6-Digit Setup Code').fill(inviteCode);
        await staffPage.getByRole('button', { name: 'Verify & Log In' }).click();
        await staffPage.waitForURL(/.*dashboard/, { timeout: 60000 });
        
        sidebar = staffPage.locator('aside').first();
        if (!(await sidebar.isVisible())) {
            const openMenu = staffPage.getByRole('button', { name: /Open menu|Toggle menu/i });
            if (await openMenu.isVisible()) await openMenu.click();
        }
        await expect(sidebar).toBeVisible({ timeout: 10000 });
        
        // Verify B
        await expect(sidebar.getByRole('link', { name: /Guests/i })).toBeVisible();
        await expect(sidebar.getByRole('link', { name: /Properties/i })).toBeVisible();
        await expect(sidebar.getByRole('link', { name: /Rent Tracker/i })).not.toBeVisible();
        await expect(sidebar.getByRole('link', { name: /Food Menu/i })).not.toBeVisible();
        console.log('Profile B tested successfully.');
        await staffPage.close();
        await staffContext.close();

        // Cleanup
        await page.goto(STAFF_URL);
        const rowCount = await page.locator('tr').filter({ hasText: TEST_NAME }).count();
        if (rowCount > 0) {
            const row = page.locator('tr').filter({ hasText: TEST_NAME }).first();
            const btn = row.locator('button').filter({ has: page.locator('.sr-only:text("Toggle menu")') });
            if (await btn.isVisible()) {
                await btn.click();
                page.once('dialog', d => d.accept());
                await page.getByRole('menuitem', { name: /Delete/i }).click();
            }
        }
    });
});
