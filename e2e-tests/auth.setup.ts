import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import { login, logout, OWNER_EMAIL, TENANT_PHONE, TARGET_PG_NAME, TARGET_ROOM_NAME, RUN_ID, OWNER_PASSWORD, TENANT_PASSWORD, selectPgInHeader } from './test-utils';

const AUTH_DIR = path.resolve(process.cwd(), 'playwright/.auth');
const OWNER_AUTH = path.join(AUTH_DIR, 'owner.json');
const TENANT_AUTH = path.join(AUTH_DIR, 'tenant.json');

async function cleanupAllData(page) {
    console.log(`[Cleanup] Starting full data wipe...`);
    
    // 1. Vacate All Guests
    console.log(`[Cleanup] Checking for guests to vacate...`);
    await page.goto('/dashboard/tenant-management', { waitUntil: 'load' });
    
    // Wait for the page to fully load
    await page.waitForTimeout(3000);
    
    // Select "All Properties" in header if multiple exist
    try {
        await selectPgInHeader(page, 'All Properties');
        await page.waitForTimeout(2000);
    } catch (e) {
        console.log(`[Cleanup] Could not select 'All Properties' — may only have one.`);
    }

    let iterations = 0;
    const MAX_ITERATIONS = 20; // Safety cap

    while (iterations < MAX_ITERATIONS) {
        // Look for table body rows that have an action menu (indicating a real guest row)
        const guestRow = page.locator('tbody tr').filter({ has: page.locator('button:has-text("Toggle menu"), button[aria-haspopup="true"]') }).first();
        if (!await guestRow.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log(`[Cleanup] No more active guests found.`);
            break;
        }

        try {
            const guestName = await guestRow.locator('td').first().innerText().catch(() => 'Unknown');
            console.log(`[Cleanup] Vacating guest: ${guestName}...`);
            
            const menuBtn = guestRow.locator('button[aria-haspopup="true"]').first();
            await menuBtn.click();
            await page.getByRole('menuitem', { name: /View Profile/i }).click();
            
            await page.waitForURL(/\/dashboard\/tenant-management\/.+/, { timeout: 30000 });
            
            const vacateBtn = page.getByRole('button', { name: /Vacate Immediately/i });
            if (await vacateBtn.isVisible({ timeout: 10000 })) {
                await vacateBtn.click();
                
                // Ensure WhatsApp is disabled
                const whatsappCheckbox = page.locator('#sendWhatsAppGuest');
                if (await whatsappCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
                    const isChecked = await whatsappCheckbox.getAttribute('aria-checked') === 'true';
                    if (isChecked) await whatsappCheckbox.click();
                }

                await page.getByRole('button', { name: /Confirm Vacate/i }).click();
                // After vacating, the app redirects to /dashboard
                await page.waitForURL(/\/dashboard/, { timeout: 30000 });
                console.log(`[Cleanup] Guest vacated.`);
            } else {
                console.log(`[Cleanup] Vacate button not found, skipping...`);
            }
        } catch (err) {
            console.log(`[Cleanup] Error vacating guest (iteration ${iterations}):`, (err as Error).message);
        }
        
        await page.goto('/dashboard/tenant-management', { waitUntil: 'load' });
        await page.waitForTimeout(2000);
        iterations++;
    }

    // 2. Delete All Properties
    console.log(`[Cleanup] Cleaning up properties...`);
    await page.goto('/dashboard/pg-management', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    
    iterations = 0;
    while (iterations < MAX_ITERATIONS) {
        const pgRow = page.locator('tbody tr').filter({ has: page.locator('button[aria-haspopup="true"]') }).first();
        if (!await pgRow.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log(`[Cleanup] No more properties found.`);
            break;
        }

        try {
            const pgName = await pgRow.locator('td').first().innerText();
            console.log(`[Cleanup] Deleting property: ${pgName}`);
            
            await pgRow.locator('button[aria-haspopup="true"]').first().click();
            await page.getByRole('menuitem', { name: /Delete/i }).click();
            
            await page.getByRole('button', { name: /Continue/i }).click();
            await page.waitForTimeout(3000); // Wait for deletion to reflect
        } catch (err) {
            console.log(`[Cleanup] Error deleting property (iteration ${iterations}):`, (err as Error).message);
        }
        
        await page.goto('/dashboard/pg-management', { waitUntil: 'load' });
        await page.waitForTimeout(2000);
        iterations++;
    }

    console.log(`[Cleanup] Full data wipe complete.`);
}

setup('Authenticate Both Owner and Tenant', async ({ page }) => {
    // 1. Authenticate as Owner
    await login(page, OWNER_EMAIL, { password: OWNER_PASSWORD });
    
    // 2. Comprehensive Cleanup
    await cleanupAllData(page);

    // 3. Setup Property
    console.log(`[Setup] Navigating to PG Management...`);
    await page.goto('/dashboard/pg-management', { waitUntil: 'load' });
    
    console.log(`[Setup] Checking for test property: ${TARGET_PG_NAME}...`);
    // Improved waiting: wait for ANY definitive content
    const contentLocator = page.locator('table, .bg-card, text=Add a Property First, .animate-spin').first();
    await contentLocator.waitFor({ state: 'visible', timeout: 30000 }).catch(() => null);
    
    // If spinner is present, wait for it to disappear
    const spinner = page.locator('.animate-spin').first();
    if (await spinner.isVisible()) {
        console.log(`[Setup] Loading spinner detected. Waiting for it to resolve...`);
        await expect(spinner).toBeHidden({ timeout: 60000 });
    }

    const pgRow = page.locator('tr').filter({ hasText: TARGET_PG_NAME }).first();
    const addPgBtn = page.getByRole('button', { name: /Add (New )?Property/i }).first();
    const emptyStateAddBtn = page.getByRole('link', { name: /Add (a )?Property/i });

    let context = 'UNKNOWN';
    if (await pgRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        context = 'EXISTS';
    } else if (await addPgBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        context = 'MISSING';
    } else if (await emptyStateAddBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        context = 'EMPTY_STATE';
    }

    console.log(`[Setup] Property context: ${context}`);

    if (context !== 'EXISTS') {
        console.log(`[Setup] Creating Property: ${TARGET_PG_NAME}...`);
        if (context === 'EMPTY_STATE') {
            await emptyStateAddBtn.click();
        } else if (await addPgBtn.isVisible()) {
            await addPgBtn.click();
        } else {
            console.log(`[Setup] Forcing click on any Add button...`);
            await page.getByRole('button', { name: /Add/i }).first().click();
        }
        
        await page.locator('input[name="name"]').fill(TARGET_PG_NAME);
        await page.locator('input[name="location"]').fill('Auto Street');
        await page.locator('input[name="city"]').fill('AutoCity');
        await page.getByRole('button', { name: /Add Property|Create/i }).click();
        await expect(page.locator('tr').filter({ hasText: TARGET_PG_NAME }).first()).toBeVisible({ timeout: 30000 });
        console.log(`[Setup] Property created.`);
    } else {
        console.log(`[Setup] Property already exists.`);
    }

    // Select the PG in global header to ensure context is set
    await selectPgInHeader(page, TARGET_PG_NAME);

    // 4. SEED TENANT
    console.log(`[Setup] Navigating to Tenant Management...`);
    await page.goto('/dashboard/tenant-management', { waitUntil: 'load' });

    console.log(`[Setup] Validating Guest Management page...`);
    await expect(page.getByRole('heading', { name: /Guest Management/i })).toBeVisible({ timeout: 60000 });
    
    if (await spinner.isVisible()) {
        console.log(`[Setup] Guest page loading spinner detected. Waiting...`);
        await expect(spinner).toBeHidden({ timeout: 60000 });
    }

    console.log(`[Setup] Opening Add Guest form...`);
    const addGuestBtn = page.getByRole('button', { name: /Add New Guest/i }).first();
    
    if (!await addGuestBtn.isVisible({ timeout: 5000 })) {
         if (await page.getByText(/Add a Property First/i).isVisible({ timeout: 5000 })) {
            console.log(`[Setup] Stuck in 'Add a Property First' state. Forcing reload...`);
            await page.reload({ waitUntil: 'load' });
            await expect(page.getByRole('heading', { name: /Guest Management/i })).toBeVisible({ timeout: 30000 });
         }
    }

    await expect(addGuestBtn).toBeVisible({ timeout: 30000 });
    await addGuestBtn.click();
    
    const guestForm = page.locator('[role="dialog"]');
    await expect(guestForm).toBeVisible({ timeout: 30000 });

    console.log(`[Setup] Filling Add Guest form...`);
    // Property combobox — the first combobox in the "Select Bed" section
    const propertyCombo = guestForm.locator('text=Property').locator('..').locator('[role="combobox"]').first();
    if (!await propertyCombo.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Fallback: click the first combobox with "Select a property..." text
        await guestForm.locator('[role="combobox"]:has-text("Select a property")').first().click();
    } else {
        await propertyCombo.click();
    }
    await page.getByRole('option', { name: TARGET_PG_NAME }).first().click();
    await page.waitForTimeout(1000);
    
    // Room combobox — appears after property selection
    const roomCombo = guestForm.locator('[role="combobox"]:has-text("Select a room")').first();
    if (await roomCombo.isVisible({ timeout: 10000 }).catch(() => false)) {
        await roomCombo.click();
        const roomOption = page.getByRole('option').filter({ hasNotText: /Select/i }).first();
        await expect(roomOption).toBeVisible({ timeout: 15000 });
        await roomOption.click();
        await page.waitForTimeout(1000);
    }

    // Bed combobox — appears after room selection
    const bedCombo = guestForm.locator('[role="combobox"]:has-text("Select a bed")').first();
    if (await bedCombo.isVisible({ timeout: 10000 }).catch(() => false)) {
        await bedCombo.click();
        const bedOption = page.getByRole('option').filter({ hasNotText: /Select/i }).first();
        await expect(bedOption).toBeVisible({ timeout: 15000 });
        await bedOption.click();
        await page.waitForTimeout(1000);
    }

    await guestForm.getByLabel(/Full Name/i).fill(`Auth Tenant ${RUN_ID}`);
    await guestForm.getByLabel(/Phone Number/i).fill(TENANT_PHONE);
    await guestForm.locator('input[name="rentAmount"]').fill('5000');
    
    console.log(`[Setup] Submitting guest form...`);
    await guestForm.getByRole('button', { name: /Add Guest/i, exact: true }).click();
    await expect(guestForm).toBeHidden({ timeout: 30000 });
    console.log(`[Setup] Guest added successfully.`);

    await page.context().storageState({ path: OWNER_AUTH });
    await logout(page);
    await login(page, TENANT_PHONE, { password: TENANT_PASSWORD });
    await page.context().storageState({ path: TENANT_AUTH });
    console.log(`[Setup] Global Auth Setup complete.`);
});
