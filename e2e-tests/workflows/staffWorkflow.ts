import { Page, expect } from '@playwright/test';
import { ManagementPage } from '../pages/ManagementPage';

/**
 * Staff Workflow — Orchestrates staff onboarding and permission assignment.
 */
export async function onboardStaffWorkflow(page: Page, staff: { name: string, phone: string, role?: string, salary?: string, propertyName?: string }) {
    console.log(`[Workflow:Staff] Initiating onboarding for ${staff.name}...`);
    const mgmt = new ManagementPage(page);

    await page.goto('/dashboard/staff');
    await page.reload();
    
    // Check if staff already exists
    const existingStaff = page.locator('tr').filter({ hasText: staff.name }).first();
    if (await existingStaff.isVisible()) {
        console.log(`[Workflow:Staff] Staff ${staff.name} already exists. Skipping creation.`);
        return;
    }

    await mgmt.page.getByRole('button', { name: /Add Staff/i }).first().click();
    
    const dialog = page.getByRole('dialog');
    await dialog.waitFor({ state: 'visible' });

    // Fill basic info
    console.log(`[Workflow:Staff] Step: Entering member identity...`);
    const nameInput = dialog.getByPlaceholder(/Suresh Kumar/i);
    await nameInput.click();
    await nameInput.fill('');
    await nameInput.type(staff.name, { delay: 100 });
    
    const phoneInput = dialog.getByPlaceholder(/9876543210/i);
    await phoneInput.click();
    await phoneInput.fill('');
    await phoneInput.type(staff.phone, { delay: 100 });
    
    // Select Property
    console.log(`[Workflow:Staff] Step: Selecting properties...`);
    
    const pgTrigger = dialog.getByRole('combobox').filter({ hasText: /Select properties|PG/i }).first();
    await pgTrigger.click();
    
    // List all available properties for debugging
    const options = page.getByRole('option').filter({ hasNotText: /Select/i });
    await expect(options.first()).toBeVisible({ timeout: 10000 });
    const allNames = await options.allTextContents();
    console.log(`[Workflow:Staff] Available properties: ${allNames.join(', ')}`);

    if (staff.propertyName) {
        console.log(`[Workflow:Staff] Searching for property: ${staff.propertyName}`);
        const searchInput = page.getByPlaceholder(/Search\.\.\./i);
        await searchInput.click();
        await searchInput.fill('');
        await searchInput.type(staff.propertyName, { delay: 100 });
        await page.waitForTimeout(1000); 
        
        const target = options.filter({ hasText: new RegExp(`^${staff.propertyName}$`, 'i') }).first();
        await target.click();
    } else {
        await options.first().click();
    }
    
    await page.keyboard.press('Escape'); 
    
    // Verification: Trigger should no longer say "Select properties"
    await expect(pgTrigger).not.toContainText('Select properties', { timeout: 20000 });
    console.log(`[Workflow:Staff] Property selection confirmed.`);
    
    // Select Role
    console.log(`[Workflow:Staff] Step: Assigning role [${staff.role || 'manager'}]...`);
    const roleTrigger = dialog.getByRole('combobox').filter({ hasText: /Select a role|Role/i }).first();
    await roleTrigger.click();
    await page.getByRole('option', { name: new RegExp(staff.role || 'manager', 'i') }).click();
    
    if (staff.salary) {
        const salaryInput = dialog.getByPlaceholder(/15000/i);
        await salaryInput.click();
        await salaryInput.fill('');
        await salaryInput.type(staff.salary, { delay: 100 });
    }
    
    console.log(`[Workflow:Staff] Step: Submitting staff profile...`);
    await dialog.getByRole('button', { name: /Add Staff/i, exact: true }).filter({ visible: true }).click();
    await expect(dialog).toBeHidden({ timeout: 20000 });
    console.log(`[Workflow:Staff] Success: ${staff.name} is now active.`);
}
