

'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { format, isBefore, parseISO } from 'date-fns';
import type { Guest } from '@/lib/types';
import { calculateFirstDueDate } from '@/lib/utils';

export async function reconcileRentCycles(): Promise<{ success: boolean; reconciledCount: number }> {
  return reconcileRentCyclesFlow();
}

const reconcileRentCyclesFlow = ai.defineFlow(
  {
    name: 'reconcileRentCyclesFlow',
    inputSchema: z.void(),
    outputSchema: z.object({ success: z.boolean(), reconciledCount: z.number() }),
  },
  async () => {
    const adminDb = await getAdminDb();
    console.log('🔄 Starting rent reconciliation...');
    let reconciledCount = 0;
    const now = new Date();

    try {
      const ownersSnapshot = await adminDb.collection('users').where('subscription.status', 'in', ['active', 'trialing']).get();

      for (const ownerDoc of ownersSnapshot.docs) {
        console.log(`Checking guests for owner: ${ownerDoc.id}`);

        const guestsSnapshot = await adminDb
          .collection('users_data')
          .doc(ownerDoc.id)
          .collection('guests')
          .where('isVacated', '==', false)
          .get();

        if (guestsSnapshot.empty) continue;

        const batch = adminDb.batch();
        let batchHasWrites = false;

        for (const guestDoc of guestsSnapshot.docs) {
          const guest = guestDoc.data() as Guest;
          let currentDueDate = parseISO(guest.dueDate);

          if (!isBefore(now, currentDueDate)) {
            let cyclesToProcess = 0;
            let nextDueDate = currentDueDate;
            
            // Loop to find how many cycles have passed
            while (isBefore(nextDueDate, now) || nextDueDate.getTime() === now.getTime()) {
              cyclesToProcess++;
              nextDueDate = calculateFirstDueDate(nextDueDate, guest.rentCycleUnit, guest.rentCycleValue, guest.billingAnchorDay);
            }

            if (cyclesToProcess > 0) {
              console.log(`Reconciling ${guest.name} for ${cyclesToProcess} cycle(s).`);

              let newBalanceBroughtForward = guest.balanceBroughtForward || 0;
              let rentPaidInCycle = guest.rentPaidAmount || 0;

              // Calculate the balance from the cycle that just ended
              const totalBillForLastCycle = newBalanceBroughtForward + guest.rentAmount + (guest.additionalCharges || []).reduce((sum, charge) => sum + charge.amount, 0);
              newBalanceBroughtForward = totalBillForLastCycle - rentPaidInCycle;

              // Add rent for the remaining missed cycles
              if (cyclesToProcess > 1) {
                newBalanceBroughtForward += guest.rentAmount * (cyclesToProcess - 1);
              }

              batch.update(guestDoc.ref, {
                dueDate: format(nextDueDate, 'yyyy-MM-dd'),
                rentStatus: 'unpaid',
                rentPaidAmount: 0,
                balanceBroughtForward: newBalanceBroughtForward,
                additionalCharges: [], // Clear charges as they are now part of the balance
              });

              reconciledCount++;
              batchHasWrites = true;
            }
          }
        }

        if (batchHasWrites) {
          await batch.commit();
          console.log(`Committed reconciliation for owner ${ownerDoc.id}`);
        }
      }

      console.log(`✅ Rent reconciliation complete. Reconciled ${reconciledCount} tenant(s).`);
      return { success: true, reconciledCount };
    } catch (error) {
      console.error('❌ Error in reconcileRentCyclesFlow:', error);
      return { success: false, reconciledCount: 0 };
    }
  }
);
