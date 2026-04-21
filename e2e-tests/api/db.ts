import { getAdminDb } from '../../src/lib/firebaseAdmin';

/**
 * High-Signal DB Assertions
 * Directly interacts with Firestore Emulator for deep state validation.
 */
export class DbHelper {
    /**
     * Get a property by its name (unique per test run)
     */
    async getPropertyByName(ownerId: string, name: string) {
        const db = await getAdminDb();
        const snapshot = await db.collection('users_data')
            .doc(ownerId)
            // App code largely uses `pgs` for properties (see src/services/propertyService.ts)
            .collection('pgs')
            .where('name', '==', name)
            .get();
        
        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }

    /**
     * Get a tenant by phone number
     */
    async getGuestByPhone(ownerId: string, phone: string) {
        const db = await getAdminDb();
        const cleanDigits = phone.replace(/\D/g, '').slice(-10);
        const variants = Array.from(new Set([
            cleanDigits,
            `91${cleanDigits}`,
            `+91${cleanDigits}`,
            `+${cleanDigits}`,
        ])).filter(Boolean);

        let snapshot = await db
            .collection('users_data')
            .doc(ownerId)
            .collection('guests')
            .where('phone', 'in', variants.slice(0, 10))
            .get();

        // Fallback: if data shape changed, find via collectionGroup.
        if (snapshot.empty) {
            snapshot = await db
                .collectionGroup('guests')
                .where('ownerId', '==', ownerId)
                .where('phone', 'in', variants.slice(0, 10))
                .limit(1)
                .get();
        }
        
        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }

    /**
     * Explicit cleaner for parallel isolation
     */
    async cleanupOwnerData(ownerId: string) {
        const db = await getAdminDb();
        // This would be a deep delete, but for emulators, usually we just rely on unique identifiers.
        // If needed, we can implement a more aggressive wipe here.
    }
}
