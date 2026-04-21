import { Page, expect } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { getOtpFromEmulator } from '../test-utils';

/**
 * Auth Workflow — Manages the multi-stage login adaptive flow.
 */
export async function loginWorkflow(page: Page, emailOrPhone: string, password?: string, options: { otp?: boolean, autoSelectContext?: boolean } = {}) {
    console.log(`[Workflow:Auth] Initializing handshake for ${emailOrPhone}...`);
    const auth = new AuthPage(page);
    await auth.goto();

    const isEmail = emailOrPhone.includes('@');
    console.log(`[Workflow:Auth] Step: Identifying role (isEmail: ${isEmail})`);

    if (isEmail) {
        // OWNER FLOW
        await auth.clickOwnerTab();
        await auth.enterEmail(emailOrPhone);
        await auth.enterPassword(password || 'Password123!');
        await auth.clickLogin();
    } else {
        // ADAPTIVE FLOW (Staff/Tenant)
        const cleanPhone = emailOrPhone.replace(/\D/g, '').slice(-10);
        await auth.enterPhone(cleanPhone);
        await auth.clickNext();

        // Wait for the transition to the challenge stage
        await expect(page.getByText(/Welcome back, authenticate to continue|Your Invitation Code/i)).toBeVisible({ timeout: 10000 });

        if (options.otp) {
            console.log(`[Workflow:Auth] Step: Requesting multi-factor OTP for ${cleanPhone}...`);
            await auth.clickGetOtp();
            const code = await getOtpFromEmulator(cleanPhone);
            if (!code) throw new Error(`OTP Missing for ${cleanPhone}`);
            await auth.enterOtp(code);
            await auth.clickLogin(); 
        } else {
            console.log(`[Workflow:Auth] Step: Entering primary password...`);
            await auth.enterPassword(password || 'Password123!');
            await auth.clickLogin();
        }
    }

    // Handle Context Switch Logic
    if (options.autoSelectContext !== false) {
        try {
            if (await auth.isContextSwitcherVisible()) {
                console.log('[Workflow:Auth] Selection: Multiple profiles detected. Auto-selecting first...');
                await auth.selectFirstContext();
            }
            
            console.log('[Workflow:Auth] Success: Redirection triggered. Waiting for target URL...');
            await expect(page).toHaveURL(/dashboard|tenants\/my-pg|complete-profile/, { timeout: 60000 });
        } catch (err: any) {
            console.error('[Workflow:Auth] Error: Authentication failed or timed out.');
            // Check for error messages on page
            const errorMsg = await page.locator('[role="alert"], .text-red-500, .error-message').first().textContent().catch(() => null);
            if (errorMsg) {
                console.error(`[Workflow:Auth] Detected UI Error: "${errorMsg.trim()}"`);
            } else {
                console.error(`[Workflow:Auth] Current URL: ${page.url()}`);
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
