import { Page, expect } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { getOtpFromEmulator } from '../test-utils';

/**
 * Auth Workflow — Manages the multi-stage login adaptive flow.
 */
export async function loginWorkflow(page: Page, emailOrPhone: string, password?: string, options: { otp?: boolean, autoSelectContext?: boolean } = {}) {
    const consoleErrors: string[] = [];
    page.on('console', msg => { 
        console.log(`[Browser:${msg.type()}] ${msg.text()}`);
        if (msg.type() === 'error') consoleErrors.push(msg.text()); 
    });

    console.log(`[Workflow:Auth] Initializing handshake for ${emailOrPhone}...`);
    
    // Capture network failures
    page.on('requestfailed', request => {
        console.error(`[Workflow:Auth] Request Failed: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });
    
    // Capture response errors
    page.on('response', async response => {
        if (response.status() >= 400) {
            const body = await response.text().catch(() => 'No body');
            console.error(`[Workflow:Auth] HTTP Error: ${response.status()} ${response.url()}\nBody: ${body}`);
        }
    });

    const auth = new AuthPage(page);
    await auth.goto();

    const isEmail = emailOrPhone.includes('@');
    console.log(`[Workflow:Auth] Step: Identifying role (isEmail: ${isEmail})`);

    if (isEmail) {
        await auth.clickOwnerTab();
        await auth.enterEmail(emailOrPhone);
        if (password) {
            await auth.enterPassword(password);
            await auth.clickLogin();
        } else {
            // OTP flow for email if requested
            await auth.clickGetOtp();
            const otp = await getOtpFromEmulator(emailOrPhone);
            await auth.enterOtp(otp);
            await auth.clickLogin();
        }
    } else {
        // Phone flow
        await auth.enterPhone(emailOrPhone);
        await auth.clickGetOtp();
        const otp = await getOtpFromEmulator(emailOrPhone);
        await auth.enterOtp(otp);
        await auth.clickLogin();
    }

    // Handle Context Switch Logic
    if (options.autoSelectContext !== false) {
        try {
            console.log('[Workflow:Auth] Waiting for context switcher or dashboard redirection...');
            
            // Race: either the context switcher appears, OR we get redirected to a valid dashboard-like URL
            await Promise.race([
                auth.isContextSwitcherVisible().then(visible => {
                    if (visible) return 'switcher';
                    // If not visible, we wait for the URL anyway
                    return new Promise(() => {}); // never resolve if not visible, let the URL check win
                }),
                page.waitForURL(/dashboard|tenants\/my-pg|complete-profile/, { timeout: 15000 }).then(() => 'redirected')
            ]).then(async (winner) => {
                if (winner === 'switcher') {
                    console.log('[Workflow:Auth] Selection: Multiple profiles detected. Auto-selecting first...');
                    await auth.selectFirstContext();
                }
            });

            console.log('[Workflow:Auth] Success: Redirection triggered. Verifying target URL...');
            await expect(page).toHaveURL(/dashboard|tenants\/my-pg|complete-profile/, { timeout: 15000 });
        } catch (err: any) {
            console.error('[Workflow:Auth] Error: Authentication failed or timed out.');
            console.error(`[Workflow:Auth] Current URL: ${page.url()}`);

            if (consoleErrors.length > 0) {
                console.error(`[Workflow:Auth] Browser console errors observed:\n${consoleErrors.join('\n')}`);
            }

            // Check for sonner toasts or alerts
            const errorMsg = await page.locator('[role="alert"], [data-sonner-toast], .text-red-500').first().textContent().catch(() => null);
            if (errorMsg) {
                console.error(`[Workflow:Auth] Detected UI Error: "${errorMsg.trim()}"`);
            }

            throw err;
        }
    }

    console.log('[Workflow:Auth] Success: Authentication sequence complete.');
}

/**
 * Logout Workflow
 */
export async function logoutWorkflow(page: Page) {
    console.log('[Workflow:Auth] Initiating session termination...');
    const auth = new AuthPage(page);
    await auth.logout();
    console.log('[Workflow:Auth] Success: Logged out and cleared state.');
}

