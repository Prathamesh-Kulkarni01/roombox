
import { Firestore } from 'firebase-admin/firestore';
import { nanoid } from 'nanoid';

/**
 * Migration 004: Add shortId to all guests and update schemaVersion.
 * This shortId is used for UPI payment tracking notes.
 */
export async function migrate(db: Firestore) {
    console.log('Starting Migration 004: add_short_id');
    
    // Check if migration already executed
    const migrationRef = db.collection('system_migrations').doc('004_add_short_id');
    const migrationSnap = await migrationRef.get();
    if (migrationSnap.exists) {
        console.log('Migration 004 already executed. Skipping.');
        return;
    }

    const ownersSnap = await db.collection('users_data').get();
    let totalUpdated = 0;

    for (const ownerDoc of ownersSnap.docs) {
        const ownerId = ownerDoc.id;
        const guestsSnap = await db.collection('users_data').doc(ownerId).collection('guests').get();

        for (const guestDoc of guestsSnap.docs) {
            const guest = guestDoc.data();
            
            // Only update if missing shortId or old schemaVersion
            if (!guest.shortId || (guest.schemaVersion || 0) < 4) {
                const shortId = guest.shortId || nanoid(6).toUpperCase();
                
                await guestDoc.ref.update({
                    shortId,
                    schemaVersion: 4
                });
                totalUpdated++;
            }
        }
    }

    // Mark migration as executed
    await migrationRef.set({
        name: '004_add_short_id',
        executedAt: new Date().toISOString(),
        totalUpdated
    });

    console.log(`Migration 004 complete. Updated ${totalUpdated} guests.`);
}
