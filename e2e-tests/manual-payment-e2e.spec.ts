import { test, expect } from '@playwright/test';
import { OWNER_EMAIL, TENANT_PHONE, login } from './test-utils';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 🚨 BRUTAL E2E TEST: MANUAL PAYMENT LIFECYCLE
 *
 * ARCHITECTURE (Owner-Controlled Onboarding):
 *  - Step 0: Validate auth — owner can login, tenant was pre-seeded by owner in auth.setup.ts
 *  - Step 1: Owner creates PG + adds a second test guest
 *  - Step 2: Pre-seeded tenant (phone: TENANT_PHONE) logs in and can see their property
 *  - Step 3: Pre-seeded tenant submits manual payment → owner verifies
 *  - Step 4: Consistency check — guest marked as paid
 *
 * The tenant account (TENANT_PHONE) is created by the owner in auth.setup.ts.
 * Tenants CANNOT self-register — they are onboarded by the owner.
 */

const RUN_ID = Math.floor(Date.now() / 1000).toString().slice(-4);
const PG_NAME = `MP-PG-${RUN_ID}`;
const GUEST_NAME = `MP-Guest-${RUN_ID}`;

const AUTH_DIR = path.resolve(process.cwd(), 'playwright/.auth');
const PG_NAME_FILE = path.join(AUTH_DIR, 'pg-name.txt');

// Read the property name seeded during setup
let TARGET_PG_NAME = 'Automation PG';
if (fs.existsSync(PG_NAME_FILE)) {
    TARGET_PG_NAME = fs.readFileSync(PG_NAME_FILE, 'utf8').trim();
}

// Phone for the per-run additional guest (just to test the Add Guest UI)
const GUEST_PHONE = `98765${RUN_ID.padStart(5, '0')}`;
const RENT_AMOUNT_NUM = 5000;

