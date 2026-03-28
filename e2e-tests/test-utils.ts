import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const AUTH_DIR = path.resolve(process.cwd(), 'playwright/.auth');
const RUN_ID_FILE = path.join(AUTH_DIR, 'run-id.txt');

// Persistent RUN_ID for the entire testing lifecycle
export const RUN_ID = fs.existsSync(RUN_ID_FILE) 
    ? fs.readFileSync(RUN_ID_FILE, 'utf-8').trim() 
    : Math.floor(Math.random() * 90000 + 10000).toString();

if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
if (!fs.existsSync(RUN_ID_FILE)) fs.writeFileSync(RUN_ID_FILE, RUN_ID);

export const TARGET_PG_NAME = `PG ${RUN_ID}`;
export const TARGET_ROOM_NAME = `101`;

export const OWNER_EMAIL = 'bot_tester_8@roombox.app';
export const OWNER_PASSWORD = 'Password123!';
export const TENANT_EMAIL = 'tenant_tester_8@roombox.app';
export const TENANT_PASSWORD = 'Password123!';
// The internal phone-based email that the onboardTenant service creates for the test tenant.
// Format: {10-digit-phone}@roombox.app
// The tenant account is seeded by the owner via the E2E setup script.
export const TENANT_PHONE = '9876543219'; // matched in backend for stable test password Password123!

/**
 * URLs that indicate successful login/navigation.
 */
const SUCCESS_URL_REGEX = /.*(dashboard|tenants\/my-pg|complete-profile)/;

