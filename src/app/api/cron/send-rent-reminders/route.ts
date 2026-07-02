'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { reconcileAllGuests } from '@/lib/actions/reconciliationActions';
import { sendRemindersForOwner } from '@/lib/actions/reminderActions';
import { isCronAuthorized, unauthorizedCronResponse } from '@/lib/cron/auth';

export async function GET(request: NextRequest) {
    try {
        if (!isCronAuthorized(request)) {
            return unauthorizedCronResponse();
        }

        const reconciliationResult = await reconcileAllGuests();
        if (!reconciliationResult.success) {
            console.warn('Rent reconciliation part of the reminder job may have failed for some tenants.');
        }

        const adminDb = await getAdminDb();
        const usersSnapshot = await adminDb.collection('users').where('role', '==', 'owner').get();

        let totalRemindersSent = 0;
        const now = new Date();

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            
            if (userData?.subscription?.planId === 'enterprise') {
                continue;
            }
            
            const ownerId = userDoc.id;
            const result = await sendRemindersForOwner(ownerId, now);
            
            if (result.success) {
                totalRemindersSent += result.sentCount;
            }
        }

        const message = `Reconciliation and Reminders complete. Successfully sent ${totalRemindersSent} unique rent reminders for standard users.`;
        console.log(message);
        return NextResponse.json({ success: true, message });

    } catch (error: any) {
        console.error('Error in send-rent-reminders cron job:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
