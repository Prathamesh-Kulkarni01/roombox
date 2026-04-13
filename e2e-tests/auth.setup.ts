import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import { login, logout, OWNER_EMAIL, TENANT_PHONE, TARGET_PG_NAME, TARGET_ROOM_NAME, RUN_ID, OWNER_PASSWORD, TENANT_PASSWORD } from './test-utils';

const AUTH_DIR = path.resolve(process.cwd(), 'playwright/.auth');
const OWNER_AUTH = path.join(AUTH_DIR, 'owner.json');
const TENANT_AUTH = path.join(AUTH_DIR, 'tenant.json');

setup('Authenticate Both Owner and Tenant', async ({ page }) => {
    // 1. Authenticate as Owner
    await login(page, OWNER_EMAIL, { password: OWNER_PASSWORD });
    
    // 2. Setup Property
    console.log(`[Setup] Checking for test property: ${TARGET_PG_NAME}...`);
    await page.goto('/dashboard/pg-management', { waitUntil: 'load' });
    
    let row = page.locator('tr').filter({ hasText: TARGET_PG_NAME }).first();
    if (!await row.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`[Setup] Creating Property: ${TARGET_PG_NAME}...`);
        await page.getByRole('button', { name: /Add (New )?Property/i }).first().click();
        await page.locator('input[name="name"]').fill(TARGET_PG_NAME);
        await page.locator('input[name="location"]').fill('Auto Street');
        await page.locator('input[name="city"]').fill('AutoCity');
        await page.getByRole('button', { name: /Add Property|Create/i }).click();
        await expect(page.locator('tr').filter({ hasText: TARGET_PG_NAME }).first()).toBeVisible({ timeout: 15_000 });
    }

    // 3. SEED TENANT
    console.log(`[Setup] Seeding tenant ${TENANT_PHONE}...`);
    await page.goto('/dashboard/tenant-management', { waitUntil: 'load' });
    
    // Cleanup prev
    const existing = page.locator('tr').filter({ hasText: TENANT_PHONE }).first();
    if (await existing.isVisible().catch(() => false)) {
        await existing.locator('button').last().click();
        await page.getByRole('menuitem', { name: /Delete/i }).click();
        await page.getByRole('button', { name: /Confirm/i }).click();
        await page.waitForTimeout(2000);
    }

    await page.getByRole('button', { name: /Add (New )?Guest/i }).first().click();
    const guestForm = page.locator('role=dialog');
    await expect(guestForm).toBeVisible();

    await guestForm.locator('input[name="name"]').fill(`Auth Tenant ${RUN_ID}`);
    await guestForm.locator('input[name="phone"]').fill(TENANT_PHONE).catch(async () => {
        // Fallback for custom phone inputs
        await guestForm.locator('input[name="name"]').click();
        await page.keyboard.press('Tab');
        await page.keyboard.type(TENANT_PHONE);
    });
    
    // Select PG
    const pgCombo = guestForm.locator('button[role="combobox"]').first();
    await pgCombo.click();
    await page.getByRole('option', { name: TARGET_PG_NAME }).first().click();
    
    // Select Room (Wait for it to populate after PG selection)
    await page.waitForTimeout(1500);
    const roomCombo = guestForm.locator('button[role="combobox"]').nth(1);
    await roomCombo.click();
    await page.getByRole('option').first().click();

    // Rent
    await guestForm.locator('input[name="rentAmount"]').fill('5000');
    
    // Submit
    const submitBtn = guestForm.getByRole('button', { name: /Add New Guest|Save|Create/i }).first();
    await submitBtn.click();
    await expect(guestForm).toBeHidden({ timeout: 25_000 });


    // Store Owner State
    await page.context().storageState({ path: OWNER_AUTH });

    // 4. LOGIN TENANT
    await logout(page);
    await login(page, TENANT_PHONE, { password: TENANT_PASSWORD });
    await page.context().storageState({ path: TENANT_AUTH });
    console.log(`[Setup] Global Auth Setup complete.`);
});

