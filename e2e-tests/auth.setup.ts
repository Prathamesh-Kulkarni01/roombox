import { test as setup, expect, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// Authentication states storage - use absolute paths for reliability
const AUTH_DIR = path.resolve(process.cwd(), 'playwright/.auth');
const OWNER_AUTH = path.join(AUTH_DIR, 'owner.json');
const TENANT_AUTH = path.join(AUTH_DIR, 'tenant.json');

// Ensure dir exists
if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
}

async function login(page: Page, email: string, pass: string, isOwner: boolean = true) {
    console.log(`[Setup] Attempting login/signup for ${email}...`);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Skip if already in
    if (page.url().includes('dashboard') || page.url().includes('tenants/my-pg')) {
        console.log(`[Setup] ${email} already has session.`);
        return;
    }

    if (isOwner) {
        await page.click('button:has-text("Owner")');
        await page.waitForTimeout(1000);
        await page.fill('input[id="email"]', email);
        await page.fill('input[id="password"]', pass);
        await page.click('button:has-text("Log In as Owner")');
    } else {
        await page.click('button:has-text("Staff / Tenant")');
        await page.waitForTimeout(1000);
        if (!await page.locator('input[id="tenant-password"]').isVisible()) {
            await page.click('button:has-text("Login with Password instead")');
        }
        await page.fill('input[id="tenant-phone"]', email);
        await page.fill('input[id="tenant-password"]', pass);
        await page.click('button[type="submit"]');
    }

    // Wait for redirect
    try {
        await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });
        console.log(`[Setup] Login successful for ${email}.`);
    } catch (e) {
        console.log(`[Setup] Login failed for ${email}, attempting signup...`);
        await page.goto('/signup');
        await page.fill('input[id="email"]', email);
        await page.fill('input[id="password"]', pass);
        await page.click('button:has-text("Sign Up")');
        await page.waitForURL(url => !url.pathname.includes('/signup'), { timeout: 20000 });
        console.log(`[Setup] Signup successful for ${email}.`);
    }
}

async function setupOwner(page: Page) {
    const email = 'bot_tester_8@roombox.app';
    const pass = 'Password123!';
    await login(page, email, pass);

    if (page.url().includes('/complete-profile')) {
        await page.click('button:has-text("I\'m a Property Owner")');
        await page.waitForURL('**/dashboard', { timeout: 20000 });
    }

    await page.goto('/dashboard/pg-management');
    await page.waitForLoadState('networkidle');

    const targetPgName = 'Automation PG';
    const pgExists = await page.getByText(targetPgName).isVisible();
    
    if (!pgExists) {
        console.log(`[Setup] Creating ${targetPgName}...`);
        const addBtn = page.getByRole('button', { name: /Add (New )?Property/i }).first();
        await addBtn.click();
        await page.waitForTimeout(2000); 
        
        await page.locator('input[name="name"]').fill(targetPgName);
        await page.locator('input[name="location"]').fill('Automation Lane 8');
        await page.locator('input[name="city"]').fill('Bangalore');
        
        const autoSetupSwitch = page.locator('button[role="switch"]:has-text("Auto-Setup")');
        if (await autoSetupSwitch.getAttribute('aria-checked') === 'false') {
            await autoSetupSwitch.click();
            await page.waitForTimeout(1000);
        }
        
        await page.locator('input[name="floorCount"]').fill('1');
        await page.locator('input[name="roomsPerFloor"]').fill('1');
        await page.locator('input[name="bedsPerRoom"]').fill('1');
        
        await page.click('button[form="add-pg-form"]');
        await page.waitForSelector(`text=${targetPgName}`, { timeout: 30000 });
        console.log(`[Setup] Property created.`);
    }

    // Tenant Onboarding
    await page.goto('/dashboard/tenant-management');
    await page.waitForLoadState('networkidle');
    const tenantEmail = 'tenant_tester_8@roombox.app';
    const tenantExists = await page.getByText(tenantEmail).isVisible();
    
    if (!tenantExists) {
        console.log(`[Setup] Onboarding ${tenantEmail}...`);
        await page.getByRole('button', { name: 'Add New Guest' }).click();
        await page.waitForTimeout(2000);
        
        await page.getByPlaceholder('e.g., Priya Sharma').fill('Test Tenant Eight');
        await page.getByPlaceholder('e.g., 9876543210').fill('1234567890');
        await page.getByPlaceholder('e.g., priya@example.com').fill(tenantEmail);

        // Property Selection
        await page.click('button:has-text("Select a property...")');
        await page.waitForTimeout(1000);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        
        await page.waitForTimeout(1000);
        await page.click('button:has-text("Select a room...")');
        await page.waitForTimeout(1000);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        
        await page.waitForTimeout(1000);
        await page.click('button:has-text("Select a bed...")');
        await page.waitForTimeout(1000);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        
        await page.getByRole('button', { name: 'Add Guest' }).click();
        await page.waitForSelector('text=successfully added', { timeout: 40000 });
        console.log(`[Setup] Tenant onboarded.`);
    }

    await page.waitForTimeout(2000); 
    await page.context().storageState({ path: OWNER_AUTH });
}

setup('Authenticate as Owner', async ({ page }) => {
    await setupOwner(page);
});

setup('Authenticate as Tenant', async ({ page }) => {
    await login(page, 'tenant_tester_8@roombox.app', 'Password123!', false);
    if (page.url().includes('/complete-profile')) {
        await page.click('button:has-text("Renting a room")');
        await page.waitForURL('**/tenants/my-pg', { timeout: 20000 });
    }
    await page.waitForTimeout(2000); 
    await page.context().storageState({ path: TENANT_AUTH });
});

