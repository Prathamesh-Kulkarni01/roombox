import * as admin from 'firebase-admin';
import { CURRENT_SCHEMA_VERSION } from '../../src/lib/types';
import { MigrationResult } from './runner';

export const up = async (db: admin.firestore.Firestore, isDryRun: boolean): Promise<MigrationResult> => {
    console.log('Running Migration: 004_add_direct_upi_settings');

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

    // 1. Process PGs (Subcollections)
    try {
        console.log('Processing PGs...');
        const pgsSnapshot = await db.collectionGroup('pgs').get();
        for (const doc of pgsSnapshot.docs) {
            totalScanned++;
            const data = doc.data();
            
            // Update PG fields and nested rooms
            if (!data.schemaVersion || data.schemaVersion < CURRENT_SCHEMA_VERSION) {
                const floors = data.floors || [];
                const updatedFloors = floors.map((floor: any) => ({
                    ...floor,
                    rooms: (floor.rooms || []).map((room: any) => ({
                        ...room,
                        amountType: room.amountType || 'numeric'
                    }))
                }));

                if (!isDryRun) {
                    batch.update(doc.ref, {
                        schemaVersion: CURRENT_SCHEMA_VERSION,
                        paymentMode: data.paymentMode || 'gateway',
                        online_payment_enabled: data.online_payment_enabled ?? true,
                        floors: updatedFloors
                    });
                }
                
                totalUpdated++;
                operationsInBatch++;
                if (operationsInBatch >= batchSize) await commitBatch();
            }
        }
    } catch (error) {
        console.error('Error migrating PGs:', error);
        totalErrors++;
    }

    // 2. Process Payments (Subcollections)
    try {
        console.log('Processing Payments...');
        const paymentsSnapshot = await db.collectionGroup('payments').get();
        for (const doc of paymentsSnapshot.docs) {
            totalScanned++;
            const data = doc.data();
            if (!data.schemaVersion || data.schemaVersion < CURRENT_SCHEMA_VERSION) {
                if (!isDryRun) {
                    batch.update(doc.ref, {
                        schemaVersion: CURRENT_SCHEMA_VERSION,
                        verificationStatus: data.verificationStatus || 'verified',
                        amountType: data.amountType || 'numeric'
                    });
                }
                totalUpdated++;
                operationsInBatch++;
                if (operationsInBatch >= batchSize) await commitBatch();
            }
        }
    } catch (error) {
        console.error('Error migrating Payments:', error);
        totalErrors++;
    }

    // 3. Process Guests (Subcollections)
    try {
        console.log('Processing Guests...');
        const guestsSnapshot = await db.collectionGroup('guests').get();
        const { nanoid } = await import('nanoid'); 
        
        for (const doc of guestsSnapshot.docs) {
            totalScanned++;
            const data = doc.data();
            if (!data.schemaVersion || data.schemaVersion < CURRENT_SCHEMA_VERSION || !data.shortId) {
                const shortId = data.shortId || nanoid(6).toUpperCase();
                
                if (!isDryRun) {
                    batch.update(doc.ref, {
                        schemaVersion: CURRENT_SCHEMA_VERSION,
                        amountType: data.amountType || 'numeric',
                        shortId
                    });
                }
                totalUpdated++;
                operationsInBatch++;
                if (operationsInBatch >= batchSize) await commitBatch();
            }
        }
    } catch (error) {
        console.error('Error migrating Guests:', error);
        totalErrors++;
    }

    await commitBatch();

    return {
        scanned: totalScanned,
        updated: totalUpdated,
        errors: totalErrors,
    };
};

export const down = async (db: admin.firestore.Firestore): Promise<void> => {
    console.log('Rollback not implemented for 004_add_direct_upi_settings');
};
