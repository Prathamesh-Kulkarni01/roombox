import { Page, expect, Browser } from '@playwright/test';
import { onboardTenantWorkflow } from './tenantWorkflow';
import { getOtpFromEmulator } from '../test-utils';

/**
 * Invite Workflow — Handles Magic Link generation and WhatsApp-style verification flows.
 */
export async function createTenantInviteWorkflow(page: Page, tenant: { name: string, phone: string, pgName: string }) {
    console.log(`[Workflow:Invite] Initiating invite sequence for ${tenant.name}...`);
    
    // 1. Create tenant via existing workflow
    await onboardTenantWorkflow(page, {
        ...tenant,
        rent: '1000'
    });

    // 2. Capture Magic Link from UI
    console.log(`[Workflow:Invite] Step: Locating ${tenant.name} in list to capture link...`);
    // Some tables might have the phone formatted, name is more stable.
    const row = page.locator('tr').filter({ hasText: tenant.name }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.click();
    
    console.log(`[Workflow:Invite] Step: Triggering Invite modal...`);
    // Added "Generate Invite Link" based on UI inspection
    const inviteBtn = page.getByRole('button', { name: /Send Invite|Share Link|Generate Invite Link/i }).filter({ visible: true }).first();
    await expect(inviteBtn).toBeVisible({ timeout: 10000 });
    await inviteBtn.click();
    
    console.log(`[Workflow:Invite] Step: Waiting for modal with link...`);
    const linkInput = page.locator('input[readonly]').first();
    await expect(linkInput).toBeVisible({ timeout: 15000 });
    const magicLink = await linkInput.inputValue();
    
    // Check for setup code display (often a 6-digit code for manual login)
    const setupCode = await page.locator('.setup-code-display, .otp-display').first().innerText().catch(() => '000000');
    
    console.log(`[Workflow:Invite] Success: Captured Link [${magicLink.substring(0, 20)}...] and Code [${setupCode}]`);
    
    // Close modal to cleanup
    await page.keyboard.press('Escape').catch(() => null);
    
    return { magicLink, setupCode };
}

/**
 * Simulate WhatsApp Link Open in a Fresh Context
 */
export async function simulateInviteAcceptance(browser: Browser, magicLink: string, newPassword: string) {
    console.log(`[Workflow:Invite] Simulation: Opening magic link [${magicLink.substring(0, 30)}...]`);
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Block External/Analytics noise that causes 400s in Emulator mode
    await page.route('**/*.{google-analytics.com,googletagmanager.com,firebaseinstallations.googleapis.com,firebase.googleapis.com}/**', route => route.abort());
    await page.route('**/api/v1/projects/-/apps/**/webConfig', route => route.fulfill({ status: 200, body: '{}' }));
    await page.route('**/checkout.razorpay.com/**', route => route.abort());

    await page.goto(magicLink);
    
    // The landing page should be the password setup page
    console.log(`[Workflow:Invite] Simulation: Waiting for password setup page...`);
    await expect(page).toHaveURL(/.*setup-password|auth\/invite|auth\/setup/, { timeout: 20000 });
    
    console.log(`[Workflow:Invite] Step: Setting new password for tenant...`);
    const passInput = page.getByPlaceholder(/Create a (secure )?password|New Password/i).first();
    await expect(passInput).toBeVisible({ timeout: 10000 });
    await passInput.fill(newPassword);
    
    const submitBtn = page.getByRole('button', { name: /Complete Setup|Activate Account|Set Password|Save/i }).filter({ visible: true }).first();
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });
    await submitBtn.click();
    
    console.log(`[Workflow:Invite] Step: Waiting for dashboard redirection...`);
    // After setup, they should be redirected to their tenant dashboard
    await page.waitForURL(/.*tenants\/my-pg|dashboard/, { timeout: 45000 });
    console.log(`[Workflow:Invite] Simulation: Tenant successfully activated account and reached dashboard.`);
    
    return { page, context };
}
