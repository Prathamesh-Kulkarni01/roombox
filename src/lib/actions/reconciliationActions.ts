

'use server';

import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import type { Guest } from '@/lib/types';
import { runReconciliationLogic } from '@/lib/reconciliation';
import { isEnterpriseIsolated } from '@/lib/enterprise/isolation';

export async function reconcileSingleGuest({ ownerId, guestId, now }: { ownerId: string, guestId: string, now?: Date }): Promise<{ success: boolean; cyclesProcessed: number }> {
    const dataDb = await selectOwnerDataAdminDb(ownerId);
    const guestDocRef = dataDb.collection('users_data').doc(ownerId).collection('guests').doc(guestId);

    try {
        let pgOptions: any = undefined;
        const resultObj = await dataDb.runTransaction(async (transaction) => {
            const guestDoc = await transaction.get(guestDocRef);
            if (!guestDoc.exists) {
                console.error(`[Reconcile] Guest ${guestId} not found.`);
                return { cycles: 0, updated: false, lateFee: false };
            }

            const guest = guestDoc.data() as Guest;
            
            const pgDocRef = dataDb.collection('users_data').doc(ownerId).collection('properties').doc(guest.pgId);
            const pgDoc = await transaction.get(pgDocRef);
            if (pgDoc.exists) {
                const pgData = pgDoc.data();
                pgOptions = {
                    lateFeeEnabled: pgData?.lateFeeEnabled,
                    lateFeeGracePeriodDays: pgData?.lateFeeGracePeriodDays,
                    lateFeeAmount: pgData?.lateFeeAmount
                };
            }

            const result = runReconciliationLogic(guest, now || new Date(), pgOptions);

            if (result.cyclesProcessed === 0 && !result.lateFeeApplied) {
                return { cycles: 0, updated: false, lateFee: false };
            }

            transaction.update(guestDocRef, result.guest as any);

            // Sync ledger changes to financial_events subcollection
            const oldLedger = guest.ledger || [];
            const newLedger = result.guest.ledger || [];
            const oldLedgerMap = new Map(oldLedger.map(e => [e.id, e]));

            for (const entry of newLedger) {
                const oldEntry = oldLedgerMap.get(entry.id);
                if (!oldEntry || oldEntry.amount !== entry.amount) {
                    const eventRef = guestDocRef.collection('financial_events').doc(entry.id);
                    const event = {
                        id: entry.id,
                        guestId,
                        pgId: guest.pgId,
                        ownerId,
                        type: entry.isLateFee ? 'late_fee' : 'rent_charge',
                        amount: entry.amount,
                        description: entry.description,
                        date: entry.date,
                        createdAt: new Date().toISOString(),
                        createdBy: 'system_cron',
                        schemaVersion: 1,
                        metadata: { amountType: entry.amountType, symbolicValue: entry.symbolicValue }
                    };
                    transaction.set(eventRef, event, { merge: true });
                }
            }

            return { cycles: result.cyclesProcessed, updated: true, lateFee: result.lateFeeApplied };
        });

        if (resultObj.updated) {
            const guestDoc = await guestDocRef.get();
            const finalGuest = guestDoc.data() as Guest;
            console.log(`[Reconcile] Processed updates for guest ${finalGuest.name}. New Due Date: ${finalGuest.dueDate}. Late Fee Applied: ${resultObj.lateFee}`);
            
            // Trigger Notification for late fee if applied
            if (resultObj.lateFee) {
                // Call notification logic (can be fire-and-forget or imported dynamically)
                import('@/lib/actions/notificationActions').then(({ sendLateFeeReminder }) => {
                    if (sendLateFeeReminder) {
                        sendLateFeeReminder({ ownerId, guest: finalGuest, lateFeeAmount: pgOptions?.lateFeeAmount || 0 }).catch(err => console.error(err));
                    }
                }).catch(e => console.error("Failed to load notificationActions", e));
            }
        }

        return { success: true, cyclesProcessed: resultObj.cycles };
    } catch (err: any) {
        console.error(`[Reconcile] Error processing guest ${guestId}:`, err.message);
        return { success: false, cyclesProcessed: 0 };
    }
}


export async function reconcileForOwner(
    ownerId: string,
    limit?: number,
    now?: Date,
    options?: { tenantScheduled?: boolean; knownIsolationStatus?: boolean }
): Promise<{ success: boolean; reconciledCount: number; errorCount: number; }> {
    const { isCentralGuestDataAccessBlocked } = await import('@/lib/cron/enterprise-utils');
    if (await isCentralGuestDataAccessBlocked(ownerId, options?.tenantScheduled, options?.knownIsolationStatus)) {
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

    const targetDateStr = (now || new Date()).toISOString();
    const guestsToProcess = guestsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.dueDate && data.dueDate <= targetDateStr;
    });

    for (const guestDoc of guestsToProcess) {
        if (limit && processedGuestCount >= limit) {
            console.log(`[Reconcile] Reached processing limit of ${limit} for owner ${ownerId}.`);
            break;
        }

        try {
            const result = await reconcileSingleGuest({ ownerId, guestId: guestDoc.id, now });
            if (result.success && result.cyclesProcessed > 0) { // cyclesProcessed could be 0 if only late fee applied, but that's fine to count as processed or we can just count success
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
            const isolated = isEnterpriseIsolated(userData as Record<string, unknown>);
            
            if (isolated) {
                continue;
            }

            if (limit && totalProcessed >= limit) {
                break;
            }

            const result = await reconcileForOwner(ownerId, limit ? limit - totalProcessed : undefined, now, { knownIsolationStatus: isolated });
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
