import { test, expect } from '@playwright/test';
import { RUN_ID } from '../../../test-utils';
import { createTenantInviteWorkflow, simulateInviteAcceptance } from '../../../workflows/inviteWorkflow';

test.describe('Owner Onboarding & Tenant Payment Dashboard - UPI Verification', () => {

    test.beforeEach(async ({ page }) => {
        // Block external / analytics requests to avoid failures in emulator mode
        await page.route('**/*.{google-analytics.com,googletagmanager.com,firebaseinstallations.googleapis.com,firebase.googleapis.com}/**', route => route.abort());
        await page.route('**/api/v1/projects/-/apps/**/webConfig', route => route.fulfill({ status: 200, body: '{}' }));
        await page.route('**/checkout.razorpay.com/**', route => route.abort());
    });

    test('Onboarding with UPI details, displaying on payout, and rendering correctly on tenant payment modal', async ({ browser, page }) => {
        const ownerEmail = `owner_upi_e2e_${Date.now()}_${RUN_ID}@roombox.app`;
        const password = 'Password123!';
        const pgName = `UPI PG ${RUN_ID}`;
        const upiId = 'ownerupi@ybl';
        const payeeName = 'Owner Payout Name';

        console.log(`[E2E UPI] Step 1: Owner signing up as ${ownerEmail}...`);
        await page.goto('/signup');
        await page.fill('input[type="email"]', ownerEmail);
        await page.fill('input[type="password"]', password);
        await page.getByRole('button', { name: 'Sign Up', exact: true }).click();

        // Should reach onboarding complete-profile page
        await expect(page).toHaveURL(/.*complete-profile/, { timeout: 15000 });
        console.log('[E2E UPI] Onboarding wizard loaded.');

        // Step 1: Role Selection
        await page.locator('h3:has-text("Owner")').click();

        // Step 2: Owner Details
        await expect(page.getByRole('heading', { name: /About You/i })).toBeVisible({ timeout: 10000 });
        await page.getByPlaceholder(/e.g. John Doe/i).fill('UPI Owner');
        await page.getByPlaceholder(/e.g. 9876543210/i).fill(`99999${RUN_ID}`);
        await page.getByRole('button', { name: /Continue/i }).click();

        // Step 3: PG Details
        await page.getByPlaceholder(/e.g., Skyview Luxury Residency/i).fill(pgName);
        await page.getByPlaceholder(/e.g. Pune/i).fill('Pune');
        await page.getByPlaceholder(/e.g. Opposite Phoenix Mall/i).fill('Baner High Street');
        await page.getByRole('button', { name: /Configure Layout/i }).click();

        // Step 4: Rooms Layout (uses defaults, click Final Review)
        await page.getByRole('button', { name: /Final Review/i }).click();

        // Step 5: Rent Collection / Payment Setup
        console.log('[E2E UPI] Configuring Rent Collection (UPI)...');
        await expect(page.getByText(/Rent Collection/i)).toBeVisible({ timeout: 10000 });
        
        // Select Online (UPI) card
        await page.locator('h3:has-text("Online (UPI)")').click();

        // Fill UPI details
        await page.getByPlaceholder(/9876543210@ybl/i).fill(upiId);
        await page.getByPlaceholder(/Account Holder Name/i).fill(payeeName);
        
        // Go to final check
        await page.getByRole('button', { name: /Check/i }).click();

        // Step 6: Review & Launch
        console.log('[E2E UPI] Final review page...');
        await expect(page.getByText(/Ready to Launch!/i)).toBeVisible({ timeout: 10000 });
        
        // Assert preview displays the correct details
        await expect(page.getByText(upiId)).toBeVisible();
        
        // Click Launch
        await page.getByRole('button', { name: /LAUNCH DASHBOARD/i }).click();
        await expect(page).toHaveURL(/.*dashboard/, { timeout: 30000 });
        console.log('[E2E UPI] Owner onboarded successfully.');

        // Step 7: Verify Payouts settings
        console.log('[E2E UPI] Navigating to payouts page to verify settings...');
        await page.goto('/dashboard/payouts');
        
        // Assert that the UPI settings values are populated
        const upiInput = page.locator('input[name="upiId"]');
        const payeeInput = page.locator('input[name="payeeName"]');
        await expect(upiInput).toHaveValue(upiId, { timeout: 15000 });
        await expect(payeeInput).toHaveValue(payeeName);
        console.log('[E2E UPI] Owner payouts dashboard verified correctly.');

        // Step 8: Invite a tenant to this property
        const tenantName = `UPI Tenant ${RUN_ID}`;
        const tenantPhone = `88888${RUN_ID}`;
        
        console.log(`[E2E UPI] Navigating to Tenant Management to invite ${tenantName}...`);
        await page.goto('/dashboard/tenant-management');
        
        const invite = await createTenantInviteWorkflow(page, {
            name: tenantName,
            phone: tenantPhone,
            pgName: pgName
        });
        
        console.log(`[E2E UPI] Invite created. Setup code: ${invite.setupCode}, Magic Link: ${invite.magicLink}`);

        // Step 9: Simulate Invite Acceptance by the tenant
        console.log('[E2E UPI] Accepting invite on behalf of tenant...');
        const { page: tenantPage, context: tenantCtx } = await simulateInviteAcceptance(browser, invite.magicLink, 'TenantPass123!');
        
        await expect(tenantPage.url()).toContain('/tenants/my-pg');
        await expect(tenantPage.getByText(tenantName)).toBeVisible({ timeout: 15000 });
        console.log('[E2E UPI] Tenant logged in and dashboard verified.');

        // Step 10: Open payment modal and verify details
        console.log('[E2E UPI] Clicking "Pay Now" on tenant dashboard...');
        const payNowBtn = tenantPage.getByRole('button', { name: 'Pay Now', exact: true });
        await expect(payNowBtn).toBeVisible({ timeout: 10000 });
        await payNowBtn.click();

        console.log('[E2E UPI] Verifying payment details in payment modal...');
        // Wait for modal to render UPI info
        const modalUpi = tenantPage.locator('.font-mono', { hasText: upiId });
        await expect(modalUpi).toBeVisible({ timeout: 10000 });
        
        // Assert payeeName is visible
        await expect(tenantPage.getByText(payeeName)).toBeVisible();
        console.log('[E2E UPI] Tenant payment modal displays correct UPI ID and Payee name.');

        // Clean up
        await tenantPage.close();
        await tenantCtx.close();
    });
});
