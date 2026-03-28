import { test as setup, expect, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { login, logout, OWNER_EMAIL, TENANT_PHONE, TARGET_PG_NAME, TARGET_ROOM_NAME, RUN_ID } from './test-utils';

const AUTH_DIR = path.resolve(process.cwd(), 'playwright/.auth');
const OWNER_AUTH = path.join(AUTH_DIR, 'owner.json');
const TENANT_AUTH = path.join(AUTH_DIR, 'tenant.json');

setup('Authenticate Both Owner and Tenant', async ({ page }) => {
    // 1. Authenticate as Owner
    await login(page, OWNER_EMAIL);
    
    // 2. Setup Property
    console.log(`[Setup] Navigating to PG management...`);
    await page.goto('/dashboard/pg-management', { waitUntil: 'load' });
    
    let row = page.locator('tr').filter({ hasText: TARGET_PG_NAME }).first();
    if (!await row.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`[Setup] Creating Property: ${TARGET_PG_NAME}...`);
        await page.getByRole('button', { name: /Add (New )?Property/i }).or(page.locator('button:has-text("Add Property")')).first().click();
        await page.fill('input[name="name"]', TARGET_PG_NAME);
        await page.fill('input[name="location"]', 'Auto Street');
        await page.fill('input[name="city"]', 'AutoCity');
        await page.getByRole('button', { name: /Add Property|Create/i }).or(page.locator('button[type="submit"]')).first().click();
        
        row = page.locator('tr').filter({ hasText: TARGET_PG_NAME }).first();
        await expect(row).toBeVisible({ timeout: 15_000 });
    }

    // 3. SEED TENANT (directly via Tenant Management)
    console.log(`[Setup] Seeding tenant ${TENANT_PHONE} to ${TARGET_PG_NAME}...`);
    await page.goto('/dashboard/tenant-management', { waitUntil: 'load' });
    
    // Cleanup prev test tenant
    const existing = page.locator('tr').filter({ hasText: TENANT_PHONE }).first();
    if (await existing.isVisible().catch(() => false)) {
        console.log(`[Setup] Cleaning up old test record for ${TENANT_PHONE}...`);
        const delBtn = existing.locator('button').filter({ has: page.locator('svg') }).or(existing.locator('button')).last();
        await delBtn.click();
        await page.getByRole('menuitem', { name: /Delete/i }).click();
        await page.getByRole('button', { name: /Confirm/i }).click();
        await page.waitForTimeout(3000); // Give Firestore a moment
    }

    console.log(`[Setup] Opening Add Guest form...`);
    await page.getByRole('button', { name: /Add (New )?Guest/i }).first().click();
    const guestForm = page.locator('role=dialog').or(page.locator('form')).filter({ hasText: /Add/i }).last();
    await expect(guestForm).toBeVisible({ timeout: 10_000 });

    await guestForm.locator('input[name="name"]').fill(`Auth Tenant ${RUN_ID}`);
    await page.keyboard.press('Tab');
    await page.keyboard.type(TENANT_PHONE);
    await page.keyboard.press('Tab');

    // Select Property
    await guestForm.locator('button[role="combobox"]').first().click();
    await page.getByRole('option', { name: TARGET_PG_NAME, exact: true }).first().click();
    
    // Select Room
    await page.waitForTimeout(2000);
    await guestForm.locator('button[role="combobox"]').nth(1).click();
    await page.getByRole('option', { name: new RegExp(`^${TARGET_ROOM_NAME}`, 'i') }).or(page.getByRole('option')).first().click();
    
    // Select Bed
    await page.waitForTimeout(1000);
    const bedCombo = guestForm.locator('button[role="combobox"]').nth(2);
    if (await bedCombo.isVisible().catch(() => false)) {
        await bedCombo.click();
        await page.getByRole('option').first().click();
    }

    // Monthly Rent
    await guestForm.locator('input[name="rentAmount"]').click();
    await page.keyboard.type('5000');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1000);

    console.log(`[Setup] Validating and Submitting...`);
    const submitBtn = guestForm.getByRole('button', { name: /Add Guest|Save|Confirm/i }).first();
    await submitBtn.click({ force: true });
    
    // Fallback if button still "disabled" in Playwright's eyes
    await page.waitForTimeout(2000);
    if (await guestForm.isVisible()) {
        console.log(`[Setup] Form still visible, forcing submission via Enter...`);
        await page.keyboard.press('Enter');
    }

    await expect(guestForm).toBeHidden({ timeout: 20_000 });
    console.log(`[Setup] Tenant seeded successfully.`);

    // Store Owner State for convenience later
    await page.context().storageState({ path: OWNER_AUTH });

    // 4. LOGOUT -> Login TENANT
    await logout(page);
    console.log(`[Setup] Logging in as tenant ${TENANT_PHONE}...`);
    await page.goto('/login', { waitUntil: 'load' });
    const tenantTab = page.getByRole('tab', { name: /Staff \/ Tenant/i });
    if (await tenantTab.isVisible()) await tenantTab.click();
    await page.getByLabel(/Phone/i).fill(TENANT_PHONE);
    await page.getByLabel(/Password/i).fill('Password123!');
    await page.getByRole('button', { name: /Login/i }).click();

    await page.waitForURL('/dashboard');
    await page.context().storageState({ path: TENANT_AUTH });
    console.log(`[Setup] Tenant setup complete.`);
});
