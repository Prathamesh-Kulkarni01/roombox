
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { addDays, format, isBefore, isPast, parseISO, differenceInDays } from 'date-fns';
import { type User, type Guest } from '@/lib/types';
import { createAndSendNotification } from '@/lib/actions/notificationActions';

const REMINDER_DAYS_BEFORE_DUE = 3;
const OVERDUE_REMINDER_INTERVAL_DAYS = 3; // Send overdue reminders every 3 days

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
        .where('subscription.status', 'in', ['active', 'trialing'])
        .get();

      if (ownersSnapshot.empty) {
        console.log('No active or trialing owners found.');
        return { success: true, notifiedCount: 0 };
      }

      for (const ownerDoc of ownersSnapshot.docs) {
        const owner = { id: ownerDoc.id, ...ownerDoc.data() } as User;
        console.log(`👤 Checking guests for owner: ${owner.name} (${owner.id})`);

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
          const dueDate = parseISO(guest.dueDate);

          // Skip if no associated user
          if (!guest.userId) continue;

          const isOverdue = isPast(dueDate);
          const isUpcoming = isBefore(dueDate, reminderCutoffDate) && !isPast(dueDate);
          
          let shouldSend = false;
          let title = '';
          let body = '';

          if (isUpcoming) {
            // Logic for upcoming reminders
            const daysUntilDue = differenceInDays(dueDate, today);
            if (daysUntilDue >= 0 && daysUntilDue <= REMINDER_DAYS_BEFORE_DUE) {
                // Check if a reminder was sent recently to avoid duplicates for the same upcoming period.
                if (guest.lastReminderSentAt && differenceInDays(today, parseISO(guest.lastReminderSentAt)) < REMINDER_DAYS_BEFORE_DUE) {
                    continue;
                }
                shouldSend = true;
                title = `Hi ${guest.name}, your rent is due soon!`;
                body = `Your monthly rent is due on ${format(dueDate, 'do MMM, yyyy')}. Please pay on time to avoid late fees.`;
            }
          } else if (isOverdue) {
            // Logic for overdue reminders
            if (guest.lastReminderSentAt && differenceInDays(today, parseISO(guest.lastReminderSentAt)) < OVERDUE_REMINDER_INTERVAL_DAYS) {
                continue; // Don't spam, wait for the interval
            }
            shouldSend = true;
            const daysOverdue = differenceInDays(today, dueDate);
            title = `Action Required: Your Rent is Overdue`;
            body = `Hi ${guest.name}, your rent payment is now ${daysOverdue} day(s) overdue. Please complete the payment as soon as possible.`;
          }


          if (shouldSend) {
            console.log(`📨 Sending ${isOverdue ? 'overdue' : 'upcoming'} reminder to ${guest.name} (due on ${guest.dueDate})`);

            await createAndSendNotification({
              ownerId: owner.id,
              notification: {
                type: 'rent-reminder',
                title: title,
                message: body,
                link: '/tenants/my-pg',
                targetId: guest.userId,
              }
            });

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
