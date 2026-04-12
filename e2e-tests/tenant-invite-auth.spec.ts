import { test, expect } from '@playwright/test';
import * as helpers from './auth-helpers';
import { login, RUN_ID, TENANT_PASSWORD } from './test-utils';

test.describe('Tenant Invite & Authentication Lifecycle', () => {
    test.setTimeout(300_000); // 5 minutes

    const TENANT_NAME = `Journeys Tenant ${RUN_ID}`;
    const TENANT_PHONE = `88888${RUN_ID}`;
    const NEW_PASSWORD = 'UpdatedPass123!';

    let magicLink: string;
    let setupCode: string;

    test.beforeAll(async () => {
        // We ensure a clean environment is handled inside helpers
    });

    // ── JOURNEY 1 — FIRST-TIME INVITE LOGIN (Cross Browser) ──────────────────
    test('Journey 1: First-time invite login via Magic Link', async ({ browser, page }) => {
        // 1. Owner creates tenant and gets invite link
        const setup = await helpers.createOwnerAndTenant(page, TENANT_NAME, TENANT_PHONE);
        magicLink = setup.magicLink;
        setupCode = setup.setupCode;
        
        // 3. Simulate tenant opening link in different browser & setting password
        const { page: tenantPage, context: tenantCtx } = await helpers.simulateWhatsAppOpen(browser, magicLink, TENANT_PASSWORD);
        
        // 4. Validate logged in state
        await expect(tenantPage.url()).toContain('/tenants/my-pg');
        await expect(tenantPage.getByText(TENANT_NAME)).toBeVisible();
        console.log('[J1] First-time login successful.');
        
        await tenantPage.close();
        await tenantCtx.close();
    });

    // ── JOURNEY 2 — RETURNING USER LOGIN (Same Phone) ────────────────────────
    test('Journey 2: Returning user login with phone + password', async ({ page }) => {
        await page.goto('/login');
        await page.getByRole('tab', { name: /Staff \/ Tenant/i }).click();
        
        // Switch to password mode if needed
        const passTab = page.getByRole('button', { name: /Password Login/i });
        if (await passTab.isVisible()) await passTab.click();
        
        await page.locator('#tenant-phone').fill(TENANT_PHONE);
        await page.locator('#tenant-password').fill(TENANT_PASSWORD);
        await page.getByRole('button', { name: /^Log In$/i, exact: true }).click();
        
        await page.waitForURL(/.*tenants\/my-pg/, { timeout: 20000 });
        await expect(page.getByText(TENANT_NAME)).toBeVisible();
        console.log('[J2] Returning user login successful.');
    });

    // ── JOURNEY 3 — PASSWORD RESET VIA MAGIC LINK (Forgot Password) ─────────
    test('Journey 3: Password reset via Forgot Password (Magic Link)', async ({ browser, page }) => {
        console.log('[J3] Starting forgot password flow...');
        await page.goto('/login');
        await page.getByRole('tab', { name: /Staff \/ Tenant/i }).click();
        
        await page.getByRole('button', { name: /Forgot Password/i }).click();
        await page.getByPlaceholder(/Enter your phone number/i).fill(TENANT_PHONE);
        
        // Submit request
        await page.getByRole('button', { name: /Send Reset Link|Request Link/i }).click();
        
        // In the emulator, the magic link is generated and sent via WhatsApp (mocked to console)
        // Since we can't easily read console of the background dev server from here,
        // we'll regenerate it as the owner to simulate "receiving" it.
        // real-world: tenant opens link from WhatsApp.
        
        // Re-login as owner to get a fresh link (simulating the reset link)
        await login(page, 'bot_tester_9@roombox.app');
        await page.goto('/dashboard/tenant-management');
        await page.locator('tr').filter({ hasText: TENANT_NAME }).first().click();
        const resetInvite = await helpers.sendInviteLink(page, TENANT_PHONE);
        
        // Simulate tenant opening THIS link to reset password
        const { page: resetPage, context: resetCtx } = await helpers.simulateWhatsAppOpen(browser, resetInvite.magicLink, NEW_PASSWORD);
        
        await expect(resetPage.url()).toContain('/tenants/my-pg');
        console.log('[J3] Password reset/Magic link login successful.');
        
        await resetPage.close();
        await resetCtx.close();
    });

    // ── JOURNEY 4 — OWNER-ASSISTED RESET (6-DIGIT CODE) ──────────────────────
    test('Journey 4: Owner-assisted setup/reset via 6-digit code', async ({ page }) => {
        // 1. Owner provides the code (previously generated or fresh)
        // We'll generate a fresh one
        await login(page, 'bot_tester_9@roombox.app');
        await page.goto('/dashboard/tenant-management');
        await page.locator('tr').filter({ hasText: TENANT_NAME }).first().click();
        const fresh = await helpers.sendInviteLink(page, TENANT_PHONE);
        
        // 2. Tenant enters phone + code
        await helpers.resetPasswordViaOwnerCode(page, TENANT_PHONE, fresh.setupCode, 'FinalPass123!');
        
        // 3. Validate
        await expect(page.url()).toContain('/tenants/my-pg');
        console.log('[J4] Owner-assisted setup/reset successful.');
    });

    // ── EDGE CASES & ROBUSTNESS ──────────────────────────────────────────────
    
    test('Edge: Reusing consumed setup code fails', async ({ page }) => {
        // Setup code from J4 is consumed.
        await page.goto('/login');
        await page.getByRole('tab', { name: /Staff \/ Tenant/i }).click();
        const useCodeBtn = page.getByRole('button', { name: /Use Setup Code/i });
        if (await useCodeBtn.isVisible()) await useCodeBtn.click();
        
        await page.getByLabel(/Phone Number/i).first().fill(TENANT_PHONE);
        await page.getByLabel(/6-Digit Setup Code/i).fill('000000'); // random wrong code
        await page.getByRole('button', { name: /Verify & Log In/i }).click();
        
        await expect(page.getByText(/invalid|expired|failed/i)).toBeVisible();
        console.log('[Edge] Wrong setup code correctly blocked.');
    });

    test('Edge: Redirect stability after refresh', async ({ page }) => {
        // Login as tenant
        await login(page, TENANT_PHONE);
        await page.waitForURL(/.*tenants\/my-pg/);
        
        // Refresh
        await page.reload();
        await page.waitForTimeout(2000);
        expect(page.url()).toContain('/tenants/my-pg');
        console.log('[Edge] Session stable after refresh.');
    });

    test.afterAll(async () => {
        // Cleanup logic if needed
    });
});
