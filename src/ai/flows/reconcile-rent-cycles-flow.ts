'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { format, parseISO, isBefore } from 'date-fns';
import type { Guest } from '@/lib/types';
import { calculateFirstDueDate } from '@/lib/utils';

// Define a proper flow that accepts a guest
export async function reconcileRentCycles(params: {
  ownerId: string;
  guestId: string;
  nextDueDate?: string;
}): Promise<{ success: boolean }> {
  return reconcileSingleGuestFlow(params);
}

// Flow for a single guest
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
  async ({ ownerId, guestId, nextDueDate }) => {
    const adminDb = await getAdminDb();
    try {
      const guestDoc = await adminDb
        .collection('users_data')
        .doc(ownerId)
        .collection('guests')
        .doc(guestId)
        .get();

      if (!guestDoc.exists) {
        console.error(`Guest not found: ${guestId}`);
        return { success: false };
      }

      const guest = guestDoc.data() as Guest;
      const now = new Date();
      let currentDueDate = parseISO(guest.dueDate);
      let targetDueDate = nextDueDate ? parseISO(nextDueDate) : currentDueDate;

      // Calculate overdue cycles
      let cyclesToProcess = 0;
      while (isBefore(targetDueDate, now) || targetDueDate.getTime() === now.getTime()) {
        cyclesToProcess++;
        targetDueDate = calculateFirstDueDate(
          targetDueDate,
          guest.rentCycleUnit,
          guest.rentCycleValue,
          guest.billingAnchorDay
        );
      }

      if (cyclesToProcess > 0) {
        let newBalanceBroughtForward = guest.balanceBroughtForward || 0;
        let rentPaidInCycle = guest.rentPaidAmount || 0;

        // Balance for the cycle that ended
        const totalBillForLastCycle =
          newBalanceBroughtForward +
          guest.rentAmount +
          (guest.additionalCharges || []).reduce((sum, charge) => sum + charge.amount, 0);

        newBalanceBroughtForward = totalBillForLastCycle - rentPaidInCycle;

        // Add rent for remaining missed cycles
        if (cyclesToProcess > 1) {
          newBalanceBroughtForward += guest.rentAmount * (cyclesToProcess - 1);
        }

        await guestDoc.ref.update({
          dueDate: format(targetDueDate, 'yyyy-MM-dd'),
          rentStatus: 'unpaid',
          rentPaidAmount: 0,
          balanceBroughtForward: newBalanceBroughtForward,
          additionalCharges: [], // include in balance
        });

        console.log(`✅ Reconciled ${guest.name} for ${cyclesToProcess} cycle(s)`);
      }

      return { success: true };
    } catch (err) {
      console.error('❌ Error reconciling guest:', guestId, err);
      return { success: false };
    }
  }
);