export async function login(page: Page, emailOrPhone: string) {
    console.log(`[Utils] Logging in as ${emailOrPhone}...`);
    page.on('console', msg => {
        if (msg.type() === 'error') console.log(`[Browser Error] ${msg.text()}`);
    });
    page.on('pageerror', err => {
        console.log(`[Browser PageError] ${err.message}`);
    });

    await page.goto('/', { waitUntil: 'load' });
    await page.evaluate(async () => {
        localStorage.clear();
        sessionStorage.clear();
        if (window.indexedDB && window.indexedDB.databases) {
            const dbs = await window.indexedDB.databases();
            for (const db of dbs) {
                if (db.name) window.indexedDB.deleteDatabase(db.name);
            }
        }
    });
    await page.context().clearCookies();
    
    await page.goto('/login', { waitUntil: 'load' });
    await page.waitForTimeout(1000); 
    
    // Safety check: is the page actually loaded?
    await expect(page.getByText(/Welcome Back/i)).toBeVisible({ timeout: 15000 });
    const isOwner = emailOrPhone.includes('bot_tester') || emailOrPhone.includes('@');
    
    if (isOwner) {
        console.log(`[Utils] Owner Flow: Switching to tab...`);
        const ownerTab = page.getByRole('tab', { name: /Owner/i });
        await ownerTab.click();
        
        const emailInput = page.locator('#email').first();
        const passwordInput = page.locator('#password').first();
        
        await expect(emailInput).toBeVisible({ timeout: 10_000 });
        await emailInput.fill(emailOrPhone);
        await passwordInput.fill(OWNER_PASSWORD);
        
        console.log(`[Utils] Submitting owner login...`);
        const loginBtn = page.getByRole('button', { name: /Log In as Owner/i });
        await loginBtn.waitFor({ state: 'visible', timeout: 15000 });
        
        const isEnabled = await loginBtn.isEnabled();
        console.log(`[Utils] Login button enabled: ${isEnabled}`);
        
        await loginBtn.click();
        console.log(`[Utils] Clicked login button.`);
    } else {
        // Tenant/Staff login: phone + password (NOT email — tenants don't self-signup)
        console.log(`[Utils] Tenant Flow: Using phone+password mode...`);
        const tenantTab = page.getByRole('tab', { name: /Staff \/ Tenant/i });
        await tenantTab.click({ force: true }).catch(() => {});
        
        // Switch to password mode if currently in OTP mode
        const passModeBtn = page.getByRole('button', { name: /Login with Password instead/i });
        const isPassModeVisible = await passModeBtn.isVisible().catch(() => false);
        if (isPassModeVisible) {
            console.log(`[Utils] Switching to tenant password mode...`);
            await passModeBtn.click();
        }
        
        const phoneInput = page.locator('#tenant-phone').first();
        const passInput = page.locator('#tenant-password').first();
        
        await expect(phoneInput).toBeVisible({ timeout: 10_000 });
        // If passed a phone number directly, use it; otherwise derive from email format
        const loginId = emailOrPhone.replace(/\D/g, '').length === 10 ? emailOrPhone : emailOrPhone;
        await phoneInput.fill(loginId);
        await passInput.fill(TENANT_PASSWORD);
        
        console.log(`[Utils] Submitting tenant login...`);
        const loginBtn = page.getByRole('button', { name: /^Log In$/i, exact: true });
        await loginBtn.waitFor({ state: 'visible', timeout: 15000 });
        await loginBtn.click();
    }

    // Wait for the URL to change to a success URL
    let authErrorDetected = false;
    const consoleHandler = (msg: any) => {
        const text = msg.text();
        if (text.includes('auth/user-not-found') || text.includes('auth/wrong-password') || text.includes('auth/invalid-credential')) {
            authErrorDetected = true;
        }
    };
    page.on('console', consoleHandler);

    try {
        console.log(`[Utils] Waiting for success redirection...`);
        await page.waitForTimeout(3000);
        
        if (authErrorDetected) {
            throw new Error('Auth error detected');
        }
        
        const toastVisible = await page.locator('[data-state="open"][role="status"]').isVisible().catch(() => false);
        if (toastVisible) {
            const toastText = await page.locator('[data-state="open"][role="status"]').innerText().catch(() => '');
            console.log(`[Utils] Toast visible: "${toastText}"`);
            if (toastText.toLowerCase().includes('failed') || toastText.toLowerCase().includes('invalid')) {
                throw new Error('Auth error from toast');
            }
        }
        
        await page.waitForURL(SUCCESS_URL_REGEX, { timeout: 25_000 });
        console.log(`[Utils] Login redirect successful. URL: ${page.url()}`);
        await handleOnboarding(page, isOwner);
    } catch (err) {
        console.warn(`[Utils] Login failed to redirect or caught error. Checking state...`);
        const ssPath = `test-results/login-fail-${Date.now()}.png`;
        await page.screenshot({ path: ssPath });
        
        const toastError = await page.locator('[role="status"], [role="alert"]').innerText({ timeout: 2000 }).catch(() => '');
        const inlineError = await page.locator('.text-destructive').innerText({ timeout: 2000 }).catch(() => '');
        const allErrors = `${inlineError} ${toastError}`.trim();
        console.log(`[Utils] Detected errors: "${allErrors}", authErrorDetected=${authErrorDetected}`);
        
        if (isOwner && (authErrorDetected || allErrors.toLowerCase().includes('not found') || allErrors.toLowerCase().includes('invalid'))) {
            // Owners can self-signup
            console.log(`[Utils] Owner account missing. Starting signup flow for ${emailOrPhone}...`);
            await signup(page, emailOrPhone);
        } else if (!isOwner) {
            // Tenants CANNOT self-signup — fail with a clear message
            throw new Error(
                `[Utils] Tenant login failed for ${emailOrPhone}. ` +
                `Tenant accounts must be created by an owner first. ` +
                `Errors: ${allErrors}`
            );
        } else {
            const currentUrl = page.url();
            if (SUCCESS_URL_REGEX.test(currentUrl)) {
                await handleOnboarding(page, isOwner);
            } else {
                console.log(`[Utils] Stuck at ${currentUrl}. Forcing dashboard...`);
                await page.goto('/dashboard');
                await page.waitForTimeout(3000);
                await handleOnboarding(page, isOwner);
            }
        }
    }
}

