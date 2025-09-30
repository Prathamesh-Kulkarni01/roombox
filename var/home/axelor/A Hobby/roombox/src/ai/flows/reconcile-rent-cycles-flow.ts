
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { format, parseISO, isAfter, differenceInMinutes, differenceInHours, differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns';
import type { Guest, RentCycleUnit } from '@/lib/types';
import { calculateFirstDueDate } from '@/lib/utils';


/**
 * A pure function that calculates the new state of a guest after rent reconciliation.
 * It does not perform any database operations.
 * @param guest The current guest object.
 * @param now The current date/time to reconcile against.
 * @returns An object with the updated guest state and the number of cycles processed.
 */
export function runReconciliationLogic(guest: Guest, now: Date): { guest: Guest, cyclesProcessed: number } {
  if (guest.isVacated || guest.exitDate || guest.rentStatus === 'paid') {
    return { guest, cyclesProcessed: 0 };
  }

  const currentDueDate = parseISO(guest.dueDate);
  
  // The core logic fix: Do not process if the current time is not yet *after* the due date.
  // This correctly handles all "due today" and "due in the future" cases.
  if (!isAfter(now, currentDueDate)) {
     return { guest, cyclesProcessed: 0 };
  }

  let totalDifference = 0;
  const cycleUnit = guest.rentCycleUnit || 'months';
  const cycleValue = guest.rentCycleValue || 1;

  // Calculate the total number of full cycles that have passed.
  switch (cycleUnit) {
      case 'minutes': totalDifference = differenceInMinutes(now, currentDueDate); break;
      case 'hours': totalDifference = differenceInHours(now, currentDueDate); break;
      case 'days': totalDifference = differenceInDays(now, currentDueDate); break;
      case 'weeks': totalDifference = differenceInWeeks(now, currentDueDate); break;
      case 'months': totalDifference = differenceInMonths(now, currentDueDate); break;
      default: totalDifference = differenceInMonths(now, currentDueDate);
  }

  const cyclesToProcess = Math.floor(totalDifference / cycleValue);

  if (cyclesToProcess <= 0) {
    return { guest, cyclesProcessed: 0 };
  }

  // If we are here, it means at least one full cycle has passed.
  // We need to account for the balance that was due *at* the start of the overdue period.
  const rentForMissedCycles = guest.rentAmount * cyclesToProcess;
  const newBalance = (guest.balanceBroughtForward || 0) + rentForMissedCycles;

  let newDueDate = currentDueDate;
  for (let i = 0; i < cyclesToProcess; i++) {
    newDueDate = calculateFirstDueDate(newDueDate, cycleUnit, cycleValue, guest.billingAnchorDay);
  }
  
  const updatedGuest: Guest = {
      ...guest,
      dueDate: newDueDate.toISOString(),
      balanceBroughtForward: newBalance,
      rentPaidAmount: 0,
      rentStatus: 'unpaid',
      additionalCharges: [],
  };

  return { guest: updatedGuest, cyclesProcessed: cyclesToProcess };
}


// --- GENKIT FLOWS ---

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
        const cyclesProcessed = await dataDb.runTransaction(async (transaction) => {
            const guestDoc = await transaction.get(guestDocRef);
            if (!guestDoc.exists) {
                console.error(`[Reconcile] Guest ${guestId} not found.`);
                return 0;
            }

            const guest = guestDoc.data() as Guest;
            
            // Use the pure, centralized logic function
            const result = runReconciliationLogic(guest, new Date());
            
            if (result.cyclesProcessed === 0 && guest.rentStatus === result.guest.rentStatus) {
                // No changes needed
                return 0;
            }

            transaction.update(guestDocRef, result.guest);
            console.log(`[Reconcile] Processed ${result.cyclesProcessed} cycle(s) for guest ${guest.name}. New balance: ${result.guest.balanceBroughtForward}, New Due Date: ${result.guest.dueDate}`);
            return result.cyclesProcessed;
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
                        break; 
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
                    break;
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

// Exporting the main functions for use elsewhere
export async function reconcileSingleGuest(params: { ownerId: string; guestId: string; }): Promise<{ success: boolean; reconciledCount?: number }> {
    const result = await reconcileSingleGuestFlow(params);
    return { success: result.success, reconciledCount: result.success ? 1 : 0 };
}

export async function reconcileAllGuests(limit?: number): Promise<{ success: boolean; reconciledCount: number; }> {
    const result = await reconcileAllGuestsFlow({ limit });
    return { success: result.success, reconciledCount: result.reconciledCount };
}
