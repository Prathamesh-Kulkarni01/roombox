
'use server';

/**
 * @fileOverview A scheduled flow to send rent reminders to tenants.
 * This flow is designed to be run by a cron job.
 * - sendRentReminders - Main function to find and notify tenants.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, getDocs, query, where } from 'firebase-admin/firestore';
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
    const adminDb = getAdminDb();
    console.log('Starting daily rent reminder check...');
    let notifiedCount = 0;
    const today = new Date();
    const reminderCutoffDate = addDays(today, REMINDER_DAYS_BEFORE_DUE);

    try {
      const ownersQuery = query(
        collection(adminDb, 'users'),
        where('role', '==', 'owner'),
        where('subscription.status', '==', 'active'),
        where('subscription.planId', 'in', ['starter', 'pro', 'business', 'enterprise'])
      );
      const ownersSnapshot = await getDocs(ownersQuery);
      
      for (const ownerDoc of ownersSnapshot.docs) {
        const owner = ownerDoc.data() as User;
        console.log(`Checking guests for subscribed owner: ${owner.name} (${owner.id})`);

        // Fetch only active guests with rent due
        const guestsQuery = query(
            collection(adminDb, 'users_data', owner.id, 'guests'),
            where('isVacated', '==', false),
            where('rentStatus', 'in', ['unpaid', 'partial'])
        );
        const guestsSnapshot = await getDocs(guestsQuery);
        
        for (const guestDoc of guestsSnapshot.docs) {
          const guest = guestDoc.data() as Guest;
          
          if (!guest.userId) continue;

          const dueDate = parseISO(guest.dueDate);

          // Check if due date is within the next 3 days (and not past)
          if (isBefore(dueDate, reminderCutoffDate) && isBefore(today, dueDate)) {
            console.log(`Sending reminder to ${guest.name} (due on ${guest.dueDate})`);
            
            await sendNotification({
              userId: guest.userId,
              title: `Hi ${guest.name}, your rent is due soon!`,
              body: `Your monthly rent of ₹${guest.rentAmount} for ${guest.pgName} is due on ${format(dueDate, 'do MMM, yyyy')}.`,
              link: '/tenants/my-pg',
            });
            notifiedCount++;
          }
        }
      }
      
      console.log(`Rent reminder check complete. Notified ${notifiedCount} tenants.`);
      return { success: true, notifiedCount };

    } catch (error) {
      console.error('Error in sendRentRemindersFlow:', error);
      return { success: false, notifiedCount: 0 };
    }
  }
);
