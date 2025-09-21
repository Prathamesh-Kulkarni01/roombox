

'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { add, format, isBefore, parseISO, differenceInMilliseconds } from 'date-fns';
import type { Guest, RentCycleUnit } from '@/lib/types';
import { calculateFirstDueDate } from '@/lib/utils';

export async function reconcileRentCycles(): Promise<{ success: boolean; reconciledCount: number }> {
  return reconcileRentCyclesFlow();
}

/**
 * Calculates the number of full cycles that have passed between the due date and the current date.
 * This version uses millisecond comparison for accuracy with short cycle times.
 */
function getMissedCycles(dueDate: Date, now: Date, unit: RentCycleUnit, value: number): number {
    if (isBefore(now, dueDate)) {
        return 0;
    }

    const cycleDurationMillis = differenceInMilliseconds(
        calculateFirstDueDate(dueDate, unit, value, dueDate.getDate()),
        dueDate
    );

    if (cycleDurationMillis <= 0) return 0;
    
    const elapsedMillis = differenceInMilliseconds(now, dueDate);

    return Math.floor(elapsedMillis / cycleDurationMillis);
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
    const today = new Date();

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
          const dueDate = parseISO(guest.dueDate);
          
          if (isBefore(today, dueDate)) continue;

          const cyclesToProcess = getMissedCycles(dueDate, today, guest.rentCycleUnit, guest.rentCycleValue);

          if (cyclesToProcess > 0) {
              console.log(`Reconciling ${guest.name} for ${cyclesToProcess} cycle(s).`);
              
              const totalBillForLastCycle = (guest.balanceBroughtForward || 0) + guest.rentAmount + (guest.additionalCharges || []).reduce((sum, charge) => sum + charge.amount, 0);
              const unpaidFromLastCycle = totalBillForLastCycle - (guest.rentPaidAmount || 0);

              const newBalanceBroughtForward = unpaidFromLastCycle + (guest.rentAmount * (cyclesToProcess - 1));
              const newDueDate = calculateFirstDueDate(dueDate, guest.rentCycleUnit, cyclesToProcess * guest.rentCycleValue, guest.billingAnchorDay);

              batch.update(guestDoc.ref, {
                dueDate: format(newDueDate, 'yyyy-MM-dd'),
                rentStatus: 'unpaid',
                rentPaidAmount: 0,
                balanceBroughtForward: newBalanceBroughtForward,
                additionalCharges: [],
              });

              reconciledCount++;
              batchHasWrites = true;
          }
        }

        if (batchHasWrites) {
          await batch.commit();
          console.log(`Committed reconciliation for owner ${ownerDoc.id}`);
        }
      }

      console.log(`✅ Rent reconciliation complete. Reconciled ${reconciledCount} tenants.`);
      return { success: true, reconciledCount };
    } catch (error) {
      console.error('❌ Error in reconcileRentCyclesFlow:', error);
      return { success: false, reconciledCount: 0 };
    }
  }
);

