import { Page, expect } from '@playwright/test';
import { ManagementPage } from '../pages/ManagementPage';

/**
 * Property Workflow — Orchestrates multiple atomic Page Object actions
 */
export async function createPropertyWorkflow(page: Page, data: { name: string, location: string, city: string }) {
    console.log(`[Workflow:Property] Initiating creation for ${data.name}...`);
    const mgmt = new ManagementPage(page);

    await page.goto('/dashboard/pg-management');
    await mgmt.clickAddProperty();
    
    await mgmt.fillPropertyBasic(data.name, data.city);
    console.log(`[Workflow:Property] Step: Setting location to [${data.location}]...`);
    const locInput = mgmt.dialog.locator('input[name="location"]');
    await locInput.click();
    await locInput.fill('');
    await locInput.type(data.location, { delay: 100 });
    
    await mgmt.clickSubmit();
    
    // Wait for dialog to close as a better signal of success
    await expect(mgmt.dialog).not.toBeVisible({ timeout: 15000 });
    
    const row = await mgmt.getPropertyRow(data.name);
    try {
        await expect(row).toBeVisible({ timeout: 10000 });
    } catch (e) {
        console.log(`[Workflow:Property] Row not immediately visible. Reloading page...`);
        await page.reload();
        await expect(row).toBeVisible({ timeout: 15000 });
    }
    console.log(`[Workflow:Property] Success: ${data.name} is now listed.`);
}

/**
 * Ensures a property has at least one floor and one room.
 * Required for tenant onboarding.
 */
export async function setupFullPropertyLayout(page: Page, propertyName: string) {
    console.log(`[Workflow:Property] Establishing layout for ${propertyName}...`);
    const mgmt = new ManagementPage(page);

    await page.goto('/dashboard/pg-management');
    
    // NAVIGATION: Click Dropdown -> Configure (rows aren't clickable)
    await mgmt.navigateToProperty(propertyName);

    // Wait for page load by checking for the All Floors tab
    console.log(`[Workflow:Property] Step: Waiting for detail page to load...`);
    await expect(page.getByRole('tab', { name: /All Floors/i })).toBeVisible({ timeout: 20000 });

    // Check if Floor 1 already exists
    const floor1Tab = page.getByRole('tab', { name: /Floor 1/i });
    if (await floor1Tab.isVisible()) {
        console.log(`[Workflow:Property] 'Floor 1' already exists, skipping layout creation.`);
        // Assuming Room 101 also exists if Floor 1 does, for idempotency
        return;
    }

    // Because the property is new, it will show the empty state "Add First Floor" button.
    const addFloorBtn = page.locator('button:has-text("Add First Floor")').first();
    await expect(addFloorBtn).toBeVisible({ timeout: 10000 });

    // Add Floor - Directly click the 'Add Floor' button in the tabs list
    console.log(`[Workflow:Property] Step: Adding Floor 1...`);
    await addFloorBtn.click();
    
    const floorDialog = page.getByRole('dialog').filter({ hasText: /Floor/i });
    await expect(floorDialog).toBeVisible({ timeout: 10000 });
    await floorDialog.locator('input[name="name"]').fill('Floor 1');
    await floorDialog.getByRole('button', { name: /Add Floor|Save/i }).click();

    // Enter Edit Mode to see 'Add Room' buttons
    console.log(`[Workflow:Property] Step: Entering Edit Mode...`);
    const editModeBtn = page.locator('button').filter({ has: page.locator('svg.lucide-pencil') }).first();
    await expect(editModeBtn).toBeVisible({ timeout: 10000 });
    await editModeBtn.click();

    // Add Room
    console.log(`[Workflow:Property] Step: Adding Room 101...`);
    const addRoomBtn = page.getByRole('button', { name: /Add Room/i }).first();
    await expect(addRoomBtn).toBeVisible({ timeout: 10000 });
    await addRoomBtn.click();
    
    const roomDialog = page.getByRole('dialog').filter({ hasText: /Room/i });
    await expect(roomDialog).toBeVisible({ timeout: 10000 });
    await roomDialog.locator('input[name="name"]').fill('101');
    await roomDialog.getByRole('button', { name: /Add Room|Save|Create/i }).click();
    
    await expect(page.getByText(/Room 101/i)).toBeVisible();
    console.log(`[Workflow:Property] Success: Layout (Floor 1, Room 101) verified.`);
}
