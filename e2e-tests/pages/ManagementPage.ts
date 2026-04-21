import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * ManagementPage — Atomic UI Interactions ONLY
 */
export class ManagementPage extends BasePage {
    // Locators
    readonly addPropertyBtn: Locator;
    readonly addGuestBtn: Locator;
    readonly dialog: Locator;
    readonly nameInput: Locator;
    readonly cityInput: Locator;
    readonly submitBtn: Locator;

    constructor(page: Page) {
        super(page);
        this.addPropertyBtn = page.getByRole('button', { name: /Add (New )?Property/i });
        this.addGuestBtn = page.getByRole('button', { name: /Add (New )?Guest/i });
        // Radix dialogs typically have an overlay + the dialog; strict-mode needs the dialog only.
        this.dialog = page.getByRole('dialog').filter({ visible: true });
        this.nameInput = this.dialog.locator('input[name="name"]');
        this.cityInput = this.dialog.locator('input[name="city"]');
        this.submitBtn = this.dialog.locator('button[type="submit"]');
    }

    async clickAddProperty() {
        console.log('[Page:Mgmt] Clicking Add Property button...');
        await this.addPropertyBtn.first().click();
    }

    async fillPropertyBasic(name: string, city: string) {
        console.log(`[Page:Mgmt] Filling property basics: ${name} (${city})`);
        
        await this.nameInput.click();
        await this.nameInput.fill('');
        await this.nameInput.type(name, { delay: 100 });
        
        await this.cityInput.click();
        await this.cityInput.fill('');
        await this.cityInput.type(city, { delay: 100 });
    }

    async clickSubmit() {
        console.log('[Page:Mgmt] Submitting form...');
        await this.submitBtn.filter({ visible: true }).first().click({ force: true });
    }

    async getPropertyRow(name: string) {
        return this.page.locator('tr').filter({ hasText: name }).first();
    }

    /**
     * Navigates to the property detail page by clicking Configure in the dropdown.
     */
    async navigateToProperty(name: string) {
        console.log(`[Page:Mgmt] Navigating to detail page for: ${name}...`);
        const row = await this.getPropertyRow(name);
        
        // Open the 'More' menu
        await row.getByRole('button', { name: /Toggle menu/i }).click();
        
        // Click Configure
        await this.page.getByRole('menuitem', { name: /Configure/i }).click();
        
        // Wait for navigation confirmation
        await this.page.waitForURL(/.*\/dashboard\/pg-management\/.+/, { timeout: 20000 });
    }

    async clickEditBuilding() {
        console.log('[Page:Mgmt] Transitioning to Building Editor...');
        await this.page.locator('button:has-text("Edit Building")').first().click();
    }

    async clickAddFloor() {
        console.log('[Page:Mgmt] Adding new floor...');
        await this.page.locator('[data-tour="add-floor-button"]').first().click();
    }
}
