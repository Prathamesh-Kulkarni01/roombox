import * as admin from 'firebase-admin';
import type { MigrationResult } from './runner';

export const targetVersion = 1;

export async function up(db: admin.firestore.Firestore, isDryRun?: boolean): Promise<MigrationResult> {
    const result: MigrationResult = { scanned: 0, updated: 0, errors: 0 };
    
    // We update 'pgs' collection group for the new minimumBalanceForLateFee
    const pgsSnap = await db.collectionGroup('pgs').get();
    
    for (const doc of pgsSnap.docs) {
        result.scanned++;
        const data = doc.data();
        
        let needsUpdate = false;
        let updateData: any = {};

        if (data.minimumBalanceForLateFee === undefined) {
            updateData.minimumBalanceForLateFee = 100;
            needsUpdate = true;
        }

        if (data.schemaVersion === undefined || data.schemaVersion < 1) {
            updateData.schemaVersion = 1;
            needsUpdate = true;
        }

        if (needsUpdate) {
            try {
                if (!isDryRun) {
                    await doc.ref.update(updateData);
                }
                result.updated++;
            } catch (err) {
                console.error(`Failed to update pg ${doc.id}:`, err);
                result.errors++;
            }
        }
    }

    // We update 'guests' collection group
    const guestsSnap = await db.collectionGroup('guests').get();
    for (const doc of guestsSnap.docs) {
        result.scanned++;
        const data = doc.data();
        
        let needsUpdate = false;
        let updateData: any = {};

        if (data.schemaVersion === undefined || data.schemaVersion < 1) {
            updateData.schemaVersion = 1;
            needsUpdate = true;
        }

        if (needsUpdate) {
            try {
                if (!isDryRun) {
                    await doc.ref.update(updateData);
                }
                result.updated++;
            } catch (err) {
                console.error(`Failed to update guest ${doc.id}:`, err);
                result.errors++;
            }
        }
    }
    
    return result;
}

export async function down(db: admin.firestore.Firestore): Promise<MigrationResult> {
    return { scanned: 0, updated: 0, errors: 0 };
}
