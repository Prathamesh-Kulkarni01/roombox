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
    console.log(`[Workflow:Invite] Step: Navigating to Tenant list to capture link...`);
    await page.goto('/dashboard/tenant-management');
    const row = page.locator('tr').filter({ hasText: tenant.phone }).first();
    await row.click();
    
    console.log(`[Workflow:Invite] Step: Triggering Invite modal...`);
    await page.getByRole('button', { name: /Send Invite|Share Link/i }).click();
    
    const linkInput = page.locator('input[readonly]');
    await expect(linkInput).toBeVisible({ timeout: 10000 });
    const magicLink = await linkInput.inputValue();
    
    const setupCode = await page.locator('.setup-code-display').innerText().catch(() => '000000');
    
    console.log(`[Workflow:Invite] Success: Captured Link [${magicLink.substring(0, 15)}...] and Code [${setupCode}]`);
    return { magicLink, setupCode };
}

/**
 * Simulate WhatsApp Link Open in a Fresh Context
 */
export async function simulateInviteAcceptance(browser: Browser, magicLink: string, newPassword: string) {
    console.log(`[Workflow:Invite] Simulation: Opening magic link in fresh context...`);
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto(magicLink);
    await expect(page).toHaveURL(/.*setup-password|auth\/invite/);
    
    console.log(`[Workflow:Invite] Step: Setting new password for tenant...`);
    const passInput = page.getByPlaceholder(/Create a secure password/i);
    await passInput.fill(newPassword);
    await page.getByRole('button', { name: /Complete Setup|Activate Account/i }).click();
    
    await page.waitForURL(/.*tenants\/my-pg/, { timeout: 30000 });
    console.log(`[Workflow:Invite] Simulation: Tenant successfully activated account.`);
    
    return { page, context };
}
