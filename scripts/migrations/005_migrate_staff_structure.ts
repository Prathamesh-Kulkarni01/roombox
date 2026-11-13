import * as admin from 'firebase-admin';
import { MigrationResult } from './runner';

/**
 * Migration 005: Transform Staff structure to support Multi-PG
 * Moves pgId -> pgIds[] and pgName -> pgNames[]
 */
export const targetVersion = 5;

export const up = async (db: admin.firestore.Firestore, isDryRun: boolean): Promise<MigrationResult> => {
    console.log('Running Migration: 005_migrate_staff_structure');

    let totalScanned = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    const batchSize = 500;
    let batch = db.batch();
    let operationsInBatch = 0;

    const commitBatch = async () => {
        if (operationsInBatch > 0 && !isDryRun) {
            await batch.commit();
            console.log(`[Batch Commit] Updated ${operationsInBatch} staff documents.`);
            batch = db.batch();
            operationsInBatch = 0;
        } else if (isDryRun) {
            operationsInBatch = 0;
        }
    };

    try {
        // Staff are usually in owners/guests or owners/users_data or just a top level staff collection?
        // Based on types.ts and common patterns, let's check collectionGroup('staff')
        console.log('Processing staff collection group...');
        const snapshot = await db.collectionGroup('staff').get();
        
        for (const doc of snapshot.docs) {
            totalScanned++;
            const data = doc.data();

            if (!data.schemaVersion || data.schemaVersion < 5) {
                const updates: any = {
                    schemaVersion: 5,
                    isActive: data.isActive ?? true,
                    permissions: data.permissions || []
                };

                // Migrate pgId to pgIds array
                if (data.pgId && (!data.pgIds || data.pgIds.length === 0)) {
                    updates.pgIds = [data.pgId];
                } else if (!data.pgIds) {
                    updates.pgIds = [];
                }

                // Migrate pgName to pgNames array
                if (data.pgName && (!data.pgNames || data.pgNames.length === 0)) {
                    updates.pgNames = [data.pgName];
                } else if (!data.pgNames) {
                    updates.pgNames = [];
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
        console.error('Error migrating staff:', error);
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
    console.log('Rollback not implemented for 005_migrate_staff_structure');
    return { scanned: 0, updated: 0, errors: 0 };
};
