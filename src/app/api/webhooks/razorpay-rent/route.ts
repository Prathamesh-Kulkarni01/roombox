
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { format, addMonths } from 'date-fns';
import type { Guest, Payment } from '@/lib/types';
import { produce } from 'immer';

const WEBHOOK_SECRET = process.env.RAZORPAY_RENT_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!WEBHOOK_SECRET) {
    console.error('Razorpay rent webhook secret is not set.');
    return NextResponse.json({ success: false, error: 'Webhook secret not configured.' }, { status: 500 });
  }

  const signature = req.headers.get('x-razorpay-signature');
  const body = await req.text();

  try {
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn('Invalid webhook signature received.');
      return NextResponse.json({ success: false, error: 'Invalid signature.' }, { status: 400 });
    }

    const event = JSON.parse(body);

    if (event.event === 'order.paid') {
      const order = event.payload.order.entity;
      const payment = event.payload.payment.entity;
      
      const { guestId, ownerId } = order.notes;
      const amountPaid = payment.amount / 100;

      if (!guestId || !ownerId) {
        console.warn('Webhook received without guestId or ownerId in notes.');
        return NextResponse.json({ success: true, message: 'Webhook processed, but no action taken due to missing metadata.' });
      }

      const adminDb = await getAdminDb();
      const guestDocRef = adminDb.collection('users_data').doc(ownerId).collection('guests').doc(guestId);
      
      const guestDoc = await guestDocRef.get();
      if (!guestDoc.exists) {
        console.error(`Webhook handler: Guest with ID ${guestId} not found.`);
        return NextResponse.json({ success: true, message: 'Guest not found.' });
      }
      const guest = guestDoc.data() as Guest;
      
      const newPayment: Payment = {
        id: payment.id,
        date: new Date(payment.created_at * 1000).toISOString(),
        amount: amountPaid,
        method: 'in-app',
        forMonth: format(new Date(guest.dueDate), 'MMMM yyyy'),
        notes: `Razorpay Order ID: ${order.id}`,
      };

      const updatedGuest = produce(guest, draft => {
          if (!draft.paymentHistory) draft.paymentHistory = [];
          draft.paymentHistory.push(newPayment);

          draft.rentPaidAmount = (draft.rentPaidAmount || 0) + amountPaid;
          
          const balanceBf = draft.balanceBroughtForward || 0;
          const totalBill = balanceBf + draft.rentAmount + (draft.additionalCharges || []).reduce((sum, charge) => sum + charge.amount, 0);

          if (draft.rentPaidAmount >= totalBill) {
              draft.rentStatus = 'paid';
              draft.balanceBroughtForward = draft.rentPaidAmount - totalBill;
              draft.rentPaidAmount = 0;
              draft.additionalCharges = [];
              draft.dueDate = format(addMonths(new Date(draft.dueDate), 1), 'yyyy-MM-dd');
          } else {
              draft.rentStatus = 'partial';
          }
      });
      
      await guestDocRef.set(updatedGuest, { merge: true });
      
      console.log(`Successfully processed rent payment for guest ${guestId}.`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing Razorpay rent webhook:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
