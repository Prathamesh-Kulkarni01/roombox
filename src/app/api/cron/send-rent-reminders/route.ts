'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { parseISO, isBefore, add } from 'date-fns';
import type { Guest } from '@/lib/types';

export async function reconcileRentCycles(params: {
  ownerId: string;
  guestId: string;
  nextDueDate?: string;
}): Promise<{ success: boolean }> {
  return reconcileSingleGuestFlow(params);
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
  async ({ ownerId, guestId, nextDueDate }) => {
    const adminDb = await getAdminDb();
    try {
      const guestDoc = await adminDb
        .collection('users_data')
        .doc(ownerId)
        .collection('guests')
        .doc(guestId)
        .get();

      if (!guestDoc.exists) return { success: false };

      const guest = guestDoc.data() as Guest;
      const now = new Date();
      let currentDueDate = parseISO(guest.dueDate);
      let targetDueDate = nextDueDate ? parseISO(nextDueDate) : currentDueDate;

      // ------------------ Handle short cycles ------------------
      const msPerUnit: Record<string, number> = {
        minutes: 60 * 1000,
        hours: 60 * 60 * 1000,
        days: 24 * 60 * 60 * 1000,
        weeks: 7 * 24 * 60 * 60 * 1000,
        months: 30 * 24 * 60 * 60 * 1000,
      };

      const cycleUnit = guest.rentCycleUnit || 'days';
      const cycleValue = guest.rentCycleValue || 1;
      const cycleMs = (msPerUnit[cycleUnit] || msPerUnit['days']) * cycleValue;

      // ------------------ Count how many cycles have passed ------------------
      let cyclesToProcess = 0;
      while (now.getTime() >= targetDueDate.getTime()) {
        cyclesToProcess++;
        targetDueDate = add(targetDueDate, { [cycleUnit]: cycleValue });
      }

      if (cyclesToProcess === 0) return { success: true }; // nothing to reconcile

      // ------------------ Update balance ------------------
      let newBalance = (guest.balanceBroughtForward || 0) + guest.rentAmount * cyclesToProcess;
      newBalance -= guest.rentPaidAmount || 0;

      await guestDoc.ref.update({
        dueDate: targetDueDate.toISOString(),
        rentStatus: 'unpaid',
        rentPaidAmount: 0,
        balanceBroughtForward: newBalance,
      });

      console.log(`✅ Reconciled ${guest.name} for ${cyclesToProcess} cycle(s). New balance: ${newBalance}`);
      return { success: true };
    } catch (err) {
      console.error('❌ Error reconciling guest:', guestId, err);
      return { success: false };
    }
  }
);
