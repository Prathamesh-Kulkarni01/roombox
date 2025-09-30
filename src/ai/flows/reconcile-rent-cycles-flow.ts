
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { format, parseISO, isBefore } from 'date-fns';
import type { Guest } from '@/lib/types';
import { calculateFirstDueDate } from '@/lib/utils';


// Kept for single guest reconciliation if needed elsewhere
export async function reconcileRentCycles(params: {
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
    outputSchema: z.object({ success: z.boolean() }),
  },
  async ({ ownerId, guestId }) => {
    const adminDb = await getAdminDb();
    const ownerDoc = await adminDb.collection('users').doc(ownerId).get();
    const enterpriseDbId = ownerDoc.data()?.subscription?.enterpriseProject?.databaseId as string | undefined;
    const enterpriseProjectId = ownerDoc.data()?.subscription?.enterpriseProject?.projectId as string | undefined;
    const dataDb = await getAdminDb(enterpriseProjectId, enterpriseDbId);
    const guestDocRef = dataDb.collection('users_data').doc(ownerId).collection('guests').doc(guestId);

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

            let currentDueDate = parseISO(guest.dueDate);
            const now = new Date();
            let cyclesToProcess = 0;
            
            // Correctly loop through cycles until the due date is in the future
            while (isBefore(currentDueDate, now)) {
                currentDueDate = calculateFirstDueDate(currentDueDate, guest.rentCycleUnit, guest.rentCycleValue, guest.billingAnchorDay);
                cyclesToProcess++;
            }
            
            // If no full cycles have passed, do nothing
            if (cyclesToProcess === 0) {
                return;
            }

            // This guest's rent for the current (now overdue) cycle was not fully paid.
            const balanceBf = guest.balanceBroughtForward || 0;
            const chargesDue = (guest.additionalCharges || []).reduce((sum, charge) => sum + charge.amount, 0);
            const totalBillForLastCycle = balanceBf + guest.rentAmount + chargesDue;
            const unpaidFromLastCycle = totalBillForLastCycle - (guest.rentPaidAmount || 0);

            // The new balance is the unpaid amount from last cycle PLUS the rent for all newly missed cycles.
            // We subtract 1 from cyclesToProcess because the first missed cycle's rent is already part of unpaidFromLastCycle.
            const newBalanceBroughtForward = unpaidFromLastCycle + (guest.rentAmount * (cyclesToProcess - 1));

            const updatedGuestData: Partial<Guest> = {
              dueDate: format(currentDueDate, 'yyyy-MM-dd'),
              balanceBroughtForward: newBalanceBroughtForward,
              rentPaidAmount: 0, // Reset for the new cycle
              additionalCharges: [], // Clear charges as they are now part of the balance
              rentStatus: 'unpaid',
            };

            transaction.update(guestDocRef, updatedGuestData);
            console.log(`[Reconcile] Processed ${cyclesToProcess} cycle(s) for guest ${guest.name}. New balance: ${newBalanceBroughtForward}`);
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
                const enterpriseDbId = ownerDoc.data()?.subscription?.enterpriseProject?.databaseId as string | undefined;
                const enterpriseProjectId = ownerDoc.data()?.subscription?.enterpriseProject?.projectId as string | undefined;
                const dataDb = await getAdminDb(enterpriseProjectId, enterpriseDbId);
                const guestsSnapshot = await dataDb.collection('users_data').doc(ownerId).collection('guests').where('isVacated', '==', false).get();

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
