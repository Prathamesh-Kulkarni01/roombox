import * as admin from 'firebase-admin';
import type { MigrationResult } from './runner';

export const targetVersion = 2;

export async function up(db: admin.firestore.Firestore, isDryRun?: boolean): Promise<MigrationResult> {
    const result: MigrationResult = { scanned: 0, updated: 0, errors: 0 };
    
    // Update 'guests' collection group for new fields (schemaVersion 2)
    const guestsSnap = await db.collectionGroup('guests').get();
    
    for (const doc of guestsSnap.docs) {
        result.scanned++;
        const data = doc.data();
        
        let needsUpdate = false;
        let updateData: any = {};

        // Assume pending for users who don't have it explicitly approved/rejected
        if (data.screeningStatus === undefined) {
            updateData.screeningStatus = 'pending';
            needsUpdate = true;
        }

        if (data.schemaVersion === undefined || data.schemaVersion < 2) {
            updateData.schemaVersion = 2;
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
