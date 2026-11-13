import * as admin from 'firebase-admin';
import { MigrationResult } from './runner';

/**
 * Migration 007: Add activity metadata fields (createdAt, createdBy, updatedAt, updatedBy)
 * and finalize schemaVersion to 7 for all core entities.
 */
export const targetVersion = 7;

export const up = async (db: admin.firestore.Firestore, isDryRun: boolean): Promise<MigrationResult> => {
    console.log('Running Migration: 007_add_audit_metadata');

    let totalScanned = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    const batchSize = 500;
    let batch = db.batch();
    let operationsInBatch = 0;

    const commitBatch = async () => {
        if (operationsInBatch > 0 && !isDryRun) {
            await batch.commit();
            console.log(`[Batch Commit] Updated ${operationsInBatch} documents.`);
            batch = db.batch();
            operationsInBatch = 0;
        } else if (isDryRun) {
            operationsInBatch = 0;
        }
    };

    const systemPerformer = {
        userId: 'system',
        name: 'System Migration'
    };

    const targetSubcollections = ['pgs', 'guests', 'expenses', 'complaints', 'staff', 'payments'];

    for (const subcollection of targetSubcollections) {
        try {
            console.log(`Processing subcollection: ${subcollection}...`);
            const snapshot = await db.collectionGroup(subcollection).get();
            
            for (const doc of snapshot.docs) {
                totalScanned++;
                const data = doc.data();

                // Final check to ensure everyone is on v7
                if (!data.schemaVersion || data.schemaVersion < 7) {
                    const updates: any = {
                        schemaVersion: 7,
                    };

                    // Add createdAt if missing
                    if (!data.createdAt) {
                        updates.createdAt = doc.createTime.toDate().toISOString();
                        updates.createdBy = data.createdBy || systemPerformer;
                    }

                    // Add updatedAt/updatedBy if missing
                    if (!data.updatedAt) {
                        updates.updatedAt = doc.updateTime.toDate().toISOString();
                        updates.updatedBy = data.updatedBy || systemPerformer;
                    }

                    if (!isDryRun) {
                        batch.update(doc.ref, updates);
                    }
                    
                    totalUpdated++;
                    operationsInBatch++;
                    if (operationsInBatch >= batchSize) await commitBatch();
                }
            }
        } catch (error) {
            console.error(`Error migrating audit fields for ${subcollection}:`, error);
            totalErrors++;
        }
    }

    await commitBatch();

    return {
        scanned: totalScanned,
        updated: totalUpdated,
        errors: totalErrors,
    };
};

export const down = async (db: admin.firestore.Firestore): Promise<MigrationResult> => {
    console.log('Rollback not implemented for 007_add_audit_metadata');
    return { scanned: 0, updated: 0, errors: 0 };
};
