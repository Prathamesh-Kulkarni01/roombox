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

// IMPORTANT: All identifiers must be stable across Playwright projects (setup/chromium)
// and across processes. Do NOT derive from current time-of-day, as it can differ between
// the `setup` project and the main browser project.
export const TARGET_PG_NAME = `PG ${RUN_ID}`;
export const TARGET_ROOM_NAME = `101`;

export const OWNER_EMAIL = `bot_tester_${RUN_ID}@roombox.app`;
export const OWNER_PASSWORD = 'Password123!';
export const TENANT_EMAIL = `tenant_tester_${RUN_ID}@roombox.app`;
export const TENANT_PASSWORD = 'Password123!';
// 10 digits: prefix + RUN_ID (5 digits)
export const TENANT_PHONE = `98765${RUN_ID}`;
export const OWNER_ID = `owner_id_${RUN_ID}`;

/**
 * Base URL for test server endpoints (OTP test API, etc.)
 * Must match the Playwright webServer URL/PORT (9003 in playwright.config.ts).
 */
export const TEST_BASE_URL = process.env.TEST_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:9003';

/**
 * Fetches verification codes or invite codes from Firestore Emulator
 */
export async function getOtpFromEmulator(phone: string) {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'roombox-test';
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    
    try {
        // 1. Try our ROBUST Internal Testing API (Server-side Admin SDK check)
        const testApiUrl = `/api/auth/otp/test?phone=${cleanPhone}`;
        let retries = 5;
        while (retries > 0) {
            try {
                const testRes = await fetch(`${TEST_BASE_URL}${testApiUrl}`);
                if (testRes.ok) {
                    const data = await testRes.json();
                    if (data.otp) return data.otp;
                }
            } catch (ignore) {}
            retries--;
            if (retries > 0) await new Promise(r => setTimeout(r, 1500));
        }

        return null;
    } catch (err) {
        console.warn(`[Utils] getOtpFromEmulator failed:`, err);
        return null;
    }
}
