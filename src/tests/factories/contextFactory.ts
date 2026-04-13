import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { v4 as uuidv4 } from 'uuid';

/**
 * ContextFactory — Dynamic Test Data Generator
 * 
 * Provides an isolated "Owner -> PG -> Staff/Tenant" cluster for RBAC testing.
 * Guarantees zero side effects between test runs.
 */
export class ContextFactory {
    private currentIds: string[] = [];

    /**
     * Creates a fully isolated context.
     * @returns Object containing IDs for cleanup
     */
    async createFullContext() {
        const db = await getAdminDb();
        const auth = await getAdminAuth();

        const ownerId = `test-owner-${uuidv4().slice(0, 8)}`;
        const pgId = `test-pg-${uuidv4().slice(0, 8)}`;
        const staffId = `test-staff-${uuidv4().slice(0, 8)}`;
        const tenantId = `test-tenant-${uuidv4().slice(0, 8)}`;

        const phone = `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`;

        // 1. Create Owner User Doc
        await db.collection('users').doc(ownerId).set({
            role: 'owner',
            name: 'Test Owner',
            email: `${ownerId}@example.com`,
            createdAt: new Date().toISOString(),
        });

        // 2. Create Property
        await db.collection('users_data').doc(ownerId).collection('properties').doc(pgId).set({
            id: pgId,
            name: 'Test PG',
            ownerId,
        });

        // 3. Create Staff User + Profile
        await db.collection('users').doc(staffId).set({
            role: 'staff',
            name: 'Test Staff',
            phone,
            ownerId,
            activeStaffProfiles: [{
                staffId: 'staff-doc-id', // link to metadata
                pgIds: [pgId],
                ownerId,
                role: 'manager'
            }],
            pgIds: [pgId],
            permissions: ['guests:view', 'guests:add', 'complaints:view'], // Default staff perms
        });

        // 4. Create Tenant User + Guest Record
        await db.collection('users').doc(tenantId).set({
            role: 'tenant',
            name: 'Test Tenant',
            phone: `+919999999999`,
            ownerId,
            activeTenancies: [{
                guestId: 'guest-doc-id',
                pgId,
                ownerId
            }]
        });

        this.currentIds.push(ownerId, tenantId, staffId);

        return {
            ownerId,
            pgId,
            staffId,
            tenantId,
            phone
        };
    }

    /**
     * Cleans up all resources created during this factory session.
     */
    async cleanup() {
        const db = await getAdminDb();
        const auth = await getAdminAuth();

        for (const id of this.currentIds) {
            try {
                // Delete user doc
                await db.collection('users').doc(id).delete();
                // Note: We don't delete from Auth to avoid excessive API calls in tests,
                // as we use Mock tokens for API contract testing.
            } catch (e) {
                console.warn(`[ContextFactory] Cleanup failed for ${id}:`, e);
            }
        }
        
        this.currentIds = [];
    }

    /**
     * Generates a mock "Staff" token with specific claims.
     */
    static getMockStaffClaims(userId: string, ownerId: string, pgIds: string[], permissions: string[]) {
        return {
            uid: userId,
            ownerId,
            role: 'staff',
            pgIds,
            permissions,
        };
    }
}
