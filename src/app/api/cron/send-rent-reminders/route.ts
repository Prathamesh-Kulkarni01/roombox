

'use server'

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { add, format, isBefore, isPast, parseISO, differenceInMilliseconds, differenceInDays } from 'date-fns';
import type { User, Guest, RentCycleUnit } from '@/lib/types';
import { createAndSendNotification } from '@/lib/actions/notificationActions';

function getCycleDurationInMillis(unit: RentCycleUnit, value: number): number {
    const now = new Date();
    const future = add(now, { [unit]: value });
    return future.getTime() - now.getTime();
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const secret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === 'production' && (!secret || authHeader !== `Bearer ${secret}`)) {
      return new Response('Unauthorized', { status: 401 });
    }

    const adminDb = await getAdminDb();
    console.log('🔔 Starting daily rent reminder check...');
    let notifiedCount = 0;
    const now = new Date();

    const ownersSnapshot = await adminDb
      .collection('users')
      .where('subscription.status', 'in', ['active', 'trialing'])
      .get();

    if (ownersSnapshot.empty) {
      console.log('No active or trialing owners found.');
      return NextResponse.json({ success: true, message: 'No active owners to process.' });
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
        continue;
      }

      for (const guestDoc of guestsSnapshot.docs) {
        const guest = { id: guestDoc.id, ...guestDoc.data() } as Guest;
        const dueDate = parseISO(guest.dueDate);

        // Skip if no associated user to notify
        if (!guest.userId) continue;

        const cycleDurationMillis = getCycleDurationInMillis(guest.rentCycleUnit, guest.rentCycleValue);
        const reminderWindowMillis = cycleDurationMillis * 0.3; // e.g., 3 days for a month
        const overdueIntervalMillis = cycleDurationMillis * 0.1; // e.g., every 3 days for a month
        
        const isUpcoming = isBefore(dueDate, new Date(now.getTime() + reminderWindowMillis)) && !isPast(dueDate);
        const isOverdue = isPast(dueDate);
        
        let shouldSend = false;
        let title = '';
        let body = '';

        const lastReminderDate = guest.lastReminderSentAt ? parseISO(guest.lastReminderSentAt) : null;
        
        if (isUpcoming) {
            // Send only one upcoming reminder per cycle
            if (!lastReminderDate || isBefore(lastReminderDate, add(dueDate, { [guest.rentCycleUnit]: -guest.rentCycleValue }))) {
                shouldSend = true;
                const daysUntilDue = differenceInDays(dueDate, now);
                title = `Hi ${guest.name}, your rent is due soon!`;
                body = `Your rent is due on ${format(dueDate, 'do MMM, yyyy')}. Please pay on time.`;
            }
        } else if (isOverdue) {
            // Send overdue reminders periodically
            if (!lastReminderDate || differenceInMilliseconds(now, lastReminderDate) > overdueIntervalMillis) {
                shouldSend = true;
                const daysOverdue = differenceInDays(now, dueDate);
                title = `Action Required: Your Rent is Overdue`;
                body = `Hi ${guest.name}, your rent payment is now ${daysOverdue} day(s) overdue. Please complete the payment.`;
            }
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
            lastReminderSentAt: now.toISOString(),
          });

          notifiedCount++;
        }
      }
    }

    const successMessage = `Successfully sent reminders to ${notifiedCount} tenants.`;
    console.log(`✅ Rent reminder check complete. ${successMessage}`);
    return NextResponse.json({ success: true, message: successMessage });

  } catch (error: any) {
    console.error('Cron job error [send-rent-reminders]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'An internal server error occurred.' },
      { status: error?.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
