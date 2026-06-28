import { getAdminDb, getAdminAuth } from '../../src/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Ensures the target owner exists in the emulator (Auth + Firestore)
 */
export async function ensureOwnerExists(ownerId: string, email: string, password: string) {
    const auth = await getAdminAuth();
    const db = await getAdminDb();
    
    console.log(`[API Setup] Ensuring Owner exists: ${email} (${ownerId})`);

    // 1. Check Auth
    let userRecord;
    try {
        // Try getting by UID first
        userRecord = await auth.getUser(ownerId);
        console.log(`[API Setup] Auth user exists by UID: ${ownerId}`);
        
        // Verify email matches; if not, we might want to update it or delete/recreate
        if (userRecord.email !== email) {
            console.log(`[API Setup] UID exists but email mismatch. Updating email...`);
            await auth.updateUser(ownerId, { email });
        }
    } catch (e) {
        // UID doesn't exist, check if email exists with a different UID
        try {
            const existingUser = await auth.getUserByEmail(email);
            console.log(`[API Setup] Email already exists with different UID: ${existingUser.uid}. Deleting for clean setup...`);
            await auth.deleteUser(existingUser.uid);
        } catch (emailErr) {
            // Email doesn't exist, which is fine
        }

        try {
            userRecord = await auth.createUser({
                uid: ownerId,
                email: email,
                password: password,
                emailVerified: true
            });
            console.log(`[API Setup] Created Auth user with requested UID: ${ownerId}`);
        } catch (err: any) {
            console.warn(`[API Setup] Failed to create Auth user: ${err.message}`);
        }
    }

    // 2. Ensure Firestore User Doc has correct role
    const userRef = db.collection('users').doc(ownerId);
    const userSnap = await userRef.get();
    
    const ownerData = {
        id: ownerId,
        name: "Bot Tester",
        email: email,
        role: "owner",
        status: "active",
        isOnboarded: true,
        subscription: {
            planId: 'pro',
            status: 'active',
            trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        updatedAt: new Date().toISOString(),
        phone: email.includes('@') ? '' : email, // If it's a phone-based ID
        schemaVersion: 7
    };

    if (!userSnap.exists) {
        await userRef.set({
            ...ownerData,
            createdAt: new Date().toISOString(),
        });
        console.log(`[API Setup] Created Firestore user doc: ${ownerId}`);
    } else {
        await userRef.set({
            role: "owner",
            status: "active",
            isOnboarded: true,
            phone: ownerData.phone,
            updatedAt: new Date().toISOString(),
        }, { merge: true });
        console.log(`[API Setup] Updated Firestore user doc role to owner (onboarded): ${ownerId}`);
    }
}

/**
 * Super-fast Admin Cleanup Utility
 * Deletes all guests, staff, and properties for a given owner.
 * Bypasses UI entirely.
 */
export async function ensurePropertyExists(ownerId: string, name: string) {
    const db = await getAdminDb();
    const pgId = `pg-test-${Date.now()}`;
    const pgRef = db.collection('users_data').doc(ownerId).collection('pgs').doc(pgId);
    
    console.log(`[API Setup] Ensuring Property exists: ${name} (${pgId})`);
    
    const floorId = `floor-${Date.now()}-1`;
    const roomId = `room-${Date.now()}-1-1`;
    const bedId = `bed-${Date.now()}-1-1-1`;

    const pgData = {
        id: pgId,
        ownerId,
        name,
        location: 'Test Street',
        city: 'Test City',
        gender: 'unisex',
        floors: [
            {
                id: floorId,
                name: 'Floor 1',
                pgId,
                rooms: [
                    {
                        id: roomId,
                        name: '101',
                        pgId,
                        floorId,
                        beds: [{ id: bedId, name: '1', guestId: null }],
                        rent: 5000,
                        deposit: 10000,
                        available: true,
                        amenities: ['wifi']
                    }
                ]
            }
        ],
        totalBeds: 1,
        totalRooms: 1,
        occupancy: 0,
        isActive: true,
        rules: [],
        amenities: ['wifi'],
        priceRange: { min: 5000, max: 5000 },
        schemaVersion: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    await pgRef.set(pgData);
    
    // Also update user's summary for the switcher to detect properties
    await db.collection('users').doc(ownerId).set({
        pgSummary: {
            totalProperties: 1,
            lastPropertyAdded: new Date().toISOString()
        },
        isOnboarded: true
    }, { merge: true });
    
    console.log(`[API Setup] Property created and user summary updated for ${ownerId}`);
    return pgId;
}

export async function ensureTenantExists(ownerId: string, pgId: string, tenantId: string, tenantEmail: string) {
    const db = await getAdminDb();
    const guestId = `guest-test-${Date.now()}`;
    const guestRef = db.collection('users_data').doc(ownerId).collection('guests').doc(guestId);
    
    console.log(`[API Setup] Ensuring Tenant exists: ${tenantEmail} (${guestId}) in PG ${pgId}`);
    
    // 1. Create guest record in Owner's data
    await guestRef.set({
        id: guestId,
        uid: tenantId,
        email: tenantEmail,
        name: 'Test Tenant',
        pgId,
        roomName: '101',
        bedName: '1',
        status: 'active',
        isVacated: false,
        rent: 5000,
        deposit: 10000,
        joiningDate: new Date().toISOString(),
        schemaVersion: 2
    });
    
    // 2. Add to user's activeTenancies in Main App DB
    await db.collection('users').doc(tenantId).set({
        activeTenancies: [
            {
                pgId,
                pgName: 'Test PG',
                guestId,
                role: 'tenant',
                status: 'active'
            }
        ],
        role: 'tenant',
        phone: tenantEmail.includes('@') ? tenantEmail.split('@')[0] : tenantEmail
    }, { merge: true });
}

export async function ensureStaffExists(ownerId: string, pgId: string, staffId: string, staffEmail: string) {
    const db = await getAdminDb();
    const sId = `staff-test-${Date.now()}`;
    const staffRef = db.collection('users_data').doc(ownerId).collection('staff').doc(sId);
    
    console.log(`[API Setup] Ensuring Staff exists: ${staffEmail} (${sId}) in PG ${pgId}`);
    
    await staffRef.set({
        id: sId,
        uid: staffId,
        email: staffEmail,
        name: 'Test Manager',
        role: 'manager',
        pgId,
        salary: 10000,
        status: 'active',
        joiningDate: new Date().toISOString(),
        schemaVersion: 2
    });

    // CRITICAL: Update user document to include staff profile for context switcher
    await db.collection('users').doc(staffId).set({
        activeStaffProfiles: [
            {
                pgId,
                pgName: 'Test PG',
                staffId: sId,
                role: 'manager',
                status: 'active'
            }
        ],
        phone: staffEmail.includes('@') ? staffEmail.split('@')[0] : staffEmail
    }, { merge: true });
}

export async function wipeOwnerData(ownerId: string) {
    const db = await getAdminDb();
    console.log(`[API Cleanup] Wiping data for Owner: ${ownerId}`);
    
    try {
        const userDataRef = db.collection('users_data').doc(ownerId);

        // Delete docs in an owner-scoped subcollection in chunks.
        const deleteAllDocs = async (collectionPath: string) => {
            const colRef = userDataRef.collection(collectionPath);
            let deleted = 0;
            while (true) {
                const snap = await colRef.limit(400).get();
                if (snap.empty) break;
                const batch = db.batch();
                snap.docs.forEach((d) => batch.delete(d.ref));
                await batch.commit();
                deleted += snap.size;
            }
            if (deleted > 0) console.log(`[API Cleanup] Deleted ${deleted} docs from users_data/${ownerId}/${collectionPath}`);
        };

        // These are the collections the app primarily uses.
        await deleteAllDocs('guests');
        await deleteAllDocs('staff');
        await deleteAllDocs('pgs');
        await deleteAllDocs('properties'); // legacy/aux usage in scripts/tests

        // Reset summary fields that can affect UI switcher behavior.
        await db.collection('users').doc(ownerId).set(
            {
                pgSummary: FieldValue.delete(),
                activeTenancies: FieldValue.delete(),
            },
            { merge: true }
        );
    } catch (err: any) {
        console.warn(`[API Cleanup] Failed to wipe owner data. This typically happens if the Firestore Emulator is not running. Error: ${err.message}`);
    }
}
