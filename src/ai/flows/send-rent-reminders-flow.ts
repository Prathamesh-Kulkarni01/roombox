'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { addDays, format, isBefore, parseISO } from 'date-fns';
import { type User, type Guest } from '@/lib/types';
import { sendNotification } from './send-notification-flow';

const REMINDER_DAYS_BEFORE_DUE = 3;

export async function sendRentReminders(): Promise<{ success: boolean; notifiedCount: number }> {
  return sendRentRemindersFlow();
}

const sendRentRemindersFlow = ai.defineFlow(
  {
    name: 'sendRentRemindersFlow',
    inputSchema: z.void(),
    outputSchema: z.object({ success: z.boolean(), notifiedCount: z.number() }),
  },
  async () => {
    const adminDb = await getAdminDb();
    console.log('🔔 Starting daily rent reminder check...');
    let notifiedCount = 0;
    const today = new Date();
    const reminderCutoffDate = addDays(today, REMINDER_DAYS_BEFORE_DUE);

    try {
      const ownersSnapshot = await adminDb
        .collection('users')
        .where('role', '==', 'owner')
        .where('subscription.status', '==', 'active')
        .where('subscription.planId', 'in', ['starter', 'pro', 'business', 'enterprise'])
        .get();

      if (ownersSnapshot.empty) {
        console.log('No active owners found.');
        return { success: true, notifiedCount: 0 };
      }

      for (const ownerDoc of ownersSnapshot.docs) {
        const owner = { id: ownerDoc.id, ...ownerDoc.data() } as User;
        console.log(`👤 Checking guests for subscribed owner: ${owner.name} (${owner.id})`);

        const guestsSnapshot = await adminDb
          .collection('users_data')
          .doc(owner.id)
          .collection('guests')
          .where('isVacated', '==', false)
          .where('rentStatus', 'in', ['unpaid', 'partial'])
          .get();

        if (guestsSnapshot.empty) {
          console.log(`No active guests with unpaid/partial rent for owner ${owner.id}`);
          continue;
        }

        for (const guestDoc of guestsSnapshot.docs) {
          const guest = { id: guestDoc.id, ...guestDoc.data() } as Guest;

          // Skip if no associated user or already reminded today
          if (!guest.userId) continue;
          if (guest.lastReminderSentAt && isBefore(today, parseISO(guest.lastReminderSentAt))) {
            console.log(`⏭️ Skipping ${guest.name} - already reminded recently.`);
            continue;
          }

          const dueDate = parseISO(guest.dueDate);

          if (isBefore(dueDate, reminderCutoffDate) && !isBefore(dueDate, today)) {
            console.log(`📨 Sending reminder to ${guest.name} (due on ${guest.dueDate})`);

            await sendNotification({
              userId: guest.userId,
              title: `Hi ${guest.name}, your rent is due soon!`,
              body: `Your monthly rent of ₹${guest.rentAmount} for ${guest.pgName} is due on ${format(
                dueDate,
                'do MMM, yyyy'
              )}.`,
              link: '/tenants/my-pg',
            });

            // Mark reminder as sent to avoid duplicate notifications
            await guestDoc.ref.update({
              lastReminderSentAt: today.toISOString(),
            });

            notifiedCount++;
          }
        }
      }

      console.log(`✅ Rent reminder check complete. Notified ${notifiedCount} tenants.`);
      return { success: true, notifiedCount };
    } catch (error) {
      console.error('❌ Error in sendRentRemindersFlow:', error);
      return { success: false, notifiedCount: 0 };
    }
  }
);
