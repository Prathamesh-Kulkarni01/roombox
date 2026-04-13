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

export const OWNER_EMAIL = 'bot_tester_9@roombox.app';
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

/**
 * Identity-First Login Helper
 * Handles the adaptive flow: Phone -> Challenge -> [Context Switch]
 */
export async function login(page: Page, emailOrPhone: string, options: { password?: string, otp?: boolean } = {}) {
    console.log(`[Utils] Identity-First Login for ${emailOrPhone}...`);
    const isOwner = emailOrPhone.includes('@');
    
    // Clear state
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.context().clearCookies();
    
    // 1. IDENTITY STAGE
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    
    // Owner Login Fallback
    if (isOwner) {
        console.log(`[Utils] Owner Flow detected...`);
        const ownerBtn = page.getByRole('button', { name: /Property Owner Login/i });
        await ownerBtn.click();
        
        await page.locator('#email').fill(emailOrPhone);
        await page.locator('#owner-pass').fill(options.password || OWNER_PASSWORD);
        await page.getByRole('button', { name: /Log In as Owner/i }).click();
    } else {
        // Resident/Staff Flow
        console.log(`[Utils] Resident/Staff Flow: Phone entry...`);
        const cleanPhone = emailOrPhone.replace(/\D/g, '').slice(-10);
        const phoneInput = page.locator('#phone');
        await expect(phoneInput).toBeVisible({ timeout: 10000 });
        await phoneInput.fill(cleanPhone);
        await page.getByRole('button', { name: 'Next', exact: true }).click();

        
        // 2. CHALLENGE STAGE
        console.log(`[Utils] Detecting challenge type...`);
        
        // Wait for challenge to appear
        const passwordInput = page.locator('#pass');
        const inviteInput = page.locator('#invite-code');
        const otpTrigger = page.getByRole('button', { name: /Get One-Time Code/i });
        
        const challenge = await Promise.race([
            passwordInput.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'PASSWORD'),
            inviteInput.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'INVITE'),
            otpTrigger.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'OTP_TRIGGER')
        ]).catch(() => 'UNKNOWN');


        if (challenge === 'PASSWORD') {
            console.log(`[Utils] Challenge: Password`);
            if (options.otp) {
               // User wants OTP but we reached password, check if fallback button exists
               const switchBtn = page.getByRole('button', { name: 'I prefer login via OTP' });
               if (await switchBtn.isVisible()) {

                   await switchBtn.click();
                   return await handleOtpChallenge(page, cleanPhone);
               }
            }
            await passwordInput.fill(options.password || TENANT_PASSWORD);
            await page.getByRole('button', { name: /Sign In/i, exact: true }).click();
        } else if (challenge === 'INVITE') {
            console.log(`[Utils] Challenge: Invitation Code`);
            const code = await getOtpFromEmulator(cleanPhone);
            if (!code) throw new Error(`Could not find invite code for ${cleanPhone} in emulator`);
            await inviteInput.fill(code);
            await page.getByRole('button', { name: /Verify & Join/i }).click();
        } else if (challenge === 'OTP_TRIGGER') {
            return await handleOtpChallenge(page, cleanPhone);
        } else {
            throw new Error(`Unrecognized or missing challenge for ${emailOrPhone}`);
        }
    }

    // 3. POST-CHALLENGE (Redirect or Context Switch)
    await handlePostLogin(page);
}

async function handleOtpChallenge(page: Page, phone: string) {
    console.log(`[Utils] Challenge: OTP for ${phone}`);
    const getBtn = page.getByRole('button', { name: 'Get One-Time Code', exact: true }).or(page.getByRole('button', { name: /Get One-Time Code/i }));
    if (await getBtn.isVisible()) {
        await getBtn.click();
        console.log(`[Utils] Clicked 'Get One-Time Code'`);
    } else {
        console.log(`[Utils] 'Get One-Time Code' button NOT visible, checking for input directly...`);
    }
    
    await page.waitForTimeout(2000); 
    const code = await getOtpFromEmulator(phone);
    if (!code) throw new Error(`OTP not found for ${phone} in emulator. Check console for fetch logs.`);
    
    const otpInput = page.locator('#otp-verify');
    await otpInput.fill(code);
    await page.getByRole('button', { name: 'Verify & Sign In', exact: true }).click();
    
    await handlePostLogin(page);
}


async function handlePostLogin(page: Page) {
    console.log(`[Utils] Waiting for dashboard or switcher...`);
    
    // Check for context switcher
    const switcherHeading = page.getByText(/Select Context|Pick a profile/i);
    const isSwitcher = await switcherHeading.isVisible({ timeout: 10000 }).catch(() => false);
    
    if (isSwitcher) {
        console.log(`[Utils] Multi-role detected. Selecting first context...`);
        const firstCard = page.locator('div.grid.gap-4 .cursor-pointer').first();
        await firstCard.click();
    }
    
    await page.waitForURL(SUCCESS_URL_REGEX, { timeout: 25000 });
    console.log(`[Utils] Login successful: ${page.url()}`);
}

/**
 * Fetches verification codes or invite codes from Firestore Emulator
 */
export async function getOtpFromEmulator(phone: string) {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'roombox-test';
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    console.log(`[Utils] getOtpFromEmulator: Fetching for ${cleanPhone} (Project: ${projectId})`);
    
    try {
        // 1. Try our ROBUST Internal Testing API (Server-side Admin SDK check)
        const testApiUrl = `/api/auth/otp/test?phone=${cleanPhone}`;
        console.log(`[Utils] Polling Internal Test API: ${testApiUrl}`);
        const testRes = await fetch(`http://localhost:9002${testApiUrl}`);
        
        if (testRes.ok) {
            const data = await testRes.json();
            if (data.otp) {
                console.log(`[Utils] Found OTP via Test API: ${data.otp}`);
                return data.otp;
            }
        } else {
            console.log(`[Utils] Internal Test API not ready or failed (Status: ${testRes.status})`);
        }

        // 2. Fallback to Auth Emulator (Standard Firebase SDK verificationCodes)
        const authUrl = `http://127.0.0.1:9099/emulator/v1/projects/${projectId}/verificationCodes`;
        console.log(`[Utils] Polling Auth Emulator fallback: ${authUrl}`);
        const authRes = await fetch(authUrl);
        if (authRes.ok) {
            const authData = (await authRes.json()) as any;
            const codes = authData.verificationCodes || [];
            const match = codes
                .filter((c: any) => c.phoneNumber.includes(cleanPhone))
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
            
            if (match) {
                console.log(`[Utils] Found Auth Emulator OTP: ${match.code}`);
                return match.code;
            }
        }

        console.error(`[Utils] No OTP found in Test API or Auth emulator for ${cleanPhone}`);
        return null;
    } catch (err) {
        console.warn(`[Utils] getOtpFromEmulator failed:`, err);
        return null;
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
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.context().clearCookies();
    await page.goto('/login', { waitUntil: 'load' });
}

