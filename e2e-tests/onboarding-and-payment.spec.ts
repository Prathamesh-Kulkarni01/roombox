import { test, expect } from '@playwright/test';
import * as path from 'path';

const OWNER_AUTH = path.join(__dirname, '../playwright/.auth/owner.json');
const TENANT_AUTH = path.join(__dirname, '../playwright/.auth/tenant.json');

test.describe('Guest Onboarding Flow (Owner)', () => {
    // ── Apply Owner Session ───────────────────────────────────────────
    test.use({ storageState: OWNER_AUTH });

    test('Guest Onboarding Dialog Reset and Bed Selection Visibility', async ({ page }) => {
        console.log('Navigating to Tenant Management (already logged in)...');
        await page.goto('/dashboard/tenant-management');

        // Check if we are really on the dashboard (if not, setup might have failed)
        if (page.url().includes('/login')) {
            throw new Error('Owner session failed. Please check auth.setup.ts');
        }

        console.log('Opening Add Guest Dialog...');
        await page.getByRole('button', { name: 'Add New Guest' }).click();

        const dialog = page.locator('div[role="dialog"]');
        await expect(dialog).toBeVisible();

        const propertyPicker = page.getByRole('combobox', { name: 'Select a property...' }).or(page.locator('button:has-text("Select a property...")'));
        await expect(propertyPicker).toBeVisible();

        // ── Interaction: Select Property ──
        console.log('Selecting Property...');
        await propertyPicker.click();
        await page.waitForTimeout(500);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');

        // Room picker should appear
        const roomPicker = page.getByRole('combobox', { name: 'Select a room...' }).or(page.locator('button:has-text("Select a room...")'));
        await expect(roomPicker).toBeVisible({ timeout: 10000 });

        // ── Interaction: Select Room ──
        console.log('Selecting Room...');
        await roomPicker.click();
        await page.waitForTimeout(500);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');

        // Bed picker should appear
        const bedPicker = page.getByRole('combobox', { name: 'Select a bed...' }).or(page.locator('button:has-text("Select a bed...")'));
        await expect(bedPicker).toBeVisible({ timeout: 10000 });

        // ── Form Filling & Reset Verification ──
        await page.getByPlaceholder('e.g., Priya Sharma').fill('Automation Test Guest');
        await page.getByRole('button', { name: 'Cancel' }).click();

        console.log('Re-opening to verify RESET state...');
        await page.getByRole('button', { name: 'Add New Guest' }).click();
        await expect(page.getByPlaceholder('e.g., Priya Sharma')).toHaveValue('');
        await expect(propertyPicker).toBeVisible();
        await expect(roomPicker).not.toBeVisible(); // Should be hidden again
        
        console.log('SUCCESS: Guest onboarding flow works as expected.');
    });
});

test.describe('Payment Note Verification (Tenant)', () => {
    // ── Apply Tenant Session ──────────────────────────────────────────
    test.use({ storageState: TENANT_AUTH });

    test('Tenant Dashboard shows correct Payment Note', async ({ page }) => {
        console.log('Navigating to Tenant Dashboard (already logged in)...');
        await page.goto('/'); // Base URL usually redirects to /tenants/my-pg for tenants
        
        // Ensure we are in the tenant area
        await page.waitForURL(url => url.pathname.includes('/tenants/'), { timeout: 15000 });

        console.log('Opening Payment Modal...');
        // Find the "Pay Rent" button if it exists, or just check the state
        const payBtn = page.getByRole('button', { name: 'Pay Rent' });
        await payBtn.click();
        
        const modal = page.locator('div[role="dialog"]');
        await expect(modal).toContainText('Payment Note (Paste in app)');
        await expect(modal).toContainText('RS|'); // Standardized prefix
        
        console.log('SUCCESS: Tenant payment note is visible and correctly formatted.');
    });
});
