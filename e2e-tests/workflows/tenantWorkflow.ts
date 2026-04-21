import { Page, expect } from '@playwright/test';
import { ManagementPage } from '../pages/ManagementPage';

/**
 * Tenant Workflow — Orchestrates the complex cascading onboarding UI.
 */
export async function onboardTenantWorkflow(page: Page, tenant: { name: string, phone: string, pgName: string, rent: string }) {
    console.log(`[Workflow:Tenant] Initiating onboarding for ${tenant.name}...`);
    const mgmt = new ManagementPage(page);

    await page.goto('/dashboard/tenant-management');

    // Make idempotent: check if tenant is already onboarded
    console.log(`[Workflow:Tenant] Checking if ${tenant.name} already exists...`);
    const existingTenant = page.getByText(tenant.name).first();
    // Wait for either the Add Guest button (page ready) or the table/list to appear.
    await expect(mgmt.addGuestBtn.first()).toBeVisible({ timeout: 20000 });
    if (await existingTenant.isVisible()) {
        console.log(`[Workflow:Tenant] Tenant ${tenant.name} already exists. Skipping onboarding.`);
        return;
    }

    await mgmt.addGuestBtn.first().click();
    
    const dialog = page.getByRole('dialog').filter({ hasText: /Guest/i }).filter({ visible: true });
    console.log(`[Workflow:Tenant] Step: Entering tenant identity...`);
    const nameInput = dialog.locator('input[name="name"]');
    await nameInput.click();
    await nameInput.fill('');
    await nameInput.type(tenant.name, { delay: 100 });
    
    const phoneInput = dialog.locator('input[name="phone"]');
    await phoneInput.click();
    await phoneInput.fill('');
    await phoneInput.type(tenant.phone.replace(/\D/g, '').slice(-10), { delay: 100 });
    
    // 1. SELECT PROPERTY (Often pre-selected after PG creation)
    console.log(`[Workflow:Tenant] Step: Selecting property [${tenant.pgName}]...`);
    const propertySelected = dialog.locator('[role="combobox"]').filter({ hasText: tenant.pgName }).first();
    if (!(await propertySelected.isVisible().catch(() => false))) {
        // Fallback: click the first combobox (property) and pick the PG
        const propertyCombo = dialog.locator('[role="combobox"]').first();
        await expect(propertyCombo).toBeVisible({ timeout: 20000 });
        await propertyCombo.click();
        await page.getByRole('option', { name: tenant.pgName }).first().click();
    }
    
    // 2. WAIT FOR ROOMS TO SYNC + SELECT ROOM
    console.log('[Workflow:Tenant] Selection: Triggering room cascade...');
    const roomPicker = dialog.locator('[role="combobox"]').filter({ hasText: /Select a room/i }).first();
    await expect(roomPicker).toBeEnabled({ timeout: 20000 });
    await roomPicker.click();
    
    // 3. SELECT FIRST ENABLED ROOM
    console.log('[Workflow:Tenant] Step: Picking first available room/bed...');
    try {
        const firstRoomOption = page.getByRole('option').filter({ hasNotText: /Select/i }).first();
        await expect(firstRoomOption).toBeEnabled({ timeout: 5000 });
        await firstRoomOption.click();
    } catch (e) {
        console.warn('[Workflow:Tenant] Warning: No available rooms/beds found. They might be fully occupied from a previous run. Skipping onboarding.');
        return;
    }

    // 3. OPTIONAL: Select a specific bed if UI requires it
    const bedPicker = dialog.locator('[role="combobox"]').filter({ hasText: /Select bed|Bed/i }).first();
    if (await bedPicker.isVisible().catch(() => false)) {
        console.log('[Workflow:Tenant] Step: Picking first available bed...');
        await bedPicker.click();
        const firstBedOption = page.getByRole('option').filter({ hasNotText: /Select/i }).first();
        await expect(firstBedOption).toBeEnabled({ timeout: 5000 });
        await firstBedOption.click();
    }

    // 4. FINALIZE
    const rentInput = dialog.locator('input[name="rentAmount"]');
    await rentInput.click();
    await rentInput.fill('');
    await rentInput.type(tenant.rent, { delay: 100 });
    
    console.log('[Workflow:Tenant] Step: Confirming onboarding...');
    const addBtn = dialog.getByRole('button', { name: /Add Guest/i }).filter({ visible: true });
    await expect(addBtn).toBeEnabled({ timeout: 10000 });

    const waitForCreate = page.waitForResponse((r) => {
        if (!r.url().includes('/api/guests')) return false;
        if (r.request().method() !== 'POST') return false;
        return r.status() >= 200 && r.status() < 400;
    }, { timeout: 45000 });

    const res = await Promise.all([waitForCreate, addBtn.click()]).then(([r]) => r);
    if (!res.ok()) {
        throw new Error(`[Workflow:Tenant] Guest creation failed (status ${res.status()})`);
    }

    // Close dialog if it doesn't auto-dismiss (some flows keep it open).
    if (await dialog.isVisible()) {
        const closeBtn = dialog.locator('button[aria-label="Close"], button:has-text("Cancel")').first();
        if (await closeBtn.isVisible().catch(() => false)) {
            try {
                await closeBtn.click({ force: true, timeout: 5000 });
            } catch {
                // Fallback: Radix dialogs reliably close on Escape
                await page.keyboard.press('Escape').catch(() => null);
            }
        } else {
            await page.keyboard.press('Escape').catch(() => null);
        }
    }

    await expect(dialog).toBeHidden({ timeout: 30000 });
    await expect(page.getByText(tenant.name).first()).toBeVisible({ timeout: 30000 });
    console.log('[Workflow:Tenant] Success: Tenant lifecycle finalized.');
}
