
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { reconcileRentCycles } from '@/ai/flows/reconcile-rent-cycles-flow';
import { createAndSendNotification } from '@/lib/actions/notificationActions';
import type { Guest } from '@/lib/types';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        const secret = process.env.CRON_SECRET;

        if (process.env.NODE_ENV === 'production' && (!secret || authHeader !== `Bearer ${secret}`)) {
            return new Response('Unauthorized', { status: 401 });
        }

        // --- Step 1: Reconcile all rents first ---
        const reconciliationResult = await reconcileRentCycles();
        if (!reconciliationResult.success) {
            console.warn('Rent reconciliation part of the reminder job may have failed for some tenants.');
        }

        // --- Step 2: Fetch updated guest data and send reminders ---
        const adminDb = await getAdminDb();
        const usersSnapshot = await adminDb.collection('users').where('role', '==', 'owner').get();

        let totalRemindersSent = 0;
        const today = new Date();

        for (const userDoc of usersSnapshot.docs) {
            const ownerId = userDoc.id;
            const guestsSnapshot = await adminDb.collection('users_data').doc(ownerId).collection('guests')
                .where('isVacated', '==', false)
                .where('rentStatus', 'in', ['unpaid', 'partial'])
                .get();

            if (guestsSnapshot.empty) {
                continue;
            }

            for (const guestDoc of guestsSnapshot.docs) {
                const guest = guestDoc.data() as Guest;
                if (!guest.userId) continue;

                const dueDate = parseISO(guest.dueDate);
                let title = '';
                let body = '';
                 
                if (isPast(dueDate)) {
                    const daysOverdue = differenceInDays(today, dueDate);
                    title = 'Action Required: Your Rent is Overdue';
                    body = `Hi ${guest.name}, your rent payment is ${daysOverdue} day(s) overdue. Please complete the payment as soon as possible.`;
                } else {
                     const daysUntilDue = differenceInDays(dueDate, today);
                     // Only send if it's due within a reasonable window (e.g., 5 days)
                     if (daysUntilDue <= 5) {
                        title = `Gentle Reminder: Your Rent is Due Soon`;
                        body = `Hi ${guest.name}, a friendly reminder that your rent is due in ${daysUntilDue} day(s) on ${format(dueDate, 'do MMM, yyyy')}.`;
                     }
                }

                if (title && body) {
                    await createAndSendNotification({
                        ownerId: ownerId,
                        notification: {
                          type: 'rent-reminder',
                          title: title,
                          message: body,
                          link: '/tenants/my-pg',
                          targetId: guest.userId,
                        }
                    });
                    totalRemindersSent++;
                }
            }
        }
        
        const message = `Rent reconciliation complete. Sent ${totalRemindersSent} rent reminders.`;
        console.log(message);
        return NextResponse.json({ success: true, message });

    } catch (error: any) {
        console.error('Error in send-rent-reminders cron job:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
