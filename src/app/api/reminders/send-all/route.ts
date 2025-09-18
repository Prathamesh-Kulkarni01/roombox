
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { createAndSendNotification } from '@/lib/actions/notificationActions';
import type { Guest } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized: No token provided' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const auth = await getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const ownerId = decodedToken.uid;
    
    if (!ownerId) {
         return NextResponse.json({ success: false, error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const adminDb = await getAdminDb();
    const guestsSnapshot = await adminDb
        .collection('users_data')
        .doc(ownerId)
        .collection('guests')
        .where('isVacated', '==', false)
        .where('rentStatus', 'in', ['unpaid', 'partial'])
        .get();
        
    if (guestsSnapshot.empty) {
        return NextResponse.json({ success: true, message: 'No guests with pending dues.', sentCount: 0 });
    }

    let sentCount = 0;
    const promises = guestsSnapshot.docs.map(async (doc) => {
      const guest = doc.data() as Guest;
      if (guest.userId) {
        await createAndSendNotification({
            ownerId: ownerId,
            notification: {
                type: 'rent-reminder',
                title: 'Gentle Rent Reminder',
                message: `Hi ${guest.name}, this is a friendly reminder that your rent is due. Please pay to avoid any late fees.`,
                link: '/tenants/my-pg',
                targetId: guest.userId,
            }
        });
        sentCount++;
      }
    });

    await Promise.all(promises);

    return NextResponse.json({ success: true, message: `Sent ${sentCount} reminders.`, sentCount });

  } catch (error: any) {
    console.error('Error sending mass reminders:', error);
    if (error.code === 'auth/id-token-expired' || error.message.includes('token-expired')) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Your session has expired. Please log in again.' }, { status: 401 });
    }
    // Throw an error with a clear message, which will result in a 500 status code
    throw new Error(error.message || 'Failed to send reminders.');
  }
}
