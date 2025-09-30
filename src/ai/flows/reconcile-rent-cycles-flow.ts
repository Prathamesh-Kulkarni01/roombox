
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { format, parseISO, isBefore } from 'date-fns';
import type { Guest } from '@/lib/types';
import { runReconciliationLogic } from '@/lib/reconciliation';

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
