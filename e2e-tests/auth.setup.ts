import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

// This file saves the browser state (cookies/local storage) so we don't have to log in every time.
const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('Authenticate as Owner', async ({ page }) => {
    // Capture browser console logs
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
    page.on('pageerror', exception => console.log('BROWSER ERROR:', exception));

    await page.goto('/login');

    await page.fill('input[type="email"]', 'bot_tester_7@roombox.app');
    await page.fill('input[type="password"]', 'Password123!');

    // Try standard login first
    await page.click('button:has-text("Log In")');

    // Wait for the toast to appear, which tells us if login succeeded or failed
    const toast = page.locator('.group.pointer-events-auto').first();
    await toast.waitFor({ state: 'visible', timeout: 10000 });
    const toastText = await toast.textContent();

    if (toastText && toastText.includes('Failed')) {
        console.log("User does not exist or invalid password. Attempting to create account...");
        // Close the toast so it doesn't block clicks
        await page.keyboard.press('Escape');

        await page.click('text=Sign up'); // Navigate to signup page
        await page.waitForURL('**/signup');

        // Fill out signup form
        await page.fill('input[type="email"]', 'bot_tester_7@roombox.app');
        await page.fill('input[type="password"]', 'Password123!');

        await page.click('button:has-text("Sign Up")');

        // Wait for the next toast
        await page.locator('.group.pointer-events-auto').first().waitFor({ state: 'visible', timeout: 10000 });
    } else {
        console.log("Logged in successfully!");
    }

    // Now we are either signed in or signed up. 
    // We need to wait for the app to route us somewhere.
    // It will either be the Dashboard or Complete Profile.
    try {
        await Promise.race([
            page.waitForURL('**/dashboard', { timeout: 15000 }),
            page.waitForURL('**/complete-profile', { timeout: 15000 })
        ]);
    } catch (e) {
        await page.screenshot({ path: 'stuck-after-login.png' });
        console.log("Stuck at URL:", page.url());
        throw new Error("Stuck after login. See stuck-after-login.png");
    }

    if (page.url().includes('complete-profile')) {
        console.log("Completing profile...");
        await page.waitForSelector('button:has-text("I\'m a Property Owner")', { state: 'visible' });
        await page.click('button:has-text("I\'m a Property Owner")');

        // Wait for the final redirect to the Dashboard
        await page.waitForSelector('text=Dashboard', { timeout: 15000 });
    }

    // Verify the dashboard actually loaded
    await expect(page.locator('text=Dashboard').first()).toBeVisible();

    // Extract Firebase's IndexedDB state and inject it into LocalStorage temporarily
    // (Because Playwright storageState cannot naturally capture IndexedDB).
    await page.evaluate(async () => {
        return new Promise((resolve) => {
            const request = indexedDB.open('firebaseLocalStorageDb');
            request.onsuccess = (event: any) => {
                const db = event.target.result;
                try {
                    const transaction = db.transaction(['firebaseLocalStorage'], 'readonly');
                    const objectStore = transaction.objectStore('firebaseLocalStorage');
                    const getAllRequest = objectStore.getAll();

                    getAllRequest.onsuccess = () => {
                        const result = getAllRequest.result;
                        // Shove the IndexedDB token straight into localStorage so Playwright grabs it
                        if (result && result.length > 0) {
                            localStorage.setItem('_playwright_firebase_auth_', JSON.stringify(result));
                        }
                        resolve(true);
                    };
                } catch (e) {
                    resolve(false);
                }
            };
            request.onerror = () => resolve(false);
        });
    });

    // Now save the cookies and localStorage to the file
    await page.context().storageState({ path: authFile });
});
