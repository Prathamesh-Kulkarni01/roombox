

'use server';

import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import type { Guest } from '@/lib/types';
import { runReconciliationLogic } from '@/lib/reconciliation';

async function reconcileSingleGuest({ ownerId, guestId }: { ownerId: string, guestId: string }): Promise<{ success: boolean; cyclesProcessed: number }> {
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
            
            const result = runReconciliationLogic(guest, new Date());
            
            if (result.cyclesProcessed === 0) {
                return 0;
            }

            transaction.update(guestDocRef, result.guest);
            return result.cyclesProcessed;
        });
        
        if(cyclesProcessed > 0) {
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


export async function reconcileAllGuests(limit?: number): Promise<{ success: boolean; reconciledCount: number; errorCount: number; }> {
    const adminDb = await getAdminDb();
    let processedGuestCount = 0;
    let totalErrors = 0;

    try {
        const ownersSnapshot = await adminDb.collection('users').where('role', '==', 'owner').get();

        for (const ownerDoc of ownersSnapshot.docs) {
            const ownerId = ownerDoc.id;
            const dataDb = await selectOwnerDataAdminDb(ownerId);
            const guestsSnapshot = await dataDb.collection('users_data').doc(ownerId).collection('guests').where('isVacated', '==', false).get();

            for (const guestDoc of guestsSnapshot.docs) {
                 if (limit && processedGuestCount >= limit) {
                    console.log(`[Reconcile All] Reached processing limit of ${limit}.`);
                    break; 
                }

                try {
                    const result = await reconcileSingleGuest({ ownerId, guestId: guestDoc.id });
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
