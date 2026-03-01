import { test, expect } from '@playwright/test';

test.setTimeout(90000); // 90 seconds — Firestore cold-start can be slow

// Re-inject Firebase auth token from localStorage into IndexedDB before each test
test.beforeEach(async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
        return new Promise((resolve) => {
            const savedAuth = localStorage.getItem('_playwright_firebase_auth_');
            if (!savedAuth) return resolve(false);
            const parsed = JSON.parse(savedAuth);
            const request = indexedDB.open('firebaseLocalStorageDb');
            request.onupgradeneeded = (event: any) => {
                event.target.result.createObjectStore('firebaseLocalStorage', { keyPath: 'fbase_key' });
            };
            request.onsuccess = (event: any) => {
                const db = event.target.result;
                try {
                    const store = db.transaction(['firebaseLocalStorage'], 'readwrite').objectStore('firebaseLocalStorage');
                    parsed.forEach((item: any) => store.put(item));
                    resolve(true);
                } catch (e) { resolve(false); }
            };
            request.onerror = () => resolve(false);
        });
    });
});

test.describe('Property Layout & Engine', () => {

    test('Owner can add a PG and edit its layout directly from the Dashboard', async ({ page }) => {
        const uniquePgName = `Playwright Test PG ${Date.now()}`;

        // --- 1. Start at PG Management and clean up any old test PGs ---
        await page.goto('/dashboard/pg-management');
        await expect(page.locator('text=Your Properties').first()).toBeVisible({ timeout: 20000 });

        // Wait for PG list to settle
        await page.waitForTimeout(3000);

        // Clean up any leftover "Playwright Test PG" entries from previous runs
        while (true) {
            const staleRows = page.locator('tr').filter({ hasText: 'Playwright Test PG' });
            const count = await staleRows.count();
            if (count === 0) break;
            console.log(`Found ${count} stale test PG(s), cleaning up...`);
            await staleRows.first().locator('button[aria-haspopup="true"]').click();
            await page.click('[role="menuitem"]:has-text("Delete")');
            await page.click('button:has-text("Continue")');
            await page.waitForTimeout(2000);
        }
        console.log('Cleanup complete');

        // --- 2. Create a new PG ---
        await page.click('button:has-text("Add New Property")');
        await page.waitForSelector('input[name="name"]', { state: 'visible', timeout: 8000 });
        await page.fill('input[name="name"]', uniquePgName);
        await page.fill('input[name="location"]', 'Test Area');
        await page.fill('input[name="city"]', 'Test City');
        await page.waitForTimeout(500);

        // Find and click the submit button inside the form  
        await page.click('button[type="submit"]');

        // Should redirect back to /dashboard
        await page.waitForURL('**/dashboard', { timeout: 20000 });
        console.log('PG created — redirected to dashboard');

        // --- 3. Wait for the PG section to appear (either in or out of edit mode) ---
        // The dashboard may start in edit mode ("Done" button) or normal mode ("Edit Building" button)
        // We need to reach the state where we see "Edit Building" to click it
        const editButton = page.locator('button:has-text("Edit Building")');
        const doneEditingButton = page.locator('button:has-text("Done Editing"), button:has-text("Done")').first();

        // Wait for EITHER button to confirm PG data has loaded
        try {
            await Promise.race([
                expect(editButton).toBeVisible({ timeout: 25000 }),
                expect(doneEditingButton).toBeVisible({ timeout: 25000 })
            ]);
        } catch (e) {
            await page.screenshot({ path: 'debug-dashboard-no-edit-button.png', fullPage: true });
            throw new Error('PG layout section never appeared. See debug-dashboard-no-edit-button.png');
        }

        // If we are in edit mode, exit it first
        if (await doneEditingButton.isVisible() && !(await editButton.isVisible())) {
            await doneEditingButton.click();
            await expect(editButton).toBeVisible({ timeout: 5000 });
        }

        console.log('"Edit Building" button is visible');
        await editButton.first().click();

        // Confirm we're in edit mode — "Done" button appears
        await expect(page.locator('button:has-text("Done")').first()).toBeVisible({ timeout: 5000 });
        console.log('Edit mode activated');

        // --- 4. Add a Floor ---
        await page.click('button:has-text("Add New Floor")');
        await page.waitForSelector('input[name="name"]', { state: 'visible', timeout: 5000 });
        await page.fill('input[name="name"]', 'Test Ground Floor');
        await page.click('button:has-text("Add Floor")');

        // Confirm the floor appeared
        await expect(page.locator('text=Test Ground Floor').first()).toBeVisible({ timeout: 10000 });
        console.log('Floor "Test Ground Floor" added successfully');

        // --- 5. Exit Edit Mode ---
        const doneButton = page.locator('button:has-text("Done Editing")');
        if (await doneButton.isVisible()) {
            await doneButton.click();
        }

        // --- 6. Cleanup: delete the test PG ---
        await page.goto('/dashboard/pg-management');
        await expect(page.locator('text=Your Properties').first()).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(2000);

        const pgRow = page.locator('tr').filter({ hasText: uniquePgName });
        if (await pgRow.count() > 0) {
            await pgRow.first().locator('button[aria-haspopup="true"]').click();
            await page.click('[role="menuitem"]:has-text("Delete")');
            await page.click('button:has-text("Continue")');
            await expect(page.locator(`text=${uniquePgName}`)).toHaveCount(0, { timeout: 10000 });
            console.log('Test PG cleaned up successfully');
        }
    });
});
