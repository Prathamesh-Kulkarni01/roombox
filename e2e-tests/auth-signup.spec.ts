import { test, expect } from '@playwright/test';

test.describe('Authentication - Sign Up', () => {

    // Generate a random email so the test doesn't fail on second run
    const uniqueEmail = `playwright_test_${Date.now()}@rentsutra.com`;
    const password = 'testpassword123';

    test('User can create a new account using the password form', async ({ page }) => {
        // Navigate to the signup page directly
        await page.goto('/signup');

        // Fill in credentials
        await page.fill('input[type="email"]', uniqueEmail);
        await page.fill('input[type="password"]', password);

        // Expect the button to say "Sign Up"
        await expect(page.locator('button', { hasText: 'Sign Up' })).toBeVisible();

        // Click to sign up
        await page.click('button:has-text("Sign Up")');

        // Verify successful toast message
        await expect(page.locator('text=Account created successfully')).toBeVisible({ timeout: 15000 });

        // The user should eventually be redirected to complete their profile (unassigned role)
        // or the dashboard, depending on the app's routing logic.
        await expect(page).toHaveURL(/.*(complete-profile|dashboard)/, { timeout: 15000 });
    });
});
