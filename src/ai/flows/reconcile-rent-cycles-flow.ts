
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { addMonths, differenceInMonths, format, isBefore, parseISO, startOfToday } from 'date-fns';
import type { Guest } from '@/lib/types';

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
    console.log('🔄 Starting daily rent reconciliation...');
    let reconciledCount = 0;
    const today = startOfToday();

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

          if (isBefore(dueDate, today) && guest.rentStatus !== 'paid') {
            const monthsOverdue = differenceInMonths(today, dueDate) + (today.getDate() >= dueDate.getDate() ? 1 : 0);
            
            if (monthsOverdue > 0) {
              console.log(`Reconciling ${guest.name} for ${monthsOverdue} month(s).`);

              const totalBillForCycle = (guest.balanceBroughtForward || 0) + guest.rentAmount + (guest.additionalCharges || []).reduce((sum, charge) => sum + charge.amount, 0);
              const unpaidFromLastCycle = totalBillForCycle - (guest.rentPaidAmount || 0);

              const newBalanceBroughtForward = unpaidFromLastCycle + (guest.rentAmount * (monthsOverdue - 1));

              const newDueDate = addMonths(dueDate, monthsOverdue);

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
