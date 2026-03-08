import * as admin from 'firebase-admin';
import { CURRENT_SCHEMA_VERSION } from '../../src/lib/types';
import { MigrationResult } from './runner';

export const up = async (db: admin.firestore.Firestore): Promise<MigrationResult> => {
    console.log('Running Migration: 001_add_schema_version');

    // Core collections to update
    const collections = ['pgs', 'guests', 'payments', 'complaints'];

    let totalScanned = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    for (const collectionName of collections) {
        console.log(`\nProcessing collection: ${collectionName}`);

        try {
            const snapshot = await db.collection(collectionName).get();

            // Handle batches to avoid hitting firestore limits
            const batchSize = 500;
            let batch = db.batch();
            let operationsInBatch = 0;

            for (const doc of snapshot.docs) {
                totalScanned++;
                const data = doc.data();

                // If schemaVersion is missing or less than CURRENT_SCHEMA_VERSION
                if (!data.schemaVersion || data.schemaVersion < CURRENT_SCHEMA_VERSION) {
                    batch.update(doc.ref, { schemaVersion: CURRENT_SCHEMA_VERSION });
                    totalUpdated++;
                    operationsInBatch++;

                    // Commit batch every batchSize
                    if (operationsInBatch === batchSize) {
                        await batch.commit();
                        console.log(`[Batch Commit] Updated ${operationsInBatch} documents.`);
                        batch = db.batch(); // Create new batch
                        operationsInBatch = 0;
                    }
                }
            }

            // Commit remaining updates
            if (operationsInBatch > 0) {
                await batch.commit();
                console.log(`[Batch Commit] Updated ${operationsInBatch} documents.`);
            }

        } catch (error) {
            console.error(`[Error] processing collection ${collectionName}:`, error);
            totalErrors++;
        }
    }

    return {
        scanned: totalScanned,
        updated: totalUpdated,
        errors: totalErrors,
    };
};

export const down = async (db: admin.firestore.Firestore): Promise<void> => {
    console.log('Rolling back migration involves deleting the schemaVersion field.');
    // Reverse logic here if implemented
};
