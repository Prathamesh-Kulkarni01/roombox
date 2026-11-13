import * as admin from 'firebase-admin';
import { MigrationResult } from './runner';

/**
 * Migration 006: Add matchConfidence and discrepancies to Payments
 */
export const targetVersion = 6;

export const up = async (db: admin.firestore.Firestore, isDryRun: boolean): Promise<MigrationResult> => {
    console.log('Running Migration: 006_migrate_payment_status');

    let totalScanned = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    const batchSize = 500;
    let batch = db.batch();
    let operationsInBatch = 0;

    const commitBatch = async () => {
        if (operationsInBatch > 0 && !isDryRun) {
            await batch.commit();
            console.log(`[Batch Commit] Updated ${operationsInBatch} payment documents.`);
            batch = db.batch();
            operationsInBatch = 0;
        } else if (isDryRun) {
            operationsInBatch = 0;
        }
    };

    try {
        console.log('Processing payments collection group...');
        const snapshot = await db.collectionGroup('payments').get();
        
        for (const doc of snapshot.docs) {
            totalScanned++;
            const data = doc.data();

            if (!data.schemaVersion || data.schemaVersion < 6) {
                const updates: any = {
                    schemaVersion: 6,
                    matchConfidence: data.matchConfidence || 'HIGH',
                    discrepancies: data.discrepancies || []
                };

                if (!isDryRun) {
                    batch.update(doc.ref, updates);
                }
                
                totalUpdated++;
                operationsInBatch++;
                if (operationsInBatch >= batchSize) await commitBatch();
            }
        }
    } catch (error) {
        console.error('Error migrating payments:', error);
        totalErrors++;
    }

    await commitBatch();

    return {
        scanned: totalScanned,
        updated: totalUpdated,
        errors: totalErrors,
    };
};

export const down = async (db: admin.firestore.Firestore): Promise<MigrationResult> => {
    console.log('Rollback not implemented for 006_migrate_payment_status');
    return { scanned: 0, updated: 0, errors: 0 };
};
