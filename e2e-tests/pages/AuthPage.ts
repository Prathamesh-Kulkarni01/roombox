import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * AuthPage — Atomic UI interactions for the login/auth screens.
 */
export class AuthPage extends BasePage {
    constructor(page: Page) {
        super(page);
    }

    async goto() {
        console.log('[Page:Auth] Navigating to /login...');
        await this.page.goto('/login');
    }

    async clickOwnerTab() {
        console.log('[Page:Auth] Switching to Owner Email tab...');
        await this.page.getByRole('button', { name: /Owner Email/i }).click();
    }

    async enterEmail(email: string) {
        console.log(`[Page:Auth] Entering email: ${email}`);
        await this.page.getByLabel(/Email Address/i).fill(email);
    }

    async enterPassword(password: string) {
        console.log('[Page:Auth] Entering password...');
        const passInput = this.page.locator('input[type="password"], #pass').first();
        await passInput.fill(password);
    }

    async clickLogin() {
        console.log('[Page:Auth] Clicking Sign In button...');
        await this.page.getByRole('button', { name: /Log In|Sign In|Verify/i }).filter({ visible: true }).first().click();
    }

    async enterPhone(phone: string) {
        console.log(`[Page:Auth] Entering phone number: ${phone}`);
        const input = this.page.getByLabel(/Phone Number/i);
        await input.click();
        await input.fill('');
        await input.type(phone, { delay: 100 });
    }

    async clickNext() {
        console.log('[Page:Auth] Clicking Next...');
        await this.page.getByRole('button', { name: 'Next', exact: true }).click();
    }

    async enterOtp(code: string) {
        console.log(`[Page:Auth] Entering code: ${code}`);
        const otpInput = this.page.locator('#otp-verify, #invite-code').first();
        await otpInput.click();
        await otpInput.fill(''); // Clear if any
        await otpInput.type(code, { delay: 100 }); // Trigger state changes
    }

    async clickGetOtp() {
        console.log('[Page:Auth] clickGetOtp: Entering stage...');
        
        // 1. If the "Get One-Time Code" button is NOT visible, we MUST switch first
        const getBtn = this.page.locator('button').filter({ hasText: /Get One-Time Code/i });
        if (!(await getBtn.isVisible())) {
            const switchBtn = this.page.locator('button').filter({ hasText: /I prefer login via OTP|Forgot\? Use OTP Login/i });
            if (await switchBtn.count() > 0) {
                console.log('[Page:Auth] clickGetOtp: Switching to OTP mode...');
                await switchBtn.first().click();
            }
        }

        // 2. Locate and click "Get One-Time Code"
        try {
            await getBtn.waitFor({ state: 'visible', timeout: 5000 });
            console.log('[Page:Auth] clickGetOtp: Clicking Get One-Time Code button...');
            await getBtn.click();
            
            // Wait for OTP input
            console.log('[Page:Auth] clickGetOtp: Waiting for OTP/setup-code input...');
            await expect(this.page.locator('#otp-verify, #invite-code').first()).toBeVisible({ timeout: 10000 });
        } catch (e) {
            console.warn('[Page:Auth] clickGetOtp: "Get One-Time Code" button not visible. Checking if code entry is already active (might be INVITE_CODE stage)...');
            const codeInput = this.page.locator('#otp-verify, #invite-code').first();
            await expect(codeInput).toBeVisible({ timeout: 5000 });
        }
    }

    async switchToOtpMode() {
        console.log('[Page:Auth] Switching to OTP mode...');
        const btn = this.page.getByRole('button', { name: /I prefer login via OTP|Forgot\? Use OTP Login/i });
        if (await btn.isVisible()) await btn.click();
    }

    // --- CONTEXT SWITCHER ---
    async isContextSwitcherVisible() {
        console.log('[Page:Auth] Checking for multi-profile context switcher...');
        return await this.page.getByText(/Select Context|Pick a profile/i).isVisible({ timeout: 5000 }).catch(() => false);
    }

    async selectFirstContext() {
        console.log('[Page:Auth] Selecting first available profile context...');
        await this.page.locator('div.grid.gap-4 .cursor-pointer').first().click();
    }

    async logout() {
        console.log('[Page:Auth] Clearing session and logging out...');
        await this.page.goto('/login');
        await this.page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
            indexedDB.deleteDatabase('firebaseLocalStorageDb');
        });
        await this.page.context().clearCookies();
    }
}
