
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { addDays, format, isPast, parseISO, differenceInDays } from 'date-fns';
import type { User, Guest } from '@/lib/types';
import { createAndSendNotification } from '@/lib/actions/notificationActions';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const adminAuth = await getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const ownerId = decodedToken.uid;
    
    if (!ownerId) {
      return NextResponse.json({ success: false, error: 'Invalid token, owner not found.' }, { status: 403 });
    }
    
    const adminDb = await getAdminDb();
    let notifiedCount = 0;
    const today = new Date();

    const guestsSnapshot = await adminDb
        .collection('users_data')
        .doc(ownerId)
        .collection('guests')
        .where('isVacated', '==', false)
        .where('rentStatus', 'in', ['unpaid', 'partial'])
        .get();

    if (guestsSnapshot.empty) {
        return NextResponse.json({ success: true, sentCount: 0, message: 'No guests with pending dues found.' });
    }

    for (const guestDoc of guestsSnapshot.docs) {
        const guest = guestDoc.data() as Guest;
        if (!guest.userId) continue; // Cannot notify guest without a user account

        const dueDate = parseISO(guest.dueDate);
        
        let title = '';
        let body = '';

        if (isPast(dueDate)) {
            const daysOverdue = differenceInDays(today, dueDate);
            title = 'Action Required: Your Rent is Overdue';
            body = `Hi ${guest.name}, your rent payment is ${daysOverdue} day(s) overdue. Please complete the payment as soon as possible.`;
        } else {
             const daysUntilDue = differenceInDays(dueDate, today);
             title = `Gentle Reminder: Your Rent is Due Soon`;
             body = `Hi ${guest.name}, a friendly reminder that your rent is due in ${daysUntilDue} day(s) on ${format(dueDate, 'do MMM, yyyy')}.`;
        }

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
        notifiedCount++;
    }

    return NextResponse.json({ success: true, sentCount: notifiedCount });
    
  } catch (error: any) {
    console.error('Error sending manual reminders:', error);
    if (error.code === 'auth/id-token-expired') {
        return NextResponse.json({ success: false, error: 'Authentication token has expired. Please log in again.' }, { status: 401 });
    }
    // Re-throw the error to be handled by the client-side catch block
    throw new Error(error.message || 'Failed to send reminders.');
  }
}
