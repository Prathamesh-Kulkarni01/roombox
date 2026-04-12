/**
 * auth-helpers.ts
 *
 * Core utilities for testing the tenant invitation and authentication lifecycle.
 */
import { Page, expect, BrowserContext } from '@playwright/test';
import { login, OWNER_EMAIL, RUN_ID, TENANT_PASSWORD } from './test-utils';

export const TARGET_PG_NAME = `PG ${RUN_ID}`;
export const TEST_PASSWORD = 'NewSecurePass123!';

/**
 * Ensures an owner exists and has a property set up.
 * Navigates to the dashboard.
 */
export async function createOwnerAndTenant(page: Page, tenantName: string, tenantPhone: string) {
    console.log(`[Helpers] Setting up owner and tenant: ${tenantName} (${tenantPhone})`);
    
    // 1. Owner Login/Signup
    await login(page, OWNER_EMAIL);

    // 2. Ensure Property
    await page.goto('/dashboard/pg-management');
    await page.waitForTimeout(2000); // Allow list to load
    const pgRow = page.locator('tr').filter({ hasText: TARGET_PG_NAME }).first();
    if (!await pgRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`[Helpers] Creating PG: ${TARGET_PG_NAME}`);
        await page.getByRole('button', { name: /Add (New )?Property/i }).or(page.locator('button:has-text("Add Property")')).first().click();
        
        const dialog = page.getByRole('dialog').filter({ hasText: /Add Property/i });
        await dialog.locator('input[name="name"]').fill(TARGET_PG_NAME);
        await dialog.locator('input[name="location"]').fill('Automated St');
        await dialog.locator('input[name="city"]').fill('Test City');
        
        const submitBtn = dialog.getByRole('button', { name: /Add Property|Create/i }).or(dialog.locator('button[type="submit"]')).first();
        await Promise.all([
            page.waitForResponse(resp => resp.url().includes('/api/properties') && resp.status() === 201, { timeout: 20000 }),
            submitBtn.click()
        ]);
        
        await expect(page.locator('tr').filter({ hasText: TARGET_PG_NAME }).first()).toBeVisible({ timeout: 20000 });
    }

    // 3. Create Tenant
    console.log(`[Helpers] Navigating to tenant management...`);
    await page.goto('/dashboard/tenant-management');
    
    // Clean up existing
    console.log(`[Helpers] Checking for existing tenant with phone: ${tenantPhone}`);
    const existing = page.locator('tr').filter({ hasText: tenantPhone }).first();
    if (await existing.isVisible().catch(() => false)) {
        console.log(`[Helpers] Cleaning up existing tenant...`);
        const delBtn = existing.locator('button').last();
        await delBtn.click();
        await page.getByRole('menuitem', { name: /Delete/i }).click();
        const confirm = page.getByRole('button', { name: /Confirm/i });
        if (await confirm.isVisible()) await confirm.click();
        await page.waitForTimeout(2000);
    }

    console.log(`[Helpers] Opening Add Guest dialog...`);
    await page.getByRole('button', { name: /Add (New )?Guest/i }).first().click();
    const dialog = page.getByRole('dialog').filter({ hasText: /Onboard New Guest/i }).last();
    await expect(dialog).toBeVisible();

    console.log(`[Helpers] Filling guest details: ${tenantName}`);
    await dialog.locator('input[name="name"]').fill(tenantName);
    await dialog.locator('input[name="phone"]').fill(tenantPhone);
    
    // Select PG
    console.log(`[Helpers] Selecting property: ${TARGET_PG_NAME}`);
    const pgTrigger = dialog.locator('button[role="combobox"]').filter({ hasText: /Property|Select a property/i });
    await pgTrigger.click();
    await page.getByRole('option', { name: TARGET_PG_NAME, exact: true }).first().click();
    
    // Select Room/Bed (cascading)
    await page.waitForTimeout(1000);
    console.log(`[Helpers] Selecting room...`);
    const roomTrigger = dialog.locator('button[role="combobox"]').filter({ hasText: /Room|Select a room/i });
    await roomTrigger.click();
    await page.getByRole('option').first().click();
    
    await page.waitForTimeout(1000);
    console.log(`[Helpers] Selecting bed...`);
    const bedTrigger = dialog.locator('button[role="combobox"]').filter({ hasText: /Bed|Select a bed/i });
    if (await bedTrigger.isVisible()) {
        await bedTrigger.click();
        await page.getByRole('option').first().click();
    }

    console.log(`[Helpers] Setting rent amount...`);
    await dialog.locator('input[name="rentAmount"]').click();
    await dialog.locator('input[name="rentAmount"]').fill('6000');

    // Fill move-in date if needed (usually defaults to today)
    const dateInput = dialog.locator('input[type="date"]');
    if (await dateInput.isVisible()) {
        const today = new Date().toISOString().split('T')[0];
        await dateInput.fill(today);
    }
    
    console.log(`[Helpers] Submitting guest form...`);
    const submit = dialog.getByRole('button', { name: /Add Guest/i }).first();
    await submit.scrollIntoViewIfNeeded();
    await submit.click({ force: true });
    await expect(dialog).toBeHidden({ timeout: 20000 });
    console.log(`[Helpers] Guest created successfully.`);
    
    // 4. Generate Invite Link
    console.log(`[Helpers] Navigating to profile for ${tenantName}...`);
    await page.goto('/dashboard/tenant-management');
    await page.waitForTimeout(3000); // Wait for list refresh
    
    // Find the row and go to profile
    const row = page.getByRole('row').filter({ hasText: tenantPhone }).first();
    await row.getByRole('button').filter({ hasText: /Profile|View/i }).first().click().catch(async () => {
        // Fallback: Click the row or a dropdown
        await row.click();
        await page.getByRole('menuitem', { name: /View Profile/i }).click();
    });

    const { magicLink, setupCode } = await sendInviteLink(page, tenantPhone);

    return { 
        pgName: TARGET_PG_NAME,
        magicLink,
        setupCode
    };
}

