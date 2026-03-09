

'use server';

import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import type { Guest } from '@/lib/types';
import { runReconciliationLogic } from '@/lib/reconciliation';

export async function reconcileSingleGuest({ ownerId, guestId, now }: { ownerId: string, guestId: string, now?: Date }): Promise<{ success: boolean; cyclesProcessed: number }> {
    const dataDb = await selectOwnerDataAdminDb(ownerId);
    const guestDocRef = dataDb.collection('users_data').doc(ownerId).collection('guests').doc(guestId);

    try {
        const cyclesProcessed = await dataDb.runTransaction(async (transaction) => {
            const guestDoc = await transaction.get(guestDocRef);
            if (!guestDoc.exists) {
                console.error(`[Reconcile] Guest ${guestId} not found.`);
                return 0;
            }

            const guest = guestDoc.data() as Guest;

            const result = runReconciliationLogic(guest, now || new Date());

            if (result.cyclesProcessed === 0) {
                return 0;
            }

            transaction.update(guestDocRef, result.guest as any);
            return result.cyclesProcessed;
        });

        if (cyclesProcessed > 0) {
            const guestDoc = await guestDocRef.get();
            const finalGuest = guestDoc.data() as Guest;
            console.log(`[Reconcile] Processed ${cyclesProcessed} cycle(s) for guest ${finalGuest.name}. New Due Date: ${finalGuest.dueDate}`);
        }


        return { success: true, cyclesProcessed };
    } catch (err: any) {
        console.error(`[Reconcile] Error processing guest ${guestId}:`, err.message);
        return { success: false, cyclesProcessed: 0 };
    }
}


export async function reconcileAllGuests(limit?: number, now?: Date): Promise<{ success: boolean; reconciledCount: number; errorCount: number; }> {
    const adminDb = await getAdminDb();
    let processedGuestCount = 0;
    let totalErrors = 0;

    try {
        const ownersSnapshot = await adminDb.collection('users').where('role', '==', 'owner').get();

        for (const ownerDoc of ownersSnapshot.docs) {
            const ownerId = ownerDoc.id;
            const dataDb = await selectOwnerDataAdminDb(ownerId);
            let guestsSnapshot;

            try {
                // Try optimized query (requires composite index: isVacated, dueDate)
                guestsSnapshot = await dataDb.collection('users_data').doc(ownerId).collection('guests')
                    .where('isVacated', '==', false)
                    .where('dueDate', '<=', (now || new Date()).toISOString())
                    .get();
            } catch (error: any) {
                if (error.code === 9 || error.message?.includes('FAILED_PRECONDITION')) {
                    console.warn(`[Reconcile All] Index missing for optimized query. Falling back to full sweep for owner ${ownerId}. Please create the required index.`);
                    // Fallback to full sweep (already has index or is primary)
                    guestsSnapshot = await dataDb.collection('users_data').doc(ownerId).collection('guests')
                        .where('isVacated', '==', false)
                        .get();
                } else {
                    throw error;
                }
            }

            for (const guestDoc of guestsSnapshot.docs) {
                if (limit && processedGuestCount >= limit) {
                    console.log(`[Reconcile All] Reached processing limit of ${limit}.`);
                    break;
                }

                try {
                    const result = await reconcileSingleGuest({ ownerId, guestId: guestDoc.id, now });
                    if (result.success && result.cyclesProcessed > 0) {
                        processedGuestCount++;
                    } else if (!result.success) {
                        totalErrors++;
                    }
                } catch (e) {
                    console.error(`[Reconcile All] Failed for guest ${guestDoc.id} of owner ${ownerId}`, e);
                    totalErrors++;
                }
            }
            if (limit && processedGuestCount >= limit) {
                break;
            }
        }
        console.log(`[Reconcile All] Successfully processed reconciliation for ${processedGuestCount} guests. Failed: ${totalErrors}.`);
        return { success: totalErrors === 0, reconciledCount: processedGuestCount, errorCount: totalErrors };
    } catch (error: any) {
        console.error('[Reconcile All] Cron job failed:', error);
        return { success: false, reconciledCount: 0, errorCount: totalErrors };
    }
}
