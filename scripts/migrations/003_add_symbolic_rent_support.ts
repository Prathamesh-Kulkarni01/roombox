import * as admin from 'firebase-admin';
import { CURRENT_SCHEMA_VERSION } from '../../src/lib/types';
import { MigrationResult } from './runner';

export const up = async (db: admin.firestore.Firestore, isDryRun: boolean): Promise<MigrationResult> => {
    console.log('Running Migration: 003_add_symbolic_rent_support');

    const collections = ['guests', 'payments', 'rooms'];

    let totalScanned = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    for (const collectionName of collections) {
        console.log(`\nProcessing collection: ${collectionName}`);

        try {
            const snapshot = await db.collection(collectionName).get();
            const batchSize = 500;
            let batch = db.batch();
            let operationsInBatch = 0;

            for (const doc of snapshot.docs) {
                totalScanned++;
                const data = doc.data();

                if (!data.schemaVersion || data.schemaVersion < CURRENT_SCHEMA_VERSION) {
                    if (!isDryRun) {
                        batch.update(doc.ref, { 
                            schemaVersion: CURRENT_SCHEMA_VERSION,
                            amountType: data.amountType || 'numeric'
                        });
                    }
                    totalUpdated++;
                    operationsInBatch++;

                    if (operationsInBatch === batchSize && !isDryRun) {
                        await batch.commit();
                        console.log(`[Batch Commit] Updated ${operationsInBatch} documents.`);
                        batch = db.batch();
                        operationsInBatch = 0;
                    }
                }
            }

            if (operationsInBatch > 0 && !isDryRun) {
                await batch.commit();
                console.log(`[Batch Commit] Updated ${operationsInBatch} documents.`);
            }

        } catch (error) {
            console.error(`[Error] processing collection ${collectionName}:`, error);
            totalErrors++;
        }
    }

    // Also update sub-collections if necessary. 
    // ledger is usually an array in guest, so batch.update handles it if we wanted to change elements inside it.
    // But since it's an array of objects, we'd need to fetch, modify and then update.
    // For now, lazy migration in ledger-utils will handle old ledger entries.

    return {
        scanned: totalScanned,
        updated: totalUpdated,
        errors: totalErrors,
    };
};

export const down = async (db: admin.firestore.Firestore): Promise<void> => {
    console.log('Rollback not implemented for 003_add_symbolic_rent_support');
};
