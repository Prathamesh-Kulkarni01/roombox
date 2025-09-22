
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { format, parseISO, isBefore, addMinutes, addHours, addDays, addWeeks, addMonths } from 'date-fns';
import type { Guest, RentCycleUnit } from '@/lib/types';
import { calculateFirstDueDate } from '@/lib/utils';

// Helper function to advance the due date based on the rent cycle
function getNextDueDate(currentDueDate: Date, unit: RentCycleUnit, value: number, anchorDay: number): Date {
  return calculateFirstDueDate(currentDueDate, unit, value, anchorDay);
}


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
      nextDueDate: z.string().optional(),
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

            let currentDueDate = parseISO(guest.dueDate);
            const now = new Date();
            let cyclesToProcess = 0;

            // Determine how many full cycles have passed
            while (isBefore(currentDueDate, now) || currentDueDate.getTime() === now.getTime()) {
                cyclesToProcess++;
                currentDueDate = getNextDueDate(currentDueDate, guest.rentCycleUnit, guest.rentCycleValue, guest.billingAnchorDay);
            }

            if (cyclesToProcess > 0) {
                 const updatedGuestData: Partial<Guest> = {};
                
                // Calculate balance from the most recently *finished* cycle
                const totalBillForLastCycle = (guest.balanceBroughtForward || 0) + guest.rentAmount + (guest.additionalCharges || []).reduce((sum, charge) => sum + charge.amount, 0);
                const rentPaidInLastCycle = guest.rentPaidAmount || 0;
                let newBalanceBroughtForward = totalBillForLastCycle - rentPaidInLastCycle;

                // Add rent for any additional fully missed cycles
                if (cyclesToProcess > 1) {
                    newBalanceBroughtForward += guest.rentAmount * (cyclesToProcess - 1);
                }

                updatedGuestData.dueDate = format(currentDueDate, 'yyyy-MM-dd');
                updatedGuestData.balanceBroughtForward = newBalanceBroughtForward;
                updatedGuestData.rentPaidAmount = 0;
                updatedGuestData.additionalCharges = []; // Clear charges as they are now part of the balance
                updatedGuestData.rentStatus = newBalanceBroughtForward > 0 ? 'unpaid' : 'paid';

                transaction.update(guestDocRef, updatedGuestData);
                console.log(`[Reconcile] Processed ${cyclesToProcess} cycle(s) for guest ${guest.name}. New balance: ${newBalanceBroughtForward}`);
            }
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
            console.log(`[Reconcile All] Successfully reconciled ${reconciledCount} guests. Failed: ${totalErrors}.`);
            return { success: totalErrors === 0, reconciledCount };
        } catch (error: any) {
            console.error('[Reconcile All] Cron job failed:', error);
            return { success: false, reconciledCount };
        }
    }
);
