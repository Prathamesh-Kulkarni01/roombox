
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { format, addMonths } from 'date-fns';
import type { Guest, Payment, User } from '@/lib/types';
import { produce } from 'immer';
import { createAndSendNotification } from '@/lib/actions/notificationActions';

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
      const ownerDocRef = adminDb.collection('users').doc(ownerId);
      
      const [guestDoc, ownerDoc] = await Promise.all([guestDocRef.get(), ownerDocRef.get()]);

      if (!guestDoc.exists) {
        console.error(`Webhook handler: Guest with ID ${guestId} not found.`);
        return NextResponse.json({ success: true, message: 'Guest not found.' });
      }
      if (!ownerDoc.exists) {
          console.error(`Webhook handler: Owner with ID ${ownerId} not found.`);
          return NextResponse.json({ success: true, message: 'Owner not found.' });
      }

      const guest = guestDoc.data() as Guest;
      const owner = ownerDoc.data() as User;
      
      const methodFromGateway = (payment.method || 'online').toLowerCase();
      const upiVpa: string | undefined = payment.vpa || payment.notes?.vpa;
      const primaryPayoutAccount = owner.subscription?.payoutMethods?.find(m => m.isPrimary && m.isActive);

      const newPayment: Payment = {
        id: payment.id,
        date: new Date(payment.created_at * 1000).toISOString(),
        amount: amountPaid,
        method: 'in-app', // All webhook payments are in-app
        forMonth: format(new Date(guest.dueDate), 'MMMM yyyy'),
        notes: `Paid via ${methodFromGateway}${upiVpa ? ` (${upiVpa})` : ''}`,
        payoutId: order.id, // Using order ID as a reference for the routed payment
        payoutStatus: 'processed', // Assumed processed by Razorpay Routes
        payoutTo: primaryPayoutAccount?.name || 'Linked Account',
      };

      const updatedGuest = produce(guest, draft => {
          if (!draft.paymentHistory) draft.paymentHistory = [];
          draft.paymentHistory.push(newPayment);

          const totalPaidInCycle = (draft.rentPaidAmount || 0) + amountPaid;
          
          const balanceBf = draft.balanceBroughtForward || 0;
          const additionalChargesTotal = (draft.additionalCharges || []).reduce((sum, charge) => sum + charge.amount, 0);
          const totalBillForCycle = balanceBf + draft.rentAmount + additionalChargesTotal;

          if (totalPaidInCycle >= totalBillForCycle) {
              draft.rentStatus = 'paid';
              draft.balanceBroughtForward = totalPaidInCycle - totalBillForCycle;
              draft.rentPaidAmount = 0;
              draft.additionalCharges = [];
              draft.dueDate = format(addMonths(new Date(draft.dueDate), 1), 'yyyy-MM-dd');
          } else {
              draft.rentStatus = 'partial';
              draft.rentPaidAmount = totalPaidInCycle;
          }
      });
      
      await guestDocRef.set(updatedGuest, { merge: true });
      console.log(`Successfully updated rent payment for guest ${guestId}.`);
      
      // Send notifications
      await createAndSendNotification({
        ownerId: ownerId,
        notification: {
            type: 'rent-paid',
            title: 'Rent Received!',
            message: `You have received ₹${amountPaid.toLocaleString('en-IN')} from ${guest.name}. It has been routed to your primary account.`,
            link: `/dashboard/tenant-management/${guestId}`,
            targetId: ownerId
        }
      });

      if (guest.userId) {
          await createAndSendNotification({
            ownerId: ownerId,
            notification: {
                type: 'rent-receipt',
                title: 'Payment Successful',
                message: `Your payment of ₹${amountPaid.toLocaleString('en-IN')} has been successfully recorded.`,
                link: '/tenants/my-pg',
                targetId: guest.userId
            }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing Razorpay rent webhook:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
