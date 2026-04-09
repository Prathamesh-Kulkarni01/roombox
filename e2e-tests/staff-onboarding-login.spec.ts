import { test, expect } from '@playwright/test';
import { login, logout } from './test-utils';

test.describe('Staff Onboarding and Login Flows', () => {
    const STAFF_URL = '/dashboard/staff';
    const LOGIN_URL = '/login';
    const TEST_PHONE = '9999999999';
    const TEST_NAME = 'Onboarding Tester';

    test('Staff Creation, Permissions, Magic Link and Setup Code Login', async ({ page, context }) => {
        test.setTimeout(180_000);

        // 1. LOGIN AS OWNER
        console.log('--- Phase 1: Owner Setup ---');
        await login(page, 'bot_tester_7@roombox.app');
        console.log('Logged in as Owner.');



        // 2. CREATE STAFF
        console.log('--- Phase 2: Create Staff ---');
        await page.goto(STAFF_URL);
        
        // Wait for either the button OR the empty state to appear
        const addStaffBtn = page.getByRole('button', { name: 'Add Staff' });
        const noPropertiesHeading = page.getByRole('heading', { name: 'No Properties Found' });
        
        await Promise.race([
            addStaffBtn.waitFor({ state: 'visible', timeout: 15000 }),
            noPropertiesHeading.waitFor({ state: 'visible', timeout: 15000 })
        ]).catch(() => {
            console.log('Timeout waiting for Staff page to load initial state.');
        });
        
        if (await noPropertiesHeading.isVisible()) {
            console.log('No properties found. Creating a test property...');
            await page.getByRole('link', { name: 'Add Property' }).click();
            await page.waitForURL('**/dashboard/pg-management');
            
            await page.getByRole('button', { name: 'Add New Property' }).click();
            await page.locator('input[name="name"]').fill(`Test Property ${Math.floor(Math.random() * 1000)}`);
            await page.locator('input[name="location"]').fill('Test Area');
            await page.locator('input[name="city"]').fill('Test City');
            await page.getByRole('button', { name: 'Add Property', exact: true }).click();
            
            // Wait for success message or the property list to appear
            await page.waitForTimeout(3000); 
            await page.goto(STAFF_URL);
            await addStaffBtn.waitFor({ state: 'visible', timeout: 15000 });
        }

        await addStaffBtn.click();
        
        await page.getByRole('combobox', { name: 'Property' }).click();
        await page.getByRole('option').first().click();
        
        await page.getByLabel('Full Name').fill(TEST_NAME);
        await page.getByLabel('Phone Number').fill(TEST_PHONE);
        
        await page.getByRole('combobox', { name: 'Role' }).click();
        await page.getByRole('option', { name: 'manager' }).click();
        
        await page.getByLabel('Salary').fill('30000');
        await page.getByRole('button', { name: 'Add Staff', exact: true }).click();

        await expect(page.locator('table')).toContainText(TEST_NAME, { timeout: 15000 });
        console.log('Staff member created.');

        // 3. TOGGLE PERMISSIONS
        console.log('--- Phase 3: Toggle Permissions ---');
        // Click on the newly created staff row to go to profile via dropdown menu
        const staffRow = page.locator('tr').filter({ hasText: TEST_NAME }).first();
        const menuBtn = staffRow.locator('button').filter({ has: page.locator('.sr-only:text("Toggle menu")') });
        await menuBtn.click();
        await page.getByRole('menuitem', { name: /View Profile/i }).click();
        
        await page.waitForURL(/\/dashboard\/staff\/.+/);
        await expect(page.getByRole('heading', { name: TEST_NAME, exact: true })).toBeVisible({ timeout: 15000 });

        await page.getByRole('button', { name: /Edit Granularly/i }).click();
        await expect(page.getByText(/Manage Permissions -/i)).toBeVisible();

        // Ensure we start with a clean slate by turning off all permissions
        const allSwitches = await page.getByRole('switch').all();
        for (const sw of allSwitches) {
            if (await sw.getAttribute('aria-checked') === 'true') {
                await sw.click();
                await page.waitForTimeout(100);
            }
        }
        
        // Explicitly turn on the ones we want to test
        const setPermission = async (name: RegExp) => {
            const sw = page.getByRole('switch', { name });
            if (await sw.getAttribute('aria-checked') !== 'true') {
                await sw.click();
                await page.waitForTimeout(100);
            }
        };

        await setPermission(/View property Layout/i);
        await setPermission(/View passbook & expenses/i);
        
        await page.screenshot({ path: 'owner-setting-permissions.png' });
        console.log('Captured owner permission modal screenshot.');
        
        await page.getByRole('button', { name: 'Save Changes' }).click();
        
        // Wait for modal to close
        await expect(page.getByText(/Manage Permissions -/i)).not.toBeVisible({ timeout: 10000 });
        
        // Check for toast (optional but nice)
        await page.getByText(/Permissions (Updated|Saved)/i).waitFor({ state: 'visible', timeout: 8000 }).catch(() => {
            console.log('Toast message "Permissions Updated" not seen, but modal closed. Proceeding...');
        });
        console.log('Permissions updated successfully.');

        // 4. RETRIEVE INVITE INFO
        console.log('--- Phase 4: Retrieve Invite Info ---');
        await page.getByRole('button', { name: /Generate Magic Link|Regenerate Magic Link/i }).click();
        // Wait for the modal or text to appear
        await page.waitForSelector('text=Staff Login Setup', { timeout: 15000 });
        
        // More robust selectors for the code and link
        const inviteCodeElement = page.locator('span').filter({ hasText: /^[0-9]{6}$/ }).first();
        await expect(inviteCodeElement).toBeVisible();
        const inviteCode = await inviteCodeElement.innerText();
        
        const magicLinkElement = page.locator('div.font-mono').first();
        await expect(magicLinkElement).toBeVisible();
        const magicLink = await magicLinkElement.innerText();
        
        console.log(`Invite Code: [${inviteCode}]`);
        console.log(`Magic Link: [${magicLink}]`);
        
        await page.getByRole('button', { name: 'Close' }).click();

        // 5. TEST MAGIC LINK (INVITE LINK)
        console.log('--- Phase 5: Test Magic Link ---');
        // We'll use a new context for a fresh session
        const staffContext = await context.browser().newContext();
        const staffPage = await staffContext.newPage();
        
        console.log(`Navigating to magic link: ${magicLink}`);
        await staffPage.goto(magicLink);
        
        await expect(staffPage.getByRole('heading', { name: /Welcome to/i })).toBeVisible({ timeout: 20000 });
        await expect(staffPage.getByText(/Your host has invited you/i)).toBeVisible();
        
        console.log('Accepting invite...');
        await staffPage.getByRole('button', { name: /Accept Invite/i }).click();
        
        await expect(staffPage.getByRole('heading', { name: /Set Your Password/i })).toBeVisible({ timeout: 15000 });
        console.log('Magic link successfully led to password setup.');
        
        await staffPage.close();

        // 6. TEST SETUP CODE (6-DIGIT CODE) LOGIN
        console.log('--- Phase 6: Test Setup Code Login ---');
        const setupContext = await context.browser().newContext();
        const codePage = await setupContext.newPage();
        await codePage.goto(LOGIN_URL);
        
        await codePage.getByRole('tab', { name: /Staff \/ Tenant/i }).click();
        
        // Conditionally click "Use Setup Code" if not already in that mode
        const useSetupCodeBtn = codePage.getByRole('button', { name: /Use Setup Code/i });
        if (await useSetupCodeBtn.isVisible()) {
            console.log('Switching to Setup Code mode...');
            await useSetupCodeBtn.click();
        }
        
        await codePage.getByLabel('Phone Number').fill(TEST_PHONE);
        await codePage.getByLabel('6-Digit Setup Code').fill(inviteCode);
        
        console.log('Submitting setup code...');
        await codePage.getByRole('button', { name: 'Verify & Log In' }).click();
        
        // Wait for redirection to dashboard
        console.log('Waiting for redirection to dashboard...');
        try {
            // Check for our new 'Redirecting...' text first to see if the UI acknowledged the login
            await expect(codePage.getByText(/Redirecting/i)).toBeVisible({ timeout: 15000 });
            console.log('UI acknowledged login, showing Redirecting loader...');

            await codePage.waitForURL(/.*dashboard/, { timeout: 60000 });
            console.log(`Current URL after login: ${codePage.url()}`);
        } catch (e) {
            console.log(`Timeout waiting for URL redirect. Current URL: ${codePage.url()}`);
            
            // Log local storage and cookies for debugging
            const cookies = await setupContext.cookies();
            console.log('Session Cookies:', JSON.stringify(cookies, null, 2));

            // Check for error toast messages
            const errorToast = codePage.locator('[role="status"]:has-text("Error"), [role="status"]:has-text("Failed")');
            if (await errorToast.count() > 0) {
                const toastText = await errorToast.innerText();
                console.log(`Visible Error Toast: ${toastText}`);
            } else {
                console.log('No error toast found.');
            }
            
            await codePage.screenshot({ path: 'staff-login-timeout.png' });
        }

        // We use a more robust check: Look for either the sidebar heading or the welcome heading
        const welcomeHeading = codePage.getByRole('heading', { name: /Welcome/i });
        const sidebarHeading = codePage.getByRole('heading', { name: /Owner Dashboard/i });

        await Promise.race([
            welcomeHeading.waitFor({ state: 'visible', timeout: 30000 }),
            sidebarHeading.waitFor({ state: 'visible', timeout: 30000 })
        ]).catch(() => {
            console.log('Neither dashboard welcome nor sidebar heading appeared in time.');
        });

        await expect(codePage).toHaveURL(/.*dashboard/);
        console.log('Setup code login successful.');

        // 6.1 CHECK PERMISSIONS IN SIDEBAR
        console.log('--- Phase 6.1: Check Staff Permissions in Sidebar ---');
        
        // Wait for sidebar to be visible (it might be hidden if screen is too small)
        const sidebar = codePage.locator('aside').filter({ has: codePage.getByText(/Owner Dashboard/i) });
        
        if (!(await sidebar.isVisible())) {
            console.log('Sidebar not visible. Checking if it is a mobile view...');
            const menuBtn = codePage.getByRole('button', { name: /Open menu|Toggle menu/i });
            if (await menuBtn.isVisible()) {
                console.log('Mobile menu button visible. Clicking to open sidebar...');
                await menuBtn.click();
            }
        }

        await expect(sidebar).toBeVisible({ timeout: 10000 });

        // 1. Dashboard (Core/Home)
        await expect(sidebar.getByRole('link', { name: /Dashboard/i })).toBeVisible();
        
        // 2. Properties (Permitted)
        await expect(sidebar.getByRole('link', { name: /Properties/i })).toBeVisible();
        
        // 3. Financials (Permitted)
        await expect(sidebar.getByText(/Money/i)).toBeVisible(); // Group header
        await expect(sidebar.getByRole('link', { name: /Rent Tracker/i })).toBeVisible();
        
        // 4. Guests (NOT Permitted)
        await expect(sidebar.getByRole('link', { name: /Guests/i })).not.toBeVisible();
        
        // 5. KYC (NOT Permitted)
        await expect(sidebar.getByRole('link', { name: /ID Verification/i })).not.toBeVisible();
        
        // 6. Food (NOT Permitted)
        await expect(sidebar.getByRole('link', { name: /Food Menu/i })).not.toBeVisible();

        console.log('Permission verification complete: Permitted items visible, others hidden.');
         await codePage.screenshot({ path: 'staff-dashboard-sidebar.png' });
        console.log('Captured staff dashboard screenshot.');

        // Clean up session
        await codePage.close();
        await setupContext.close();
        await staffContext.close();

        // 7. CLEANUP AS OWNER
        console.log('--- Phase 7: Cleanup ---');
        await page.goto(STAFF_URL);
        await page.waitForSelector('table', { timeout: 10000 });
        
        // Loop to delete all rows with the test name (handles stale data from previous failed runs)
        let found = true;
        while (found) {
            const rowCount = await page.locator('tr').filter({ hasText: TEST_NAME }).count();
            if (rowCount === 0) {
                found = false;
                break;
            }
            
            console.log(`Found ${rowCount} matching staff rows. Deleting one...`);
            const staffRow = page.locator('tr').filter({ hasText: TEST_NAME }).first();
            const menuBtn = staffRow.locator('button').filter({ has: page.locator('.sr-only:text("Toggle menu")') });
            
            if (await menuBtn.isVisible()) {
                await menuBtn.click();
                page.once('dialog', d => d.accept());
                await page.getByRole('menuitem', { name: /Delete/i }).click();
                
                // Wait for the specific row to disappear or the table to update
                await page.waitForTimeout(2000); 
            } else {
                found = false;
            }
        }
        
        await expect(page.locator('table')).not.toContainText(TEST_NAME, { timeout: 15000 });
        console.log('Test staff environment cleaned.');
    });
});
