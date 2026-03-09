
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

    const { guestIds } = await request.json(); // Expect an array of guest IDs

    const adminDb = await getAdminDb();
    let notifiedCount = 0;
    const today = new Date();

    const guestsCollection = adminDb.collection('users_data').doc(ownerId).collection('guests');

    let guestsToNotify: Guest[] = [];

    if (guestIds && guestIds.length > 0) {
      // Fetch only the selected guests
      const guestDocs = await guestsCollection.where('id', 'in', guestIds).get();
      guestDocs.forEach(doc => {
        const guest = doc.data() as Guest;
        if (!guest.isVacated && (guest.rentStatus === 'unpaid' || guest.rentStatus === 'partial')) {
          guestsToNotify.push(guest);
        }
      });
    } else {
      // Fallback to old behavior if no guestIds are provided
      const allPendingGuestsSnapshot = await guestsCollection
        .where('isVacated', '==', false)
        .where('rentStatus', 'in', ['unpaid', 'partial'])
        .get();

      allPendingGuestsSnapshot.forEach(doc => {
        guestsToNotify.push(doc.data() as Guest);
      });
    }


    if (guestsToNotify.length === 0) {
      return NextResponse.json({ success: true, sentCount: 0, message: 'No guests with pending dues found.' });
    }

    for (const guest of guestsToNotify) {
      if (!guest.userId && !guest.phone) continue;

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

      let sentAtLeastOne = false;

      // 1. In-App Notification
      if (guest.userId) {
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
        sentAtLeastOne = true;
      }

      // 2. WhatsApp Template Reminder
      if (guest.phone) {
        try {
          let formattedPhone = guest.phone.replace(/\D/g, '');
          if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;

          const { sendWhatsAppTemplate } = await import('@/lib/whatsapp/send-message');
          const appUrl = (process.env.APP_URL || 'https://roombox.in');
          const payUrl = `${appUrl}/pay/${guest.id}`;
          const dueDateObj = new Date(guest.dueDate);
          const monthLabel = dueDateObj.toLocaleDateString('en-IN', { month: 'long' });
          const dateLabel = dueDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

          await sendWhatsAppTemplate(formattedPhone, 'new_rent_due_reminder', 'en_US', [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: guest.name }, // {{1}}
                { type: 'text', text: monthLabel }, // {{2}}
                { type: 'text', text: dateLabel }, // {{3}}
                { type: 'text', text: String(guest.rentAmount) }, // {{4}}
                { type: 'text', text: guest.pgName || 'Our Property' }, // {{5}}
                { type: 'text', text: payUrl }, // {{6}} - Link in Body
                { type: 'text', text: String(guest.balance || guest.rentAmount) } // {{7}} - Balance
              ]
            }
          ]);
        } catch (waErr) {
          console.warn(`[manual-reminder] WA failure for ${guest.phone}`, waErr);
        }
      }

      if (sentAtLeastOne) notifiedCount++;
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
