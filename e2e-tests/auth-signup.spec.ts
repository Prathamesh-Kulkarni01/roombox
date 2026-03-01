import { test, expect } from '@playwright/test';

test.describe('Authentication - Sign Up', () => {

    // Generate a random email so the test doesn't fail on second run
    const uniqueEmail = `playwright_test_${Date.now()}@rentsutra.com`;
    const password = 'testpassword123';

    test('User can create a new account using the password form', async ({ page }) => {
        // Navigate to the login page
        await page.goto('/login');

        // Fill in credentials
        await page.fill('input[type="email"]', uniqueEmail);
        await page.fill('input[type="password"]', password);

        // Check the "Create new account instead of logging in" checkbox
        await page.check('input#isSignUp');

        // Button should now say "Create Account"
        await expect(page.locator('button', { hasText: 'Create Account' })).toBeVisible();

        // Click to sign up
        await page.click('button:has-text("Create Account")');

        // Verify successful toast message
        await expect(page.locator('text=Account created successfully')).toBeVisible();

        // The user should eventually be redirected to complete their profile (unassigned role)
        // or the dashboard, depending on the app's routing logic.
        await expect(page).toHaveURL(/.*(complete-profile|dashboard)/);
    });
});
