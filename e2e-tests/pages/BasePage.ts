import { Page, expect } from '@playwright/test';

export class BasePage {
    constructor(protected page: Page) {}

    /**
     * Common Header: Select a Property
     */
    async selectProperty(pgName: string) {
        console.log(`[BasePage] Selecting Property: ${pgName}`);
        const trigger = this.page.locator('header [role="combobox"]').first();
        if (await trigger.isVisible({ timeout: 5000 }).catch(() => false)) {
            await trigger.click();
            const option = this.page.locator(`[role="option"]:has-text("${pgName}")`).first();
            await expect(option).toBeVisible({ timeout: 10000 });
            await option.click();
            await this.page.waitForTimeout(500); // Small grace for UI sync
        }
    }

    /**
     * Common Navigation
     */
    async gotoDashboard() {
        await this.page.goto('/dashboard');
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Helper to wait for a success toast/message
     */
    async expectSuccess(message?: string | RegExp) {
        const toast = this.page.locator('[role="status"], .toast-success');
        if (message) {
            await expect(toast).toContainText(message);
        } else {
            await expect(toast).toBeVisible();
        }
    }
}
