
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { format, parseISO, isBefore } from 'date-fns';
import type { Guest } from '@/lib/types';
import { calculateFirstDueDate } from '@/lib/utils';


// Kept for single guest reconciliation if needed elsewhere
export async function reconcileSingleGuest(params: {
  ownerId: string;
  guestId: string;
}): Promise<{ success: boolean; reconciledCount?: number }> {
  const result = await reconcileSingleGuestFlow(params);
  return { success: result.success, reconciledCount: result.success ? 1 : 0 };
}

export async function reconcileAllGuests(limit?: number): Promise<{ success: boolean; reconciledCount: number; }> {
    const result = await reconcileAllGuestsFlow({ limit });
    return { success: result.success, reconciledCount: result.reconciledCount };
}


const reconcileSingleGuestFlow = ai.defineFlow(
  {
    name: 'reconcileSingleGuestFlow',
    inputSchema: z.object({
      ownerId: z.string(),
      guestId: z.string(),
    }),
    outputSchema: z.object({ success: z.boolean(), cyclesProcessed: z.number() }),
  },
  async ({ ownerId, guestId }) => {
    const dataDb = await selectOwnerDataAdminDb(ownerId);
    const guestDocRef = dataDb.collection('users_data').doc(ownerId).collection('guests').doc(guestId);
    let cyclesProcessed = 0;

    try {
        await dataDb.runTransaction(async (transaction) => {
            const guestDoc = await transaction.get(guestDocRef);
            if (!guestDoc.exists) {
                console.error(`[Reconcile] Guest ${guestId} not found.`);
                return;
            }

            const guest = guestDoc.data() as Guest;
            if (guest.isVacated || guest.exitDate) {
                return;
            }

            let dueDate = parseISO(guest.dueDate);
            const now = new Date();
            let newDueDate = dueDate;
            let missedCycles = 0;
            
            while (isBefore(newDueDate, now)) {
                newDueDate = calculateFirstDueDate(newDueDate, guest.rentCycleUnit, guest.rentCycleValue, guest.billingAnchorDay);
                missedCycles++;
            }
            
            if (missedCycles === 0) {
                return; // No full cycles have passed.
            }
            
            cyclesProcessed = missedCycles;
            
            const unpaidFromLastCycle = guest.rentAmount - (guest.rentPaidAmount || 0) + (guest.balanceBroughtForward || 0);
            const rentForNewCycles = guest.rentAmount * (missedCycles - 1);
            const newBalanceBroughtForward = unpaidFromLastCycle + rentForNewCycles;
            
            const updatedGuestData: Partial<Guest> = {
              dueDate: format(newDueDate, 'yyyy-MM-dd'),
              balanceBroughtForward: newBalanceBroughtForward,
              rentPaidAmount: 0,
              rentStatus: 'unpaid',
            };

            transaction.update(guestDocRef, updatedGuestData);
            console.log(`[Reconcile] Processed ${cyclesProcessed} cycle(s) for guest ${guest.name}. New balance: ${newBalanceBroughtForward}, New Due Date: ${updatedGuestData.dueDate}`);
        });

        return { success: true, cyclesProcessed };
    } catch (err: any) {
        console.error(`[Reconcile] Error processing guest ${guestId}:`, err.message);
        return { success: false, cyclesProcessed: 0 };
    }
  }
);


const reconcileAllGuestsFlow = ai.defineFlow(
    {
        name: 'reconcileAllGuestsFlow',
        inputSchema: z.object({ limit: z.number().optional() }),
        outputSchema: z.object({ success: z.boolean(), reconciledCount: z.number() }),
    },
    async ({ limit }) => {
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
                        break; // Break from inner loop
                    }

                    try {
                        const result = await reconcileSingleGuestFlow({ ownerId, guestId: guestDoc.id });
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
                    break; // Break from outer loop
                }
            }
            console.log(`[Reconcile All] Successfully processed reconciliation for ${processedGuestCount} guests. Failed: ${totalErrors}.`);
            return { success: totalErrors === 0, reconciledCount: processedGuestCount };
        } catch (error: any) {
            console.error('[Reconcile All] Cron job failed:', error);
            return { success: false, reconciledCount: 0 };
        }
    }
);
