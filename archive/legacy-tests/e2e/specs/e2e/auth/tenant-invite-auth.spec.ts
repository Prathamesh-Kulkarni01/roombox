import { test, expect } from '@playwright/test';
import { loginWorkflow, logoutWorkflow } from '../../../workflows/authWorkflow';
import { createTenantInviteWorkflow, simulateInviteAcceptance } from '../../../workflows/inviteWorkflow';
import { wipeOwnerData, ensureOwnerExists, ensurePropertyExists } from '../../../api/cleanup';
import { OWNER_EMAIL, OWNER_ID, OWNER_PASSWORD, RUN_ID, TENANT_PASSWORD } from '../../../test-utils';

/**
 * Tenant Invitation & Authentication Lifecycle (@e2e)
 * Validates Magic Links, Setup Codes, and Password Activation.
 */
test.describe('Tenant Invite & Authentication', () => {
    const TENANT_NAME = `Journeys Tenant ${RUN_ID}`;
    const TENANT_PHONE = `88888${RUN_ID}`;
    const NEW_PASSWORD = 'UpdatedPass123!';
    const PG_NAME = `PG ${RUN_ID}`;

    let magicLink: string;
    let setupCode: string;

    test.beforeEach(async ({ page }) => {
        page.on('console', msg => {
            if (msg.type() === 'error' || msg.type() === 'warning' || msg.text().includes('[LoginDebug]') || msg.text().includes('[StoreProvider]')) {
                console.log(`[Browser ${msg.type()}] ${msg.text()}`);
            }
        });

        page.on('requestfailed', request => {
            console.log(`[Browser requestfailed] ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
        });

        // Block External/Analytics noise that causes 400s in Emulator mode
        await page.route('**/*.{google-analytics.com,googletagmanager.com,firebaseinstallations.googleapis.com,firebase.googleapis.com}/**', route => route.abort());
        await page.route('**/api/v1/projects/-/apps/**/webConfig', route => route.fulfill({ status: 200, body: '{}' }));
        await page.route('**/checkout.razorpay.com/**', route => route.abort());
    });

    test.beforeAll(async () => {
        console.log(`[Tenant Auth] Starting full lifecycle audit for ${TENANT_NAME}`);
        // Ensure Owner exists with correct role before wiping data
        await ensureOwnerExists(OWNER_ID, OWNER_EMAIL, OWNER_PASSWORD);
        // Seeding clean environment via Admin API
        await wipeOwnerData(OWNER_ID);
        // Ensure a PG exists for the tenant to be invited to
        await ensurePropertyExists(OWNER_ID, PG_NAME);
    });

    // ── JOURNEY 1 — FIRST-TIME INVITE LOGIN (Cross Context) ──────────────────
    test('Journey 1: First-time invite login via Magic Link', async ({ browser, page }) => {
        console.log('[Tenant Auth] Step 1: Owner setting up tenant and generating invite...');
        await loginWorkflow(page, OWNER_EMAIL, OWNER_PASSWORD);
        
        const invite = await createTenantInviteWorkflow(page, {
            name: TENANT_NAME,
            phone: TENANT_PHONE,
            pgName: PG_NAME
        });
        
        magicLink = invite.magicLink;
        setupCode = invite.setupCode;
        
        console.log('[Tenant Auth] Step 2: Simulating tenant profile activation...');
        const { page: tenantPage, context: tenantCtx } = await simulateInviteAcceptance(browser, magicLink, TENANT_PASSWORD);
        
        await expect(tenantPage.url()).toContain('/tenants/my-pg');
        await expect(tenantPage.getByText(TENANT_NAME)).toBeVisible();
        console.log('[Tenant Auth] Journey 1 Verified: Magic Link activation successful.');
        
        await tenantPage.close();
        await tenantCtx.close();
    });

    // ── JOURNEY 2 — RETURNING USER LOGIN ────────────────────────
    test('Journey 2: Returning user login with phone + password', async ({ page }) => {
        console.log('[Tenant Auth] Step 3: Verifying returning user login...');
        await page.goto('/login');
        await loginWorkflow(page, TENANT_PHONE, TENANT_PASSWORD);
        
        await expect(page).toHaveURL(/.*tenants\/my-pg/, { timeout: 20000 });
        await expect(page.getByText(TENANT_NAME)).toBeVisible();
        console.log('[Tenant Auth] Journey 2 Verified: Returning user login successful.');
    });

    // ── JOURNEY 3 — PASSWORD RESET CAPABILITY ────────────────────────
    test('Journey 3: Forgotten password flow simulation', async ({ page }) => {
        console.log('[Tenant Auth] Step 4: Initiating Forgot Password flow...');
        await page.goto('/login');
        await page.getByRole('tab', { name: /Staff \/ Tenant/i }).click();
        await page.getByRole('button', { name: /Forgot Password/i }).click();
        
        await page.getByPlaceholder(/Enter your phone number/i).fill(TENANT_PHONE);
        await page.getByRole('button', { name: /Send Reset Link/i }).click();
        
        await expect(page.getByText(/Reset link sent/i)).toBeVisible();
        console.log('[Tenant Auth] Journey 3 Verified: Reset request flow triggered.');
    });

    // ── EDGE CASE: REFRESH STABILITY ──────────────────────────────────────────────
    test('Edge: Session stability after page refresh', async ({ page }) => {
        console.log('[Tenant Auth] Step 5: Verifying session persistence...');
        await loginWorkflow(page, TENANT_PHONE, TENANT_PASSWORD);
        await page.waitForURL(/.*tenants\/my-pg/);
        
        await page.reload();
        await page.waitForTimeout(2000);
        expect(page.url()).toContain('/tenants/my-pg');
        console.log('[Tenant Auth] Edge Verified: Session stable.');
    });
});
