

'use server';

import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import type { Guest } from '@/lib/types';
import { runReconciliationLogic } from '@/lib/reconciliation';
import { isEnterpriseIsolated } from '@/lib/enterprise/isolation';

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


export async function reconcileForOwner(
    ownerId: string,
    limit?: number,
    now?: Date,
    options?: { tenantScheduled?: boolean }
): Promise<{ success: boolean; reconciledCount: number; errorCount: number; }> {
    const { isCentralGuestDataAccessBlocked } = await import('@/lib/cron/enterprise-utils');
    if (await isCentralGuestDataAccessBlocked(ownerId, options?.tenantScheduled)) {
        return { success: false, reconciledCount: 0, errorCount: 0 };
    }

    const dataDb = await selectOwnerDataAdminDb(ownerId);
    let guestsSnapshot;
    let processedGuestCount = 0;
    let totalErrors = 0;

    try {
        // Try optimized query (requires composite index: isVacated, dueDate)
        guestsSnapshot = await dataDb.collection('users_data').doc(ownerId).collection('guests')
            .where('isVacated', '==', false)
            .where('dueDate', '<=', (now || new Date()).toISOString())
            .get();
    } catch (error: any) {
        if (error.code === 9 || error.message?.includes('FAILED_PRECONDITION')) {
            console.warn(`[Reconcile] Index missing for optimized query. Falling back to full sweep for owner ${ownerId}. Please create the required index.`);
            // Fallback to full sweep (already has index or is primary)
            guestsSnapshot = await dataDb.collection('users_data').doc(ownerId).collection('guests')
                .where('isVacated', '==', false)
                .get();
        } else {
            console.error(`[Reconcile] Failed to fetch guests for owner ${ownerId}`, error);
            return { success: false, reconciledCount: 0, errorCount: 1 };
        }
    }

    for (const guestDoc of guestsSnapshot.docs) {
        if (limit && processedGuestCount >= limit) {
            console.log(`[Reconcile] Reached processing limit of ${limit} for owner ${ownerId}.`);
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
            console.error(`[Reconcile] Failed for guest ${guestDoc.id} of owner ${ownerId}`, e);
            totalErrors++;
        }
    }

    console.log(`[Reconcile] Owner ${ownerId}: Successfully processed ${processedGuestCount} guests. Failed: ${totalErrors}.`);
    return { success: totalErrors === 0, reconciledCount: processedGuestCount, errorCount: totalErrors };
}

export async function reconcileAllGuests(limit?: number, now?: Date): Promise<{ success: boolean; reconciledCount: number; errorCount: number; }> {
    const adminDb = await getAdminDb();
    let totalProcessed = 0;
    let totalErrors = 0;

    try {
        const ownersSnapshot = await adminDb.collection('users').where('role', '==', 'owner').get();

        for (const ownerDoc of ownersSnapshot.docs) {
            const ownerId = ownerDoc.id;
            const userData = ownerDoc.data();
            
            if (isEnterpriseIsolated(userData as Record<string, unknown>)) {
                continue;
            }

            if (limit && totalProcessed >= limit) {
                break;
            }

            const result = await reconcileForOwner(ownerId, limit ? limit - totalProcessed : undefined, now);
            totalProcessed += result.reconciledCount;
            totalErrors += result.errorCount;
        }
        
        console.log(`[Reconcile All] Successfully processed reconciliation for ${totalProcessed} standard guests. Failed: ${totalErrors}.`);
        return { success: totalErrors === 0, reconciledCount: totalProcessed, errorCount: totalErrors };
    } catch (error: any) {
        console.error('[Reconcile All] Cron job failed:', error);
        return { success: false, reconciledCount: totalProcessed, errorCount: totalErrors };
    }
}
