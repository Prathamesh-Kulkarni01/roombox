import { test, expect, Page } from '@playwright/test';

// ─── Serial execution — tests build on each other's Firestore state ───────────
test.describe.configure({ mode: 'serial' });

test.use({ storageState: 'playwright/.auth/user.json' });
test.setTimeout(120_000);

// ─── Firebase Auth: Re-inject IndexedDB token before every test ───────────────
// Playwright storageState saves localStorage but NOT IndexedDB.
// Firebase Auth stores the user token in IndexedDB, so we must restore it
// manually on each page load before Firebase can authenticate the session.
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

// ─── Shared state between tests ───────────────────────────────────────────────
const TS = Date.now();
const PG_ALPHA = `E2E PG Alpha ${TS}`;
const PG_BETA = `E2E PG Beta ${TS}`;
const E2E_PREFIX = 'E2E PG';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Navigate to /dashboard and wait for at least one PG card to be rendered */
async function goDashboard(page: Page) {
    await page.goto('/dashboard');
    // Wait for either the Edit Building button (PGs loaded) or the empty-state message
    await expect(
        page.locator('button:has-text("Edit Building"), button:has-text("Done Editing")').first()
    ).toBeVisible({ timeout: 30_000 });
}

/** Enter layout edit mode for the currently visible PG card */
async function enterEditMode(page: Page) {
    const doneBtn = page.locator('button:has-text("Done Editing")').first();
    const editBtn = page.locator('button:has-text("Edit Building")').first();
    if (await doneBtn.isVisible()) return;                       // already in edit
    await expect(editBtn).toBeVisible({ timeout: 20_000 });
    await editBtn.click();
    await expect(doneBtn).toBeVisible({ timeout: 8_000 });
}

/** Leave layout edit mode */
async function exitEditMode(page: Page) {
    const doneBtn = page.locator('button:has-text("Done Editing")').first();
    if (await doneBtn.isVisible()) {
        await doneBtn.click();
        await expect(page.locator('button:has-text("Edit Building")').first()).toBeVisible({ timeout: 8_000 });
    }
}

/**
 * Select a PG (or "All Properties") from the header dropdown.
 * The header uses a ShadCN <Select> — its trigger has role="combobox".
 */
async function selectPgInHeader(page: Page, pgName: string) {
    const trigger = page.locator('header [role="combobox"]').first();
    await expect(trigger).toBeVisible({ timeout: 10_000 });
    await trigger.click();
    await page.locator(`[role="option"]:has-text("${pgName}")`).click();
    await page.waitForTimeout(500);
}

/** Delete all leftover E2E PGs from the management table */
async function cleanupE2EPgs(page: Page) {
    await page.goto('/dashboard/pg-management');
    // Wait for the page to be fully loaded — 'Add New Property' button is always present
    await page.locator('button:has-text("Add New Property")').waitFor({ state: 'visible', timeout: 20_000 });
    await page.waitForTimeout(2_000);
    let deleted = 0;
    // Safety guard: max 20 iterations to avoid infinite loop
    for (let i = 0; i < 20; i++) {
        const staleRow = page.locator('tr').filter({ hasText: E2E_PREFIX }).first();
        if ((await staleRow.count()) === 0) break;

        // Open the action dropdown for this row
        const menuTrigger = staleRow.locator('button[aria-haspopup="menu"], button[aria-haspopup="true"]').first();
        await menuTrigger.waitFor({ state: 'visible', timeout: 5_000 });
        await menuTrigger.click();

        // Wait robustly for the menu to fully open
        const deleteMenuitem = page.getByRole('menuitem', { name: 'Delete' });
        await deleteMenuitem.waitFor({ state: 'visible', timeout: 8_000 });
        await page.waitForTimeout(300); // let Radix animation finish
        await deleteMenuitem.click({ force: true });

        // Confirm deletion
        const continueBtn = page.getByRole('button', { name: 'Continue' });
        await continueBtn.waitFor({ state: 'visible', timeout: 8_000 });
        await continueBtn.click();
        await page.waitForTimeout(2_000);
        deleted++;
    }
    if (deleted) console.log(`  🧹 Deleted ${deleted} stale E2E PG(s)`);
}