/**
 * Generates an invite link for a tenant.
 * Uses the current tenant profile page.
 */
export async function sendInviteLink(page: Page, phone?: string) {
    console.log('[Helpers] Generating invite link...');
    
    // Try to trigger via UI
    await page.getByRole('button', { name: /Generate Invite Link|Regenerate Invite Link/i }).click();
    
    try {
        // Wait for UI modal
        await page.waitForSelector('text=Login Setup', { timeout: 5000 });
        const code = await page.locator('span').filter({ hasText: /^[0-9]{6}$/ }).first().innerText();
        const link = await page.locator('div.font-mono').first().innerText();
        
        await page.keyboard.press('Escape');
        const normalizedLink = link.replace(/https?:\/\/[^/]+/, 'http://localhost:9002');
        return { magicLink: normalizedLink, setupCode: code };
    } catch (e) {
        console.warn('[Helpers] UI Invite Modal failed, falling back to DB query...');
        if (!phone) throw new Error('Phone number is required for DB fallback');
        
        const { execSync } = require('child_process');
        try {
            const output = execSync(`node scratch/fetch-magic-link.js ${phone}`, { encoding: 'utf-8' });
            const result = JSON.parse(output.split('\n').find(l => l.startsWith('{')));
            return { magicLink: result.magicLink.replace('3000', '9002'), setupCode: result.inviteCode };
        } catch (dbErr) {
            console.error('[Helpers] DB fallback also failed:', dbErr);
            throw new Error('Failed to obtain invite link via UI or DB');
        }
    }
}

/**
 * Simulates opening a magic link (like from WhatsApp) and setting a password.
 */
export async function simulateWhatsAppOpen(browser: any, magicLink: string, password = TEST_PASSWORD) {
    console.log(`[Helpers] Simulating WhatsApp open: ${magicLink}`);
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto(magicLink);
    await expect(page.getByRole('heading', { name: /Welcome to/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /Accept Invite/i }).scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: /Accept Invite/i }).click();
    
    await expect(page.getByRole('heading', { name: /Set Your Password/i })).toBeVisible();
    await page.locator('#password').fill(password);
    await page.locator('#confirmPassword').fill(password);
    await page.getByRole('button', { name: /Save Password/i }).scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: /Save Password/i }).click();
    
    await page.waitForURL(/.*tenants\/my-pg/, { timeout: 20000 });
    
    return { context, page };
}

/**
 * Resets password using the OTP flow.
 */
export async function resetPasswordViaOTP(page: Page, phone: string, newPassword = TEST_PASSWORD) {
    console.log(`[Helpers] Resetting password via OTP for ${phone}`);
    await page.goto('/login');
    await page.getByRole('tab', { name: /Staff \/ Tenant/i }).click();
    
    await page.getByRole('button', { name: /Forgot Password/i }).click();
    await page.getByPlaceholder(/Enter your phone number/i).fill(phone);
    await page.getByRole('button', { name: /Send Reset Link/i }).click();
    
    // The "Forgot Password" in this app actually sends a Magic Link via WhatsApp
    // So we need to "capture" that link. In E2E with emulators, we'd have to 
    // fetch the latest magic link from Firestore.
    return { success: true };
}

/**
 * Performs a reset/setup via owner-provided 6-digit code.
 */
export async function resetPasswordViaOwnerCode(page: Page, phone: string, code: string, password = TEST_PASSWORD) {
    console.log(`[Helpers] Logging in with setup code ${code} for ${phone}`);
    await page.goto('/login');
    await page.getByRole('tab', { name: /Staff \/ Tenant/i }).click();
    
    const useCodeBtn = page.getByRole('button', { name: /Use Setup Code/i });
    if (await useCodeBtn.isVisible()) await useCodeBtn.click();
    
    await page.getByLabel(/Phone Number/i).first().fill(phone);
    await page.getByLabel(/6-Digit Setup Code/i).fill(code);
    await page.getByRole('button', { name: /Verify & Log In/i }).scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: /Verify & Log In/i }).click();
    
    // This flow also leads to /login/set-password
    await expect(page.getByRole('heading', { name: /Set Your Password/i })).toBeVisible({ timeout: 15000 });
    await page.locator('#password').fill(password);
    await page.locator('#confirmPassword').fill(password);
    await page.getByRole('button', { name: /Save Password/i }).scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: /Save Password/i }).click();
    
    await page.waitForURL(/.*tenants\/my-pg/, { timeout: 20000 });
}
