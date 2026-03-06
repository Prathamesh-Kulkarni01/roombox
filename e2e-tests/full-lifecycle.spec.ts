import { test, expect, Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
test.use({ storageState: 'playwright/.auth/user.json' });
test.setTimeout(180_000);

// Restore Firebase Auth from our custom localStorage carrier
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

const TS = Date.now();
const PG_NAME = `Lifecycle PG ${TS}`;
const GUEST_NAME = `John Doe ${TS}`;
const ROOM_NAME = `Room 101`;
const BED_NAME = `Bed A`;

async function selectPgInHeader(page: Page, pgName: string) {
    const trigger = page.locator('header [role="combobox"]').first();
    await expect(trigger).toBeVisible({ timeout: 15_000 });
    await trigger.click();
    await page.locator(`[role="option"]:has-text("${pgName}")`).click();
    await page.waitForTimeout(1000);
}

test.describe('Full Life-Cycle: From Property Creation to Tenant Payment', () => {

    test('1. Create Property and Configure Layout', async ({ page }) => {
        console.log('\n[Flow 1] Property Creation & Setup');

        // 1.1 Create PG
        await page.goto('/dashboard/pg-management');
        await page.click('button:has-text("Add New Property")');
        await page.fill('input[name="name"]', PG_NAME);
        await page.fill('input[name="location"]', 'E2E Test Area');
        await page.fill('input[name="city"]', 'E2E City');
        await page.click('button:has-text("Add Property")');

        await expect(page.locator(`text=${PG_NAME}`)).toBeVisible({ timeout: 20_000 });
        console.log(`  ✓ Created PG: ${PG_NAME}`);

        // 1.2 Add Floor
        await page.goto('/dashboard');
        await selectPgInHeader(page, PG_NAME);
        await page.click('button:has-text("Edit Building")');
        await page.click('[data-tour="add-floor-button"]');
        await page.fill('input[placeholder="e.g., First Floor"]', 'Ground Floor');
        await page.click('button:has-text("Add Floor")');
        await expect(page.locator('text=Ground Floor')).toBeVisible({ timeout: 10_000 });

        // 1.3 Add Room
        await page.click('[data-tour="add-room-button"]');
        await page.fill('input[placeholder="e.g., 101, A1"]', ROOM_NAME);
        await page.click('[role="tab"]:has-text("Pricing")');
        await page.fill('input[name="rent"]', '5000');
        await page.click('button:has-text("Save")');
        await expect(page.locator(`text=${ROOM_NAME}`)).toBeVisible({ timeout: 10_000 });

        // 1.4 Add Bed
        await page.click('[data-tour="add-bed-button"]');
        await page.fill('input[placeholder="e.g., A, B, 1, 2..."]', BED_NAME);
        await page.click('button:has-text("Add Bed")');
        await expect(page.locator(`text=${BED_NAME}`)).toBeVisible({ timeout: 10_000 });

        await page.click('button:has-text("Done Editing")');
        console.log(`  ✓ Layout configured: ${ROOM_NAME} -> ${BED_NAME}`);
    });

    test('2. Onboard Guest and Verify Dashboard', async ({ page }) => {
        console.log('\n[Flow 2] Guest Onboarding');

        await page.goto('/dashboard');
        await selectPgInHeader(page, PG_NAME);

        // 2.1 Expand Room and Click Add Guest on Bed A
        await page.click(`text=${ROOM_NAME}`);
        const bedCard = page.locator('.aspect-square').filter({ hasText: BED_NAME });
        await bedCard.click(); // Opens Add Guest Dialog

        // 2.2 Fill Guest Details
        await page.fill('input[name="name"]', GUEST_NAME);
        await page.fill('input[name="phone"]', '9876543210');
        await page.fill('input[name="rentAmount"]', '5000');
        await page.fill('input[name="moveInDate"]', new Date().toISOString().split('T')[0]);

        await page.click('button:has-text("Add Guest")');

        // 2.3 Verify on Dashboard
        await expect(page.locator(`text=${GUEST_NAME}`)).toBeVisible({ timeout: 15_000 });
        await expect(page.locator('text=DUE')).toBeVisible(); // Initial status should be DUE

        console.log(`  ✓ Guest onboarded: ${GUEST_NAME}`);
    });

    test('3. Record Payment and Verify Stats', async ({ page }) => {
        console.log('\n[Flow 3] Rent Recording');

        await page.goto('/dashboard');
        await selectPgInHeader(page, PG_NAME);

        // 3.1 Open Payment Dialog from Quick Actions or recent guests
        const guestRow = page.locator('li').filter({ hasText: GUEST_NAME });
        await guestRow.click(); // Should open guest details or payment dialog if configured

        // If clicking row doesn't work, use Quick Action: Record Payment
        if (!(await page.getByText('Record Rent Payment').isVisible())) {
            await page.click('button:has-text("Record Payment")');
            await page.click(`text=${GUEST_NAME}`);
        }

        await page.fill('input[name="amount"]', '5000');
        await page.selectOption('select[name="method"]', 'upi');
        await page.click('button:has-text("Confirm Payment")');

        // 3.2 Verify Status Change
        await expect(page.locator('text=Paid')).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('text=₹5,000')).toBeVisible();

        console.log(`  ✓ Payment recorded for ${GUEST_NAME}`);
    });

    test('4. Cleanup - Delete Property', async ({ page }) => {
        console.log('\n[Flow 4] Cleanup');

        await page.goto('/dashboard/pg-management');
        const row = page.locator('tr').filter({ hasText: PG_NAME });
        await row.locator('button[aria-haspopup="menu"]').click();
        await page.click('text=Delete');
        await page.click('button:has-text("Continue")');

        await expect(row).toBeHidden({ timeout: 15_000 });
        console.log(`  ✓ Property deleted: ${PG_NAME}`);
    });
});
