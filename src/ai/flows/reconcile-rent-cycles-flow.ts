
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

export async function reconcileAllGuests(): Promise<{ success: boolean; reconciledCount: number; }> {
    const result = await reconcileAllGuestsFlow();
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

    try {
        let cyclesProcessed = 0;
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

            let newDueDate = parseISO(guest.dueDate);
            const now = new Date();
            
            // Loop until the due date is in the future
            while (isBefore(newDueDate, now)) {
                cyclesProcessed++;
                newDueDate = calculateFirstDueDate(newDueDate, guest.rentCycleUnit, guest.rentCycleValue, guest.billingAnchorDay);
            }
            
            // If no full cycles have passed, do nothing
            if (cyclesProcessed === 0) {
                return;
            }

            // Calculate the total amount owed for the cycles that have just passed.
            const rentForMissedCycles = guest.rentAmount * cyclesProcessed;
            
            // The new balance is the existing balance plus the rent for all newly missed cycles.
            const newBalanceBroughtForward = (guest.balanceBroughtForward || 0) + rentForMissedCycles;

            const updatedGuestData: Partial<Guest> = {
              dueDate: format(newDueDate, 'yyyy-MM-dd'),
              balanceBroughtForward: newBalanceBroughtForward,
              rentStatus: 'unpaid', // Since a cycle has passed, it's unpaid.
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
        inputSchema: z.void(),
        outputSchema: z.object({ success: z.boolean(), reconciledCount: z.number() }),
    },
    async () => {
        const adminDb = await getAdminDb();
        let reconciledCount = 0;
        let totalErrors = 0;

        try {
            const ownersSnapshot = await adminDb.collection('users').where('role', '==', 'owner').get();

            for (const ownerDoc of ownersSnapshot.docs) {
                const ownerId = ownerDoc.id;
                const dataDb = await selectOwnerDataAdminDb(ownerId);
                const guestsSnapshot = await dataDb.collection('users_data').doc(ownerId).collection('guests').where('isVacated', '==', false).get();

                for (const guestDoc of guestsSnapshot.docs) {
                    try {
                        const result = await reconcileSingleGuestFlow({ ownerId, guestId: guestDoc.id });
                        if (result.success && result.cyclesProcessed > 0) {
                            reconciledCount++;
                        } else if (!result.success) {
                            totalErrors++;
                        }
                    } catch (e) {
                        console.error(`[Reconcile All] Failed for guest ${guestDoc.id} of owner ${ownerId}`, e);
                        totalErrors++;
                    }
                }
            }
            console.log(`[Reconcile All] Successfully processed reconciliation for ${reconciledCount} guests. Failed: ${totalErrors}.`);
            return { success: totalErrors === 0, reconciledCount };
        } catch (error: any) {
            console.error('[Reconcile All] Cron job failed:', error);
            return { success: false, reconciledCount };
        }
    }
);
