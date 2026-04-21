import { test, expect } from '@playwright/test';
import { buildPropertyData, buildTenantData } from '../../factories/dataFactory';
import { loginWorkflow } from '../../workflows/authWorkflow';
import { createPropertyWorkflow } from '../../workflows/propertyWorkflow';
import { onboardTenantWorkflow } from '../../workflows/tenantWorkflow';
import { DbHelper } from '../../api/db';
import { OWNER_EMAIL, OWNER_PASSWORD, OWNER_ID } from '../../test-utils';

test.describe('Core Business Journey (High-Signal E2E) @smoke', () => {
    const db = new DbHelper();
    const propertyData = buildPropertyData('CORE');
    const tenantData = buildTenantData('CORE');

    test('Full Lifecycle: Create PG -> Onboard Tenant -> Verify DB', async ({ page }) => {
        // 1. Isolated Login (No shared owner.json state)
        await loginWorkflow(page, OWNER_EMAIL, OWNER_PASSWORD);

        // 2. Business Workflows (God-object-free orchestration)
        await createPropertyWorkflow(page, propertyData);
        await onboardTenantWorkflow(page, {
            ...tenantData,
            pgName: propertyData.name,
            rent: '5000'
        });

        // 3. High-Signal Assertions (Verified at the source)
        console.log(`[E2E] Verifying Firestore state for ${tenantData.phone}...`);
        
        // Use a small wait for sync if needed, but DbHelper should handle polling if optimized
        await page.waitForTimeout(2000); 
        
        // IMPORTANT: We verify BUSINESS logic, not just "Success" text
        const guestDoc = await db.getGuestByPhone(OWNER_ID, tenantData.phone);
        expect(guestDoc).not.toBeNull();
        expect(guestDoc?.name).toBe(tenantData.name);
        expect(Number(guestDoc?.rentAmount)).toBe(5000);

        console.log('✅ Core Journey Verified: UI flows synced to DB.');
    });
});