async function handleOnboarding(page: Page, isOwner: boolean) {
    await page.waitForTimeout(3000);
    
    if (page.url().includes('complete-profile')) {
        if (!isOwner) {
            // Tenant should never reach complete-profile since they can't self-assign
            throw new Error('[Utils] Tenant reached /complete-profile — tenant was not onboarded by an owner.');
        }
        console.log(`[Utils] Onboarding: Selecting Owner role`);
        
        const btn = page.locator('button').filter({ hasText: /Property Owner/i }).first();
        await expect(btn).toBeVisible({ timeout: 15_000 });
        await btn.click();
        
        await page.waitForURL('**/dashboard', { timeout: 15_000 }).catch(() => {
            console.log(`[Utils] Post-onboarding redirect timed out. Current: ${page.url()}`);
        });
    }

    if (page.url().includes('/login')) {
        console.warn(`[Utils] Stuck on /login detected. Trying direct navigation...`);
        await page.goto(isOwner ? '/dashboard' : '/tenants/my-pg');
        await page.waitForTimeout(2000);
    }
}

async function signup(page: Page, email: string) {
    // Only owners can sign up via the signup page
    console.log(`[Utils] Navigating to /signup for owner ${email}...`);
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    
    const emailInput = page.locator('#email').first();
    const passInput = page.locator('#password').first();
    
    await expect(emailInput).toBeVisible({ timeout: 15_000 });
    console.log(`[Utils] Filling signup form for ${email}...`);
    await emailInput.fill(email);
    await passInput.fill(OWNER_PASSWORD);
    
    console.log(`[Utils] Submitting signup...`);
    const signupBtn = page.getByRole('button', { name: /Create Account|Sign Up/i }).first();
    await signupBtn.click({ force: true });
    
    console.log(`[Utils] Waiting for redirection to complete-profile...`);
    try {
        await page.waitForURL('**/complete-profile', { timeout: 20_000 });
        await handleOnboarding(page, true);
    } catch (e) {
        console.log(`[Utils] Signup didn't redirect automatically. URL: ${page.url()}`);
        const errorText = await page.locator('.text-destructive').innerText({ timeout: 2000 }).catch(() => '');
        if (errorText.toLowerCase().includes('already in use')) {
            console.log(`[Utils] Owner account already exists. Forcing dashboard...`);
            await page.goto('/dashboard');
            await handleOnboarding(page, true);
        } else {
            await page.goto('/complete-profile');
            await page.waitForTimeout(3000);
            await handleOnboarding(page, true);
        }
    }
}

export async function selectPgInHeader(page: Page, pgName: string) {
    console.log(`[Utils] Selecting PG: ${pgName}`);
    await page.waitForSelector('header', { timeout: 15_000 });
    
    const trigger = page.locator('header [role="combobox"], header button[aria-haspopup], header button:has-text("Properties")').first();
    await trigger.click();
    
    const option = page.locator(`[role="option"]:has-text("${pgName}"), [role="menuitem"]:has-text("${pgName}"), button:has-text("${pgName}")`).first();
    await expect(option).toBeVisible({ timeout: 15_000 });
    await option.click();
    await page.waitForTimeout(2000);
}

export async function logout(page: Page) {
    console.log(`[Utils] Logging out...`);
    await page.goto('/', { waitUntil: 'load' });
    await page.evaluate(async () => {
        localStorage.clear();
        sessionStorage.clear();
        if (window.indexedDB && window.indexedDB.databases) {
            const dbs = await window.indexedDB.databases();
            for (const db of dbs) {
                if (db.name) window.indexedDB.deleteDatabase(db.name);
            }
        }
    });
    await page.context().clearCookies();
    await page.goto('/login', { waitUntil: 'load' });
    await page.waitForTimeout(1000);
}