test.describe('Manual Payment Lifecycle E2E - Robust Mode', () => {
    test.describe.configure({ mode: 'serial' });

    // Block only analytics/installations to prevent 403 hangs
    test.beforeEach(async ({ page }) => {
        await page.route('**/*analytics*/**', route => route.abort());
        await page.route('**/*installations*/**', route => route.abort());
        await page.route('**/*googletagmanager*/**', route => route.abort());
    });

    test('Step 0: Auth Baseline Validation', async ({ page }) => {
        console.log(`[Step 0] Run ID: ${RUN_ID}. Validating auth for owner...`);
        await login(page, OWNER_EMAIL);
        await expect(page).toHaveURL(/.*dashboard/);
        console.log(`[Step 0] Owner auth OK.`);

        // Validate tenant phone login (pre-seeded by auth.setup.ts)
        // Uses phone+password — NOT email signup
        console.log(`[Step 0] Validating tenant login via phone: ${TENANT_PHONE}...`);
        await page.goto('/login', { waitUntil: 'load' });
        await page.evaluate(async () => {
            localStorage.clear();
            sessionStorage.clear();
            if (window.indexedDB?.databases) {
                const dbs = await window.indexedDB.databases();
                for (const db of dbs) { if (db.name) window.indexedDB.deleteDatabase(db.name); }
            }
        });
        await page.context().clearCookies();
        await page.goto('/login', { waitUntil: 'load' });
        await expect(page.getByText(/Welcome Back/i)).toBeVisible({ timeout: 15000 });

        const tenantTab = page.getByRole('tab', { name: /Staff \/ Tenant/i });
        await tenantTab.click({ force: true }).catch(() => {});

        const passModeBtn = page.getByRole('button', { name: /Login with Password instead/i });
        if (await passModeBtn.isVisible().catch(() => false)) {
            await passModeBtn.click();
        }

        await page.locator('#tenant-phone').fill(TENANT_PHONE);
        await page.locator('#tenant-password').fill('Password123!');
        await page.getByRole('button', { name: /^Log In$/i, exact: true }).click();

        await expect(page).toHaveURL(/.*(tenants\/my-pg)/, { timeout: 30000 });
        console.log(`[Step 0] Tenant auth OK. URL: ${page.url()}`);
    });

    test('Step 1: Owner Creates PG + Adds Additional Guest', async ({ page }) => {
        await login(page, OWNER_EMAIL);
        
        // --- Create Property ---
        console.log(`[Step 1] Creating PG: ${PG_NAME}`);
        await page.goto('/dashboard/pg-management');
        await expect(page.getByRole('heading', { name: /PG Management/i })).toBeVisible({ timeout: 20000 });
        await page.reload();
        await expect(page.getByRole('heading', { name: /PG Management/i })).toBeVisible({ timeout: 20000 });
        
        const addBtn = page.getByRole('button', { name: /Add New Property/i });
        await expect(addBtn).toBeVisible({ timeout: 15000 });
        await addBtn.click();
        
        const pgDialog = page.getByRole('dialog');
        await expect(pgDialog).toBeVisible({ timeout: 15000 });
        await pgDialog.getByLabel(/Property Name/i).fill(PG_NAME);
        await pgDialog.getByLabel(/Location \/ Area/i).fill('Stable Area ' + RUN_ID);
        await pgDialog.getByLabel(/City/i).fill('StableCity');
        await pgDialog.getByText('Auto-Setup Building').click();
        await page.locator('button[form="add-pg-form"]').click();
        await expect(pgDialog).not.toBeVisible({ timeout: 25000 });
        await expect(page.getByText(PG_NAME).first()).toBeVisible({ timeout: 15000 });
        console.log(`[Step 1] PG created: ${PG_NAME}`);

        // --- Add Additional Test Guest ---
        console.log(`[Step 1] Adding test guest: ${GUEST_NAME} (phone: ${GUEST_PHONE})`);
        await page.goto('/dashboard/tenant-management');
        await expect(page.getByRole('heading', { name: /Guest Management/i })).toBeVisible({ timeout: 20000 });
        await page.getByRole('button', { name: 'Add New Guest' }).click();
        
        const guestForm = page.getByRole('dialog');
        await expect(guestForm).toBeVisible({ timeout: 15000 });

        console.log(' - Selecting PG');
        await guestForm.locator('button:has-text("Select a property...")').click();
        await page.getByRole('option', { name: PG_NAME }).click();

        console.log(' - Selecting Room');
        const roomTrigger = guestForm.locator('button:has-text("Select a room...")');
        await expect(roomTrigger).toBeVisible({ timeout: 15000 });
        await roomTrigger.click();
        const roomOptions = page.getByRole('option');
        await expect(roomOptions).not.toHaveCount(0, { timeout: 10000 });
        await roomOptions.first().click();

        console.log(' - Selecting Bed (if available)');
        const bedTrigger = guestForm.locator('button:has-text("Select a bed...")');
        if (await bedTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
            await bedTrigger.click();
            const bedOptions = page.getByRole('option');
            await expect(bedOptions).not.toHaveCount(0, { timeout: 10000 });
            await bedOptions.first().click();
        }

        await guestForm.getByLabel('Full Name').fill(GUEST_NAME);
        await guestForm.getByLabel('Phone Number').fill(GUEST_PHONE);
        await guestForm.getByLabel(/Monthly Rent/i).fill(String(RENT_AMOUNT_NUM));
        
        const today = new Date().toISOString().split('T')[0];
        await guestForm.locator('input[type="date"]').fill(today);

        // Check for validation errors before submit
        const validationErrors = guestForm.locator('.text-destructive');
        if (await validationErrors.count() > 0) {
            const msgs = await validationErrors.allTextContents();
            console.log('⚠️ Validation errors:', msgs.join(', '));
        }
        
        const submitBtn = guestForm.getByRole('button', { name: /^Add Guest$/i, exact: true });
        await expect(submitBtn).toBeEnabled({ timeout: 5000 });
        await submitBtn.click();
        await expect(guestForm).not.toBeVisible({ timeout: 25000 });

        await page.reload();
        await expect(page.locator('tr').filter({ hasText: GUEST_NAME }).first()).toBeVisible({ timeout: 20000 });
        console.log('[Step 1] Additional guest seeded. Step 1 complete.');
    });

    test('Step 2: Tenant Accesses Portal (Pre-seeded Account)', async ({ page }) => {
        console.log(`[Step 2] Testing Tenant login via phone: ${TENANT_PHONE}`);

        // Clear session completely
        await page.goto('/', { waitUntil: 'load' });
        await page.evaluate(async () => {
            localStorage.clear();
            sessionStorage.clear();
            if (window.indexedDB?.databases) {
                const dbs = await window.indexedDB.databases();
                for (const db of dbs) { if (db.name) window.indexedDB.deleteDatabase(db.name); }
            }
        });
        await page.context().clearCookies();
        await page.goto('/login', { waitUntil: 'load' });
        
        const tenantTab = page.getByRole('tab', { name: /Staff \/ Tenant/i });
        await tenantTab.click({ force: true }).catch(() => {});
        const passModeBtn = page.getByRole('button', { name: /Login with Password instead/i });
        if (await passModeBtn.isVisible().catch(() => false)) await passModeBtn.click();
        
        await page.locator('#tenant-phone').fill(TENANT_PHONE);
        await page.locator('#tenant-password').fill('Password123!');
        await page.getByRole('button', { name: /^Log In$/i, exact: true }).click();

        await expect(page).toHaveURL(/.*(tenants\/my-pg)/, { timeout: 30000 });
        
        // Detailed Debug Log to inspect state BEFORE assertion
        const uiState = await page.evaluate(() => {
            const user = (window as any).currentUser;
            return {
                uid: (window as any).uid || 'missing',
                guestId: user?.guestId || 'missing',
                ownerId: user?.ownerId || 'missing',
                pgId: user?.pgId || 'missing',
                role: user?.role || 'missing'
            };
        });
        console.log('[Step 2] Tenant UI State:', JSON.stringify(uiState, null, 2));

        // Strict assertion: The dynamically created property (from auth.setup.ts) must be visible
        await expect(page.getByText(TARGET_PG_NAME)).toBeVisible({ timeout: 40000 });
        await expect(page.getByRole('button', { name: /Pay Now/i })).toBeVisible({ timeout: 20000 });
        
        console.log(`[Step 2] Tenant dashboard verified. Mapping is core-correct.`);
    });

    test('Step 3: Manual Payment & Verification Flow', async ({ page }) => {
        const utr = `E2E-UTR-${RUN_ID}-${Math.floor(Math.random() * 1000)}`;
        console.log(`[Step 3] Submitting payment: ${utr}`);

        // Tenant submits the manual payment
        await page.goto('/tenants/my-pg');
        await page.getByRole('button', { name: /Pay Now/i }).click();
        await page.getByRole('button', { name: /Confirm Manual Payment/i }).click();
        await page.getByPlaceholder(/UTR Number/).fill(utr);
        await page.getByRole('button', { name: /Submit Payment Details/i }).click();
        await expect(page.getByText(/recorded successfully/i)).toBeVisible({ timeout: 15000 });
        console.log('[Step 3] Tenant submitted payment.');

        // Owner verifies
        console.log('[Step 3] Owner verifying payment via Dashboard...');
        await login(page, OWNER_EMAIL);
        await page.goto('/dashboard');

        const matcherSearch = page.getByPlaceholder(/Type UTR/i);
        await expect(matcherSearch).toBeVisible({ timeout: 15000 });
        await matcherSearch.fill(utr);

        page.once('dialog', dialog => {
            console.log(`[Step 3] Verification Success Notification: ${dialog.message()}`);
            dialog.accept();
        });

        // Use TENANT_PHONE instead of hardcoded name to locate the row for mapping
        const matchItem = page.locator('div').filter({ hasText: TENANT_PHONE }).last();
        await matchItem.getByRole('button', { name: /Mark as Paid/i }).click();
        await expect(page.getByText(/Payment Mapped Successful/i)).toBeVisible({ timeout: 15000 });
        console.log('[Step 3] Payment lifecycle complete.');
    });

    test('Step 4: Consistency Check', async ({ page }) => {
        console.log('[Step 4] Final verification...');
        await login(page, OWNER_EMAIL);
        await page.goto('/dashboard/tenant-management');
        // Filter by phone to be resilient to name changes
        const guestRow = page.locator('tr').filter({ hasText: TENANT_PHONE }).first();
        await expect(guestRow.locator('text=paid')).toBeVisible({ timeout: 15000 });
        console.log('[Step 4] E2E Lifecycle PASSED.');
    });
});
