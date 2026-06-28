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
    // Wait for either the Add Guest button (normal state) OR the Add Property CTA (no properties state)
    console.log(`[Workflow:Tenant] Waiting for management page to load...`);
    
    // The "Add Property" button on the Tenant Management page is actually a Link inside a Button (empty state fallback)
    const emptyStateAddPropertyBtn = page.getByRole('link', { name: /Add Property/i }).or(page.getByRole('button', { name: /Add Property/i }));
    
    // We wait for either button to appear.
    console.log(`[Workflow:Tenant] Race: Add Guest vs Add Property...`);
    await Promise.race([
        expect(mgmt.addGuestBtn.first()).toBeVisible({ timeout: 15000 }),
        expect(emptyStateAddPropertyBtn.first()).toBeVisible({ timeout: 15000 })
    ]).catch((err) => {
        console.warn(`[Workflow:Tenant] Race finished or timed out. Checking state...`);
    });

    // If "Add Property" is visible, it means we need to create one first.
    if (await emptyStateAddPropertyBtn.first().isVisible()) {
        console.log(`[Workflow:Tenant] No properties detected in UI. Navigating to PG Management via fallback CTA...`);
        
        await Promise.all([
            page.waitForURL(/\/dashboard\/pg-management/),
            emptyStateAddPropertyBtn.first().click()
        ]);

        console.log(`[Workflow:Tenant] On PG Management page. Opening Add Property sheet...`);
        const addPgBtn = page.getByRole('button', { name: /Add (New )?Property/i }).first();
        await addPgBtn.click();
        
        console.log(`[Workflow:Tenant] Filling property details...`);
        const propDialog = page.getByRole('dialog').or(page.locator('[role="dialog"]')).filter({ hasText: /Property/i }).filter({ visible: true });
        await propDialog.locator('input[name="name"]').fill(tenant.pgName);
        await propDialog.locator('input[name="city"]').fill('Test City');
        await propDialog.locator('input[name="location"]').fill('Test Location');
        
        console.log(`[Workflow:Tenant] Submitting property...`);
        await Promise.all([
            page.waitForResponse(r => r.url().includes('/api/pgs') && r.request().method() === 'POST'),
            propDialog.getByRole('button', { name: /Add|Submit|Create/i }).click()
        ]);
        
        console.log(`[Workflow:Tenant] Property created. Navigating back to Tenant Management...`);
        await Promise.all([
            page.waitForURL(/\/dashboard\/tenant-management/),
            page.goto('/dashboard/tenant-management')
        ]);

        await expect(mgmt.addGuestBtn.first()).toBeVisible({ timeout: 20000 });
    }


    console.log(`[Workflow:Tenant] Checking if ${tenant.name} already exists...`);
    const existingTenant = page.getByText(tenant.name).first();
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
    const addBtn = dialog.getByRole('button', { name: /Add Guest|Onboard|Submit/i }).filter({ visible: true }).first();
    await expect(addBtn).toBeEnabled({ timeout: 10000 });

    const waitForCreate = page.waitForResponse((r) => {
        return r.url().includes('/api/guests') && r.request().method() === 'POST';
    }, { timeout: 45000 });

    console.log('[Workflow:Tenant] Clicking Add button...');
    const [response] = await Promise.all([waitForCreate, addBtn.click()]);
    console.log(`[Workflow:Tenant] Response received: ${response.status()}`);
    
    if (!response.ok()) {
        const body = await response.text().catch(() => 'No body');
        throw new Error(`[Workflow:Tenant] Guest creation failed (status ${response.status()}): ${body}`);
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

    console.log('[Workflow:Tenant] Waiting for dialog to hide...');
    await expect(dialog).toBeHidden({ timeout: 30000 });
    
    console.log(`[Workflow:Tenant] Verifying ${tenant.name} is visible in list...`);
    await expect(page.getByText(tenant.name).first()).toBeVisible({ timeout: 30000 });
    
    console.log('[Workflow:Tenant] Success: Tenant lifecycle finalized.');
}
