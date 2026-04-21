import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import { loginWorkflow } from './workflows/authWorkflow';
import { createPropertyWorkflow, setupFullPropertyLayout } from './workflows/propertyWorkflow';
import { onboardTenantWorkflow } from './workflows/tenantWorkflow';
import { AuthPage } from './pages/AuthPage';
import { seedAuthEmulator } from './seed-utils';
import { OWNER_EMAIL, TENANT_PHONE, TARGET_PG_NAME, RUN_ID, OWNER_PASSWORD, TENANT_PASSWORD } from './test-utils';

const AUTH_DIR = path.resolve(process.cwd(), 'playwright/.auth');
const OWNER_AUTH = path.join(AUTH_DIR, 'owner.json');
const TENANT_AUTH = path.join(AUTH_DIR, 'tenant.json');

setup('Authenticate Both Owner and Tenant', async ({ page }) => {
    // 0. Seed Emulator Users
    await seedAuthEmulator();

    const auth = new AuthPage(page);

    // 1. Authenticate as Owner
    await loginWorkflow(page, OWNER_EMAIL, OWNER_PASSWORD);
    
    // 2. Setup Property & Layout (Ensures rooms exist for tenant seeding)
    await createPropertyWorkflow(page, { 
        name: TARGET_PG_NAME, 
        location: 'Auto Street', 
        city: 'AutoCity' 
    });
    
    await setupFullPropertyLayout(page, TARGET_PG_NAME);

    // 3. Seed Tenant
    await onboardTenantWorkflow(page, {
        name: `Auth Tenant ${RUN_ID}`,
        phone: TENANT_PHONE,
        pgName: TARGET_PG_NAME,
        rent: '5000'
    });

    // 4. Save States
    await page.context().storageState({ path: OWNER_AUTH });
    
    await auth.logout();
    // Tenant accounts in emulator are most reliable via OTP (password may not be set/usable for phone auth).
    await loginWorkflow(page, TENANT_PHONE, undefined, { otp: true });
    await page.context().storageState({ path: TENANT_AUTH });
    
    console.log(`[Setup] Global Auth Setup complete with Layout & Tenant seeding.`);
});
