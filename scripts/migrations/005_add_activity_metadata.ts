import * as admin from 'firebase-admin';
import { CURRENT_SCHEMA_VERSION } from '../../src/lib/types';
import { MigrationResult } from './runner';

/**
 * Migration 005: Add activity metadata fields (createdAt, createdBy, updatedAt, updatedBy)
 * and update schemaVersion to 7 for all core entities.
 */
export const targetVersion = 7;

export const up = async (db: admin.firestore.Firestore, isDryRun: boolean): Promise<MigrationResult> => {
    console.log('Running Migration: 005_add_activity_metadata');

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

    const targetSubcollections = ['pgs', 'guests', 'expenses', 'complaints'];

    for (const subcollection of targetSubcollections) {
        try {
            console.log(`Processing subcollection: ${subcollection}...`);
            const snapshot = await db.collectionGroup(subcollection).get();
            
            for (const doc of snapshot.docs) {
                totalScanned++;
                const data = doc.data();

                // Check if we need to update
                if (!data.schemaVersion || data.schemaVersion < CURRENT_SCHEMA_VERSION) {
                    const updates: any = {
                        schemaVersion: CURRENT_SCHEMA_VERSION,
                    };

                    // Add createdAt if missing, using document creation time as best guess
                    if (!data.createdAt) {
                        updates.createdAt = doc.createTime.toDate().toISOString();
                        updates.createdBy = data.createdBy || systemPerformer;
                    }

                    // Add updatedAt/updatedBy
                    updates.updatedAt = doc.updateTime.toDate().toISOString();
                    updates.updatedBy = data.updatedBy || systemPerformer;

                    if (!isDryRun) {
                        batch.update(doc.ref, updates);
                    }
                    
                    totalUpdated++;
                    operationsInBatch++;
                    if (operationsInBatch >= batchSize) await commitBatch();
                }
            }
        } catch (error) {
            console.error(`Error migrating ${subcollection}:`, error);
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

export const down = async (db: admin.firestore.Firestore): Promise<void> => {
    console.log('Rollback not implemented for 005_add_activity_metadata');
};
