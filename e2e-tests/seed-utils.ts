import { getAdminAuth, getAdminDb } from '../src/lib/firebaseAdmin';
import { OWNER_EMAIL, OWNER_ID, OWNER_PASSWORD, TENANT_PHONE, TENANT_PASSWORD } from './test-utils';

/**
 * Ensures test users exist in the Auth Emulator and Firestore.
 */
export async function seedAuthEmulator() {
    console.log('[Seed] Ensuring test users exist in Auth Emulator...');
    
    // Configure for Emulator
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    process.env.FIREBASE_PROJECT_ID = 'roombox-test';

    const auth = await getAdminAuth();
    const db = await getAdminDb();

    // 1. Owner User (Auth)
    try {
        await auth.getUser(OWNER_ID);
        console.log(`[Seed] Owner ${OWNER_EMAIL} (${OWNER_ID}) already exists.`);
    } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
            console.log(`[Seed] Owner ${OWNER_EMAIL} MISSING. Creating...`);
            await auth.createUser({
                uid: OWNER_ID,
                email: OWNER_EMAIL,
                password: OWNER_PASSWORD,
                emailVerified: true
            });
            console.log(`[Seed] Owner ${OWNER_EMAIL} created.`);
        } else {
            console.error('[Seed] Error checking owner auth:', err);
        }
    }

    // 1.1 Owner User (Firestore)
    try {
        console.log(`[Seed] Ensuring Owner Firestore doc (${OWNER_ID}) has active subscription...`);
        await db.collection('users').doc(OWNER_ID).set({
            email: OWNER_EMAIL,
            name: 'Bot Tester',
            role: 'owner',
            status: 'active',
            subscription: {
                status: 'active',
                planId: 'pro',
                startDate: new Date().toISOString(),
            },
            createdAt: new Date().toISOString(),
            schemaVersion: 2
        }, { merge: true });
        console.log(`[Seed] Owner Firestore doc updated.`);
    } catch (err) {
        console.error('[Seed] Error seeding owner Firestore doc:', err);
    }

    // 2. Tenant User
    const fullPhone = `+91${TENANT_PHONE}`;
    let tenantUid: string | null = null;
    try {
        const tenant = await auth.getUserByPhoneNumber(fullPhone);
        console.log(`[Seed] Tenant ${TENANT_PHONE} (${tenant.uid}) already exists.`);
        tenantUid = tenant.uid;
    } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
            console.log(`[Seed] Tenant ${TENANT_PHONE} MISSING. Creating...`);
            const created = await auth.createUser({
                phoneNumber: fullPhone,
                password: TENANT_PASSWORD,
            });
            console.log(`[Seed] Tenant ${TENANT_PHONE} created.`);
            tenantUid = created.uid;
        } else {
            console.error('[Seed] Error checking tenant:', err);
        }
    }

    // 2.1 Tenant User (Firestore)
    // Needed for OTP send route, which checks `users.phone` to avoid enumeration.
    if (tenantUid) {
        try {
            await db.collection('users').doc(tenantUid).set({
                role: 'tenant',
                phone: fullPhone,
                createdAt: new Date().toISOString(),
                schemaVersion: 1,
            }, { merge: true });
            console.log(`[Seed] Tenant Firestore doc ensured for ${TENANT_PHONE} (${tenantUid}).`);
        } catch (err) {
            console.error('[Seed] Error seeding tenant Firestore doc:', err);
        }
    }
}