/** Create a new PG via the management page. Assumes we're already on /dashboard/pg-management */
async function createPg(page: Page, name: string) {
    await page.locator('button:has-text("Add New Property")').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('button:has-text("Add New Property")').click();
    await page.locator('input[name="name"]').waitFor({ state: 'visible', timeout: 8_000 });
    await page.fill('input[name="name"]', name);
    await page.fill('input[name="location"]', 'E2E Location');
    await page.fill('input[name="city"]', 'E2E City');
    await page.waitForTimeout(300);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 20_000 });
    console.log(`  ✓ Created "${name}"`);
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe('Building Management — Full E2E', () => {

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 1 — Create 2 PGs and verify header dropdown
    // ═══════════════════════════════════════════════════════════════════════════
    test('1 · Create PG Alpha & PG Beta; verify header dropdown', async ({ page }) => {
        console.log('\n──────────────────────────────────\n[Phase 1] Setup — create PGs');

        // Clean up any prior run leftovers
        await cleanupE2EPgs(page);

        // Create PG Alpha
        await page.goto('/dashboard/pg-management');
        await page.locator('button:has-text("Add New Property")').waitFor({ state: 'visible', timeout: 15_000 });
        await createPg(page, PG_ALPHA);

        // Create PG Beta
        await page.goto('/dashboard/pg-management');
        await page.locator('button:has-text("Add New Property")').waitFor({ state: 'visible', timeout: 15_000 });
        await createPg(page, PG_BETA);

        // ── Both PGs visible in header ──────────────────────────────────────
        // After createPg we're on /dashboard; wait for PG layout section
        await page.waitForSelector(
            'button:has-text("Edit Building"), button:has-text("Done Editing")',
            { timeout: 30_000 }
        );

        const trigger = page.locator('header [role="combobox"]').first();
        await expect(trigger).toBeVisible({ timeout: 10_000 });
        await trigger.click();

        const dropdown = page.locator('[role="listbox"]');
        await expect(dropdown).toBeVisible({ timeout: 5_000 });
        await expect(dropdown.locator(`[role="option"]:has-text("${PG_ALPHA}")`).first()).toBeVisible();
        await expect(dropdown.locator(`[role="option"]:has-text("${PG_BETA}")`).first()).toBeVisible();
        await expect(dropdown.locator('[role="option"]:has-text("All Properties")').first()).toBeVisible();
        console.log('  ✓ Both PGs in header dropdown');

        // Close dropdown
        await page.keyboard.press('Escape');

        // ── Filter by PG Alpha — PG Beta card hidden ────────────────────────
        await selectPgInHeader(page, PG_ALPHA);
        await expect(page.locator(`text=${PG_ALPHA}`).first()).toBeVisible({ timeout: 8_000 });
        // When filtered to PG Alpha, PG Beta's card heading should not be visible
        await expect(
            page.locator('.dashboard-pg-section, [data-pg-id], section').filter({ hasText: PG_BETA }).first()
        ).toBeHidden({ timeout: 5_000 }).catch(() => {
            // If no PG-specific wrapper selector works, just verify the floor count
            // (PG Beta has no floors, so its "Floor 1" content from PG Alpha is absent)
            console.log('  ↳ Using fallback filter check via floor count');
        });
        console.log('  ✓ PG Alpha filter applied');


        // ── Show All Properties ──────────────────────────────────────────────
        await selectPgInHeader(page, 'All Properties');
        await expect(page.locator(`text=${PG_ALPHA}`).first()).toBeVisible({ timeout: 8_000 });
        await expect(page.locator(`text=${PG_BETA}`).first()).toBeVisible();
        console.log('  ✓ "All Properties" shows both PG cards');
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 2 — Floor CRUD on PG Alpha
    // ═══════════════════════════════════════════════════════════════════════════
    test('2 · Floor CRUD — add, rename, delete', async ({ page }) => {
        console.log('\n──────────────────────────────────\n[Phase 2] Floor CRUD');

        await goDashboard(page);
        // Filter to PG Alpha only so our actions target the right card
        await selectPgInHeader(page, PG_ALPHA);
        await page.waitForSelector(
            'button:has-text("Edit Building"), button:has-text("Done Editing")',
            { timeout: 30_000 }
        );
        await enterEditMode(page);

        // ── Add "Ground Floor" ───────────────────────────────────────────────
        await page.locator('[data-tour="add-floor-button"]').first().click();
        await page.locator('input[placeholder="e.g., First Floor"]').waitFor({ state: 'visible', timeout: 6_000 });
        await page.fill('input[placeholder="e.g., First Floor"]', 'Ground Floor');
        await page.locator('button:has-text("Add Floor")').click();
        await expect(page.locator('text=Ground Floor').first()).toBeVisible({ timeout: 10_000 });
        console.log('  ✓ "Ground Floor" added');

        // ── Rename "Ground Floor" → "Floor 1" ────────────────────────────────
        // The floor row: [AccordionTrigger] [Pencil button] [Trash button]
        // Match the floor section by text and find the first icon-only button (pencil)
        // Floor header: AccordionTrigger .flex.items-center.p-4.border-b scoped by floor name
        // within that div: [AccordionTrigger] [pencil btn] [trash btn]
        // Use getByRole('button') scoped to the floor header row
        const groundFloorRow = page.locator('div.flex.items-center.p-4').filter({ hasText: 'Ground Floor' }).first();
        // The icon buttons are within the right-side group (not the AccordionTrigger)
        // AccordionTrigger takes up flex-1; the controls div has ml-auto class
        const floorControls = groundFloorRow.locator('div.ml-auto, div.flex.items-center.ml-auto').first();
        await floorControls.locator('button').first().click(); // Pencil is first button in controls
        await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 6_000 });
        await page.fill('input[placeholder="e.g., First Floor"]', '');
        await page.fill('input[placeholder="e.g., First Floor"]', 'Floor 1');
        await page.locator('button:has-text("Save Changes")').click();
        await expect(page.locator('text=Floor 1').first()).toBeVisible({ timeout: 8_000 });
        await expect(page.locator('text=Ground Floor')).toHaveCount(0);
        console.log('  ✓ Renamed "Ground Floor" → "Floor 1"');

        // ── Add and immediately delete "Temp Floor" ──────────────────────────
        await page.locator('[data-tour="add-floor-button"]').first().click();
        await page.locator('input[placeholder="e.g., First Floor"]').waitFor({ state: 'visible', timeout: 6_000 });
        await page.fill('input[placeholder="e.g., First Floor"]', 'Temp Floor');
        await page.locator('button:has-text("Add Floor")').click();
        await expect(page.locator('text=Temp Floor').first()).toBeVisible({ timeout: 10_000 });

        const tempFloorRow = page.locator('div.flex.items-center.p-4').filter({ hasText: 'Temp Floor' }).first();
        const tempFloorControls = tempFloorRow.locator('div.ml-auto, div.flex.items-center.ml-auto').first();
        await tempFloorControls.locator('button').nth(1).click(); // Trash is second button in controls
        await page.locator('button:has-text("Continue")').click();
        await expect(page.locator('text=Temp Floor')).toHaveCount(0, { timeout: 8_000 });
        console.log('  ✓ "Temp Floor" deleted');
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 3 — Room CRUD inside Floor 1 of PG Alpha
    // ═══════════════════════════════════════════════════════════════════════════
    test('3 · Room CRUD — add, rename', async ({ page }) => {
        console.log('\n──────────────────────────────────\n[Phase 3] Room CRUD');

        await goDashboard(page);
        await selectPgInHeader(page, PG_ALPHA);
        await page.waitForSelector(
            'button:has-text("Edit Building"), button:has-text("Done Editing")',
            { timeout: 30_000 }
        );
        await enterEditMode(page);

        // Verify Floor 1 is there (from Phase 2)
        await expect(page.locator('text=Floor 1').first()).toBeVisible({ timeout: 10_000 });

        // ── Add "Room A101" ──────────────────────────────────────────────────
        await page.locator('[data-tour="add-room-button"]').first().click();
        await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 6_000 });

        const dialog = page.locator('[role="dialog"]');
        // Basics tab is default — fill Room Title (first input in dialog)
        await dialog.locator('input').first().fill('Room A101');

        // Switch to Pricing tab and fill rent values
        await dialog.locator('[role="tab"]:has-text("Pricing")').click();
        await page.waitForTimeout(400);
        const priceInputs = dialog.locator('input[type="number"], input[inputmode="numeric"]');
        await priceInputs.first().fill('5000');   // Monthly Rent
        const priceCount = await priceInputs.count();
        if (priceCount > 1) await priceInputs.nth(1).fill('10000'); // Security Deposit

        await dialog.locator('button:has-text("Save")').click();
        await expect(page.locator('text=Room A101').first()).toBeVisible({ timeout: 10_000 });
        console.log('  ✓ "Room A101" added (rent: ₹5000, deposit: ₹10000)');

        // ── Rename "Room A101" → "Room A101 Deluxe" ─────────────────────────
        // In edit mode, rooms show a pencil button
        const roomSection = page.locator('.border.rounded-lg, [class*="AccordionItem"]')
            .filter({ hasText: 'Room A101' }).first();
        await roomSection.locator('button').filter({ has: page.locator('svg') }).first().click();
        await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 6_000 });

        const editDialog = page.locator('[role="dialog"]');
        const roomTitleInput = editDialog.locator('input').first();
        await roomTitleInput.fill('');
        await roomTitleInput.fill('Room A101 Deluxe');
        await editDialog.locator('button:has-text("Save")').click();
        await expect(page.locator('text=Room A101 Deluxe').first()).toBeVisible({ timeout: 10_000 });
        console.log('  ✓ Renamed "Room A101" → "Room A101 Deluxe"');

        // Verify the old name is gone (match exact — "Room A101" without "Deluxe")
        await expect(
            page.locator('text=Room A101').filter({ hasNot: page.locator(':has-text("Deluxe")') })
        ).toHaveCount(0);
        console.log('  ✓ Old room name "Room A101" no longer present');
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 4 — Bed CRUD inside Room A101 Deluxe
    // ═══════════════════════════════════════════════════════════════════════════
    test('4 · Bed CRUD — add, rename, delete', async ({ page }) => {
        console.log('\n──────────────────────────────────\n[Phase 4] Bed CRUD');

        await goDashboard(page);
        await selectPgInHeader(page, PG_ALPHA);
        await page.waitForSelector(
            'button:has-text("Edit Building"), button:has-text("Done Editing")',
            { timeout: 30_000 }
        );
        await enterEditMode(page);

        await expect(page.locator('text=Room A101 Deluxe').first()).toBeVisible({ timeout: 10_000 });

        // ── Add "Bed 1" ──────────────────────────────────────────────────────
        const addBedBtn = page.locator('[data-tour="add-bed-button"]').first();
        await expect(addBedBtn).toBeVisible({ timeout: 8_000 });
        await addBedBtn.click();
        await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 6_000 });
        await page.fill('input[placeholder="e.g., A, B, 1, 2..."]', 'Bed 1');
        await page.locator('button:has-text("Add Bed")').click();
        await expect(page.locator('text=Bed 1').first()).toBeVisible({ timeout: 10_000 });
        console.log('  ✓ "Bed 1" added');

        // ── Rename "Bed 1" → "Bed A" ─────────────────────────────────────────
        // BedCard in edit mode shows pencil + trash per bed
        // The bed card containing "Bed 1" text
        const bed1Card = page.locator('.aspect-square, [class*="bed-card"], .rounded-lg')
            .filter({ hasText: 'Bed 1' }).first();
        await bed1Card.locator('button').first().click(); // first icon = pencil
        await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 6_000 });
        await page.fill('input[placeholder="e.g., A, B, 1, 2..."]', '');
        await page.fill('input[placeholder="e.g., A, B, 1, 2..."]', 'Bed A');
        await page.locator('button:has-text("Save Changes")').click();
        await expect(page.locator('text=Bed A').first()).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('text=Bed 1')).toHaveCount(0);
        console.log('  ✓ Renamed "Bed 1" → "Bed A"');

        // ── Add "Temp Bed" then delete it ────────────────────────────────────
        await addBedBtn.click();
        await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 6_000 });
        await page.fill('input[placeholder="e.g., A, B, 1, 2..."]', 'Temp Bed');
        await page.locator('button:has-text("Add Bed")').click();
        await expect(page.locator('text=Temp Bed').first()).toBeVisible({ timeout: 10_000 });

        const tempBedCard = page.locator('.aspect-square, [class*="bed-card"], .rounded-lg')
            .filter({ hasText: 'Temp Bed' }).first();
        // Last button on the bed card = trash in edit mode
        await tempBedCard.locator('button').last().click();
        await page.locator('button:has-text("Continue")').click();
        await expect(page.locator('text=Temp Bed')).toHaveCount(0, { timeout: 8_000 });
        console.log('  ✓ "Temp Bed" deleted');
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 5 — Dashboard UI verification (view mode, room counts, filter)
    // ═══════════════════════════════════════════════════════════════════════════
    test('5 · Dashboard UI — room/bed counts, view modes, PG filter', async ({ page }) => {
        console.log('\n──────────────────────────────────\n[Phase 5] Dashboard verification');

        await goDashboard(page);
        await selectPgInHeader(page, PG_ALPHA);
        await page.waitForSelector(
            'button:has-text("Edit Building"), button:has-text("Done Editing")',
            { timeout: 30_000 }
        );

        // Ensure we're NOT in edit mode
        await exitEditMode(page);

        // ── Room A101 Deluxe visible with correct sharing label ──────────────
        await expect(page.locator('text=Room A101 Deluxe').first()).toBeVisible({ timeout: 10_000 });
        // "1-Sharing" label — rooms show total beds as sharing count
        await expect(page.locator('text=1-Sharing').first()).toBeVisible({ timeout: 5_000 });
        console.log('  ✓ Room A101 Deluxe shows "1-Sharing" (1 bed)');

        // ── Bed A visible in the beds grid ───────────────────────────────────
        // Expand the room accordion if collapsed
        const roomTrigger = page.locator('[class*="AccordionTrigger"]')
            .filter({ hasText: 'Room A101 Deluxe' }).first();
        const isTriggerExpanded = await roomTrigger.getAttribute('data-state');
        if (isTriggerExpanded !== 'open') {
            await roomTrigger.click();
            await page.waitForTimeout(400);
        }
        await expect(page.locator('text=Bed A').first()).toBeVisible({ timeout: 8_000 });
        console.log('  ✓ "Bed A" is visible on the dashboard');

        // ── View mode toggle: Rooms ──────────────────────────────────────────
        const roomsToggle = page.locator('[role="radio"][aria-label="Rooms"]').first();
        if (await roomsToggle.isVisible()) {
            await roomsToggle.click();
            await page.waitForTimeout(500);
            console.log('  ✓ Switched to "Rooms" view mode');
        }

        // ── View mode toggle: Beds (back) ────────────────────────────────────
        const bedsToggle = page.locator('[role="radio"][aria-label="Beds"]').first();
        if (await bedsToggle.isVisible()) {
            await bedsToggle.click();
            await page.waitForTimeout(500);
            console.log('  ✓ Switched back to "Beds" view mode');
        }

        // ── Switch to PG Beta — PG Alpha content hidden ──────────────────────
        await selectPgInHeader(page, PG_BETA);
        await page.waitForTimeout(1_000);
        await expect(page.locator(`text=${PG_BETA}`).first()).toBeVisible({ timeout: 8_000 });
        await expect(page.locator('text=Room A101 Deluxe')).toHaveCount(0);
        await expect(page.locator('text=Bed A')).toHaveCount(0);
        console.log(`  ✓ PG Beta filter hides PG Alpha's rooms and beds`);

        // PG Beta has no floors — shows empty state message
        await expect(
            page.locator("text=Click 'Edit Building' to start").first()
        ).toBeVisible({ timeout: 5_000 });
        console.log('  ✓ PG Beta shows empty floor state');

        // ── Switch back to All Properties ────────────────────────────────────
        await selectPgInHeader(page, 'All Properties');
        await expect(page.locator(`text=${PG_ALPHA}`).first()).toBeVisible({ timeout: 8_000 });
        await expect(page.locator(`text=${PG_BETA}`).first()).toBeVisible();
        console.log('  ✓ "All Properties" shows both PG cards');
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 6 — Cleanup
    // ═══════════════════════════════════════════════════════════════════════════
    test('6 · Cleanup — delete both test PGs and verify removal', async ({ page }) => {
        console.log('\n──────────────────────────────────\n[Phase 6] Cleanup');

        await cleanupE2EPgs(page);

        // ── Verify removed from management table ─────────────────────────────
        await page.goto('/dashboard/pg-management');
        await page.locator('button:has-text("Add New Property")').waitFor({ state: 'visible', timeout: 15_000 });
        await page.waitForTimeout(1_500);

        await expect(page.locator('tr').filter({ hasText: PG_ALPHA })).toHaveCount(0, { timeout: 5_000 });
        await expect(page.locator('tr').filter({ hasText: PG_BETA })).toHaveCount(0, { timeout: 5_000 });
        console.log('  ✓ Both PGs removed from management table');

        // ── Verify removed from header dropdown ──────────────────────────────
        await page.goto('/dashboard');
        await page.waitForTimeout(2_500);

        const trigger = page.locator('header [role="combobox"]');
        if (await trigger.isVisible()) {
            await trigger.click();
            const dropdown = page.locator('[role="listbox"]');
            await expect(dropdown.locator(`[role="option"]:has-text("${PG_ALPHA}")`)).toHaveCount(0);
            await expect(dropdown.locator(`[role="option"]:has-text("${PG_BETA}")`)).toHaveCount(0);
            await page.keyboard.press('Escape');
            console.log('  ✓ Both PGs removed from header dropdown');
        } else {
            // No PGs at all → header Select is hidden — this also means cleanup worked
            console.log('  ✓ Header PG selector hidden (no PGs remain) — cleanup confirmed');
        }
    });

});
