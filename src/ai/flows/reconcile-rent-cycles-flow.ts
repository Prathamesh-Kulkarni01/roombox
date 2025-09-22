
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { format, parseISO, isBefore } from 'date-fns';
import type { Guest, RentCycleUnit } from '@/lib/types';
import { calculateFirstDueDate } from '@/lib/utils';


// Kept for single guest reconciliation if needed elsewhere
export async function reconcileRentCycles(params: {
  ownerId: string;
  guestId: string;
  nextDueDate?: string;
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
    outputSchema: z.object({ success: z.boolean() }),
  },
  async ({ ownerId, guestId }) => {
    const adminDb = await getAdminDb();
    const guestDocRef = adminDb.collection('users_data').doc(ownerId).collection('guests').doc(guestId);

    try {
        await adminDb.runTransaction(async (transaction) => {
            const guestDoc = await transaction.get(guestDocRef);
            if (!guestDoc.exists) {
                console.error(`[Reconcile] Guest ${guestId} not found.`);
                return;
            }

            const guest = guestDoc.data() as Guest;
            if (guest.isVacated || guest.exitDate) {
                return; // Do not process guests who are exiting or have exited
            }

            const currentDueDate = parseISO(guest.dueDate);
            const now = new Date();
            
            // If due date has not passed, do nothing.
            if (!isBefore(currentDueDate, now)) {
                return;
            }

            // --- Simplified Logic: Process one cycle at a time ---
            const totalOwedBeforeThisRun = (guest.balanceBroughtForward || 0) + guest.rentAmount + (guest.additionalCharges || []).reduce((sum, charge) => sum + charge.amount, 0);
            const unpaidFromLastCycle = totalOwedBeforeThisRun - (guest.rentPaidAmount || 0);

            // The new balance is the unpaid amount from the last cycle. The new rent amount will be part of the next bill.
            const newBalanceBroughtForward = unpaidFromLastCycle;
            const newDueDate = calculateFirstDueDate(currentDueDate, guest.rentCycleUnit, guest.rentCycleValue, guest.billingAnchorDay);
            
            const updatedGuestData: Partial<Guest> = {
              dueDate: format(newDueDate, 'yyyy-MM-dd'),
              balanceBroughtForward: newBalanceBroughtForward,
              rentPaidAmount: 0,
              additionalCharges: [],
              rentStatus: newBalanceBroughtForward > 0 ? 'unpaid' : 'paid' // if balance is 0, they are paid up.
            };
            
            // If the balance is zero or less (credit), status should be 'paid'. Otherwise, it's 'unpaid' for the new cycle.
            if(newBalanceBroughtForward <= 0) {
                updatedGuestData.rentStatus = 'paid';
            } else {
                 updatedGuestData.rentStatus = 'unpaid';
            }

            transaction.update(guestDocRef, updatedGuestData);
            console.log(`[Reconcile] Processed 1 cycle for guest ${guest.name}. New balance: ${newBalanceBroughtForward}`);
        });
        return { success: true };
    } catch (err: any) {
        console.error(`[Reconcile] Error processing guest ${guestId}:`, err.message);
        return { success: false };
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
                const guestsSnapshot = await adminDb.collection('users_data').doc(ownerId).collection('guests').where('isVacated', '==', false).get();

                for (const guestDoc of guestsSnapshot.docs) {
                    const result = await reconcileSingleGuestFlow({ ownerId, guestId: guestDoc.id });
                    if (result.success) {
                        reconciledCount++;
                    } else {
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

