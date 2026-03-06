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
            // The delete button is typically in the dropdown menu
            await staleRows.first().locator('button:has(.lucide-more-horizontal)').click();
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

        // Wait for the sheet to close and the new PG to appear in the list
        await expect(page.locator(`text=${uniquePgName}`).first()).toBeVisible({ timeout: 15000 });
        console.log('PG created — appeared in dashboard list');

        // Navigate into the newly created PG by clicking "Configure" in its row's dropdown
        const pgRow = page.locator('tr').filter({ hasText: uniquePgName });
        await pgRow.first().locator('button:has(.lucide-more-horizontal)').click();
        await page.click('[role="menuitem"]:has-text("Configure")');

        // Wait for the URL to change to the specific PG management page
        await page.waitForURL('**/dashboard/pg-management/**', { timeout: 15000 });

        // --- 3. Activate Edit Mode ---
        // The "Edit Building" toggle is now a `Pencil` icon button with class `.lucide-pencil`.
        const editButton = page.locator('button:has(.lucide-pencil)').first();
        const doneEditingButton = page.locator('button:has-text("Done")').first();

        try {
            await Promise.race([
                expect(editButton).toBeVisible({ timeout: 25000 }),
                expect(doneEditingButton).toBeVisible({ timeout: 25000 })
            ]);
        } catch (e) {
            await page.screenshot({ path: 'debug-dashboard-no-edit-button.png', fullPage: true });
            throw new Error('PG layout section never appeared. See debug-dashboard-no-edit-button.png');
        }

        // If we are already in edit mode (e.g., from a fresh creation redirect), this will gracefully pass
        if (await editButton.isVisible() && !(await doneEditingButton.isVisible())) {
            console.log('"Edit Building" pencil button is visible, activating edit mode');
            await editButton.click();
        }

        // Confirm we're in edit mode — "Done" button appears
        await expect(doneEditingButton).toBeVisible({ timeout: 5000 });
        console.log('Edit mode activated');

        // --- 4. Add a Floor ---
        // Click the + icon next to Done button to Add Floor
        await page.locator('button:has-text("Done")').locator('xpath=following-sibling::button').click();

        await page.waitForSelector('input[name="name"]', { state: 'visible', timeout: 5000 });
        await page.fill('input[name="name"]', 'Test Ground Floor');
        await page.click('button:has-text("Add Floor")'); // Submit the floor dialog

        // Confirm the floor appeared
        await expect(page.locator('text=Test Ground Floor').first()).toBeVisible({ timeout: 10000 });
        console.log('Floor "Test Ground Floor" added successfully');

        // --- 5. Exit Edit Mode ---
        if (await doneEditingButton.isVisible()) {
            await doneEditingButton.click();
        }

        // --- 6. Cleanup: delete the test PG ---
        await page.goto('/dashboard/pg-management');
        await expect(page.locator('text=Your Properties').first()).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(2000);

        const cleanupRow = page.locator('tr').filter({ hasText: uniquePgName });
        if (await cleanupRow.count() > 0) {
            // Find the dropdown toggle containing `.lucide-more-horizontal`
            await cleanupRow.first().locator('button:has(.lucide-more-horizontal)').click();
            await page.click('[role="menuitem"]:has-text("Delete")');
            await page.click('button:has-text("Continue")');
            await expect(page.locator(`text=${uniquePgName}`)).toHaveCount(0, { timeout: 10000 });
            console.log('Test PG cleaned up successfully');
        }
    });
});
