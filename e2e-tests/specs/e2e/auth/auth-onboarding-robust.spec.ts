import { test, expect } from '@playwright/test';
import { RUN_ID } from '../../../test-utils';

/**
 * Onboarding Flow Robustness (@e2e)
 * Verifies that the new owner onboarding flow is mandatory, diverse, and robust.
 */
test.describe('Owner Onboarding - Robustness & Diversity', () => {

    test('Mandatory Onboarding Guard: Cannot skip to dashboard', async ({ page }) => {
        const email = `onboard_guard_${Date.now()}_${RUN_ID}@roombox.app`;
        const password = 'testpassword123';

        console.log(`[Onboarding] Step 1: Signing up ${email}...`);
        await page.goto('/signup');
        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', password);
        await page.getByRole('button', { name: 'Sign Up' }).click();

        // Should reach onboarding
        await expect(page).toHaveURL(/.*complete-profile/);

        // Try to force navigate to dashboard
        console.log('[Onboarding] Attempting to skip to dashboard...');
        await page.goto('/dashboard');

        // Should be kicked back to onboarding
        await expect(page).toHaveURL(/.*complete-profile/, { timeout: 15000 });
        console.log('[Onboarding] Success: Redirection guard active.');
    });

    test('Onboarding Diversity: Custom Layout Flow', async ({ page }) => {
        const email = `onboard_diverse_${Date.now()}_${RUN_ID}@roombox.app`;
        const password = 'testpassword123';

        await page.goto('/signup');
        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', password);
        await page.getByRole('button', { name: 'Sign Up' }).click();

        // 1. Role
        await page.locator('h3:has-text("Owner")').click();

        // 2. Profile
        await page.getByPlaceholder(/e.g. John Doe/i).fill('Diverse Owner');
        await page.getByPlaceholder(/e.g. 9876543210/i).fill('8888888888');
        await page.getByRole('button', { name: /Continue/i }).click();

        // 3. Basics
        await page.getByPlaceholder(/e.g., Skyview Luxury Residency/i).fill(`Diverse PG ${RUN_ID}`);
        await page.getByPlaceholder(/e.g. Pune/i).fill('DiverseCity');
        await page.getByPlaceholder(/e.g. Opposite Phoenix Mall/i).fill('Diverse Street');
        await page.getByRole('button', { name: /Configure Layout/i }).click();

        // 4. Layout (Diverse Path: Custom Setup)
        console.log('[Onboarding] Testing Custom Setup path...');
        await expect(page.getByText(/Smart Architecture/i)).toBeVisible();
        
        // Toggle Auto-Setup off (it's off by default or can be toggled)
        // If "Small PG" is a preset, let's try to just click "Final Review" without a preset to see if it works (it should have defaults)
        await page.getByRole('button', { name: /Final Review/i }).click();

        // 5. Review
        await expect(page.getByText(/Systems Check/i)).toBeVisible();
        await page.getByRole('button', { name: /LAUNCH DASHBOARD/i }).click();

        await expect(page).toHaveURL(/.*dashboard/, { timeout: 20000 });
        console.log('[Onboarding] Success: Diverse path completed.');
    });

    test('Onboarding Validation: Prevents empty submissions', async ({ page }) => {
        const email = `onboard_val_${Date.now()}_${RUN_ID}@roombox.app`;
        
        await page.goto('/signup');
        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', 'testpassword123');
        await page.getByRole('button', { name: 'Sign Up' }).click();

        // Role Step (Owner must be selected)
        const continueBtn = page.getByRole('button', { name: /Continue/i });
        // Initially, continue might not even be there if role isn't picked
        await page.locator('h3:has-text("Owner")').click();

        // Profile Step
        await expect(page.getByText(/About You/i)).toBeVisible();
        const profileContinue = page.getByRole('button', { name: /Continue/i });
        
        // Click without filling
        await profileContinue.click();
        
        // Should show error messages (assuming standard Shadcn form/zod errors)
        await expect(page.getByText(/at least 3 characters/i)).toBeVisible();
        await expect(page.getByText(/Valid phone/i)).toBeVisible();
        
        console.log('[Onboarding] Success: Validation blocks empty profile.');
    });
});
