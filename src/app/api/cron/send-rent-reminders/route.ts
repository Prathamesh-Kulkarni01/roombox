
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { reconcileAllGuests } from '@/ai/flows/reconcile-rent-cycles-flow';
import { createAndSendNotification } from '@/lib/actions/notificationActions';
import type { Guest, RentCycleUnit } from '@/lib/types';
import { format, parseISO, isPast, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';

function getHumanReadableDuration(minutes: number): string {
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} minute(s)`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        const remainingMinutes = minutes % 60;
        return `${hours} hour(s)${remainingMinutes > 0 ? ` and ${remainingMinutes} minute(s)` : ''}`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} day(s)${remainingHours > 0 ? ` and ${remainingHours} hour(s)` : ''}`;
}

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        const secret = process.env.CRON_SECRET;

        if (process.env.NODE_ENV === 'production' && (!secret || authHeader !== `Bearer ${secret}`)) {
            return new Response('Unauthorized', { status: 401 });
        }

        // --- Step 1: Reconcile all rents first ---
        const reconciliationResult = await reconcileAllGuests();
        if (!reconciliationResult.success) {
            console.warn('Rent reconciliation part of the reminder job may have failed for some tenants.');
        }

        // --- Step 2: Fetch updated guest data and send reminders ---
        const adminDb = await getAdminDb();
        const usersSnapshot = await adminDb.collection('users').where('role', '==', 'owner').get();

        let totalRemindersSent = 0;
        const now = new Date();

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
                    const minutesOverdue = differenceInMinutes(now, dueDate);
                    title = 'Action Required: Your Rent is Overdue';
                    body = `Hi ${guest.name}, your rent payment is ${getHumanReadableDuration(minutesOverdue)} overdue. Please complete the payment as soon as possible.`;
                } else {
                    const rentCycleUnit: RentCycleUnit = guest.rentCycleUnit || 'months';
                    let shouldSendReminder = false;
                    let timeUntilDue = '';

                    switch (rentCycleUnit) {
                        case 'minutes':
                            const minutesUntilDue = differenceInMinutes(dueDate, now);
                            if (minutesUntilDue <= 5) {
                                shouldSendReminder = true;
                                timeUntilDue = `${minutesUntilDue} minute(s)`;
                            }
                            break;
                        case 'hours':
                            const hoursUntilDue = differenceInHours(dueDate, now);
                            if (hoursUntilDue <= 3) {
                                shouldSendReminder = true;
                                timeUntilDue = `${hoursUntilDue} hour(s)`;
                            }
                            break;
                        case 'days':
                        case 'weeks':
                        case 'months':
                        default:
                            const daysUntilDue = differenceInDays(dueDate, now);
                            if (daysUntilDue <= 5) {
                                shouldSendReminder = true;
                                timeUntilDue = `${daysUntilDue} day(s) on ${format(dueDate, 'do MMM')}`;
                            }
                            break;
                    }

                    if (shouldSendReminder) {
                        title = `Gentle Reminder: Your Rent is Due Soon`;
                        body = `Hi ${guest.name}, a friendly reminder that your rent is due in ${timeUntilDue}.`;
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

        const message = `Reconciliation complete. Sent ${totalRemindersSent} rent reminders.`;
        console.log(message);
        return NextResponse.json({ success: true, message });

    } catch (error: any) {
        console.error('Error in send-rent-reminders cron job:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
