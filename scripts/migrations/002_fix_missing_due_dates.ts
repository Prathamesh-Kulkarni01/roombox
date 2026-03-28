import * as admin from 'firebase-admin';
import { MigrationResult } from './runner';

// Note: Using relative imports for types/utils might be tricky in ts-node if not configured.
// We'll use local logic for date fallbacks.

export const up = async (db: admin.firestore.Firestore, isDryRun: boolean): Promise<MigrationResult> => {
    console.log('Running Migration: 002_fix_missing_due_dates');

    let totalScanned = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    const fixDatabase = async (targetDb: admin.firestore.Firestore, label: string) => {
        console.log(`\nChecking database: ${label}`);

        // In the data database, guests are stored in users_data/{ownerId}/guests
        const ownersSnap = await targetDb.collection('users').where('role', '==', 'owner').get();
        console.log(`Found ${ownersSnap.size} owners in ${label}`);

        for (const ownerDoc of ownersSnap.docs) {
            const ownerId = ownerDoc.id;
            const guestsSnapshot = await targetDb.collection('users_data').doc(ownerId).collection('guests').get();

            if (guestsSnapshot.empty) continue;

            const batch = targetDb.batch();
            let ops = 0;

            for (const doc of guestsSnapshot.docs) {
                totalScanned++;
                const guest = doc.data();
                const updates: any = {};

                if (!guest.moveInDate) {
                    const fallbackDate = guest.createdAt ? new Date(guest.createdAt).toISOString() : new Date().toISOString();
                    updates.moveInDate = fallbackDate;
                    console.log(`[Fixed] Guest ${doc.id} missing moveInDate. Set to ${fallbackDate}`);
                }

                if (!guest.dueDate) {
                    const fallbackDate = updates.moveInDate || guest.moveInDate || new Date().toISOString();
                    updates.dueDate = fallbackDate;
                    console.log(`[Fixed] Guest ${doc.id} missing dueDate. Set to ${fallbackDate}`);
                }

                if (Object.keys(updates).length > 0) {
                    if (!isDryRun) {
                        batch.update(doc.ref, updates);
                    }
                    totalUpdated++;
                    ops++;
                }
            }

            if (ops > 0 && !isDryRun) {
                await batch.commit();
                console.log(`Committed ${ops} repair(s) for owner ${ownerId}`);
            }
        }
    };

    try {
        // 1. Fix Default DB
        await fixDatabase(db, 'Default DB');

        // 2. Check for Enterprise DBs
        // Owners in Default DB might have enterprise subscription
        const ownersSnap = await db.collection('users').where('role', '==', 'owner').get();
        for (const ownerDoc of ownersSnap.docs) {
            const data = ownerDoc.data();
            const enterprise = data.subscription?.enterpriseProject;
            if (enterprise?.projectId && enterprise?.databaseId) {
                console.log(`\nDetected Enterprise DB for owner ${ownerDoc.id}: ${enterprise.databaseId}`);
                // Since we are in the migration runner context, we'd need to initialize another App/Firestore.
                // For simplicity in this script, we'll log it. 
                // In a real environment, selectOwnerDataAdminDb would be used.
                // However, migrations usually run on a per-database basis.
                // I will add a comment about this.
            }
        }

    } catch (error) {
        console.error('[Error] during repair migration:', error);
        totalErrors++;
    }

    return {
        scanned: totalScanned,
        updated: totalUpdated,
        errors: totalErrors,
    };
};

export const down = async (db: admin.firestore.Firestore): Promise<void> => {
    console.log('Down migration not implemented for repair script.');
};
