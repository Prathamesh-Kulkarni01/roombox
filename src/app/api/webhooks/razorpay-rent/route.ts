
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { format, addMonths } from 'date-fns';
import type { Guest, Payment, User } from '@/lib/types';
import { produce } from 'immer';
import Razorpay from 'razorpay';

const WEBHOOK_SECRET = process.env.RAZORPAY_RENT_WEBHOOK_SECRET;
const COMMISSION_RATE = parseFloat(process.env.COMMISSION_PERCENT || '5') / 100;

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});


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
      
      // Update guest payment history
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
      console.log(`Successfully updated rent payment for guest ${guestId}.`);

      // Trigger payout to owner after deducting commission
      const fundAccountId = owner.subscription?.razorpay_fund_account_id;
      if (!fundAccountId) {
          console.error(`Owner ${ownerId} does not have a fund account ID. Cannot process payout.`);
          return NextResponse.json({ success: true, message: "Payment recorded, but payout failed: owner's account not linked." });
      }
      
      const commission = amountPaid * COMMISSION_RATE;
      const payoutAmount = amountPaid - commission;

      if (payoutAmount > 0) {
        const payout = await razorpay.payouts.create({
            account_number: process.env.RAZORPAY_ACCOUNT_NUMBER!,
            fund_account_id: fundAccountId,
            amount: Math.round(payoutAmount * 100), // Amount in paisa
            currency: "INR",
            mode: "UPI",
            purpose: "rent_settlement",
            queue_if_low_balance: true,
            notes: {
              payment_id: payment.id,
              guest_name: guest.name,
              pg_name: guest.pgName,
              commission_deducted: commission.toFixed(2),
            }
        });

        console.log(`Payout of ₹${payoutAmount.toFixed(2)} initiated to owner ${ownerId}. Payout ID: ${payout.id}`);
      } else {
        console.log(`Payout amount for owner ${ownerId} is zero or less after commission. No payout created.`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing Razorpay rent webhook:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
