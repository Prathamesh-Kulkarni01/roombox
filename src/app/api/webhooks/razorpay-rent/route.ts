
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { format, addMonths } from 'date-fns';
import type { Guest, Payment, User } from '@/lib/types';
import { produce } from 'immer';
import Razorpay from 'razorpay';
import { createNotification } from '@/lib/actions/notificationActions';


const WEBHOOK_SECRET = process.env.RAZORPAY_RENT_WEBHOOK_SECRET;
const COMMISSION_RATE = parseFloat(process.env.COMMISSION_PERCENT || '0') / 100;

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
      
      const methodFromGateway = (payment.method || '').toLowerCase();
      const methodForHistory: Payment['method'] = methodFromGateway === 'upi' ? 'upi' : 'in-app';
      const upiVpa: string | undefined = payment.vpa || payment.notes?.vpa;

      const newPayment: Payment = {
        id: payment.id,
        date: new Date(payment.created_at * 1000).toISOString(),
        amount: amountPaid,
        method: methodForHistory,
        forMonth: format(new Date(guest.dueDate), 'MMMM yyyy'),
        notes: `Razorpay Order: ${order.id}; Method: ${methodFromGateway || 'n/a'}${upiVpa ? `; VPA: ${upiVpa}` : ''}`,
        payoutStatus: 'pending',
      };

      const updatedGuest = produce(guest, draft => {
          if (!draft.paymentHistory) draft.paymentHistory = [];
          draft.paymentHistory.push(newPayment);

          const totalPaidInCycle = (draft.rentPaidAmount || 0) + amountPaid;
          
          const balanceBf = draft.balanceBroughtForward || 0;
          const totalBill = balanceBf + draft.rentAmount + (draft.additionalCharges || []).reduce((sum, charge) => sum + charge.amount, 0);

          if (totalPaidInCycle >= totalBill) {
              draft.rentStatus = 'paid';
              draft.balanceBroughtForward = totalPaidInCycle - totalBill;
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

      // Attempt payout to owner after successfully updating tenant records
      const commission = amountPaid * COMMISSION_RATE;
      const payoutAmount = amountPaid - commission;

      if (payoutAmount > 0) {
        const payoutMethods = owner.subscription?.payoutMethods?.filter(m => m.isActive).sort((a, b) => (a.isPrimary ? -1 : 1) - (b.isPrimary ? -1 : 1)) || [];
        
        let payoutSucceeded = false;
        let lastError = 'No active payout methods found.';

        for (const method of payoutMethods) {
          try {
            const payout = await razorpay.payouts.create({
                account_number: process.env.RAZORPAY_ACCOUNT_NUMBER!,
                fund_account_id: method.razorpay_fund_account_id!,
                amount: Math.round(payoutAmount * 100),
                currency: "INR", mode: "UPI", purpose: "payout", queue_if_low_balance: true,
                notes: { payment_id: payment.id, guest_name: guest.name, pg_name: guest.pgName }
            });
            
            console.log(`Payout of ₹${payoutAmount.toFixed(2)} to owner ${ownerId} succeeded via ${method.name}. Payout ID: ${payout.id}`);
            payoutSucceeded = true;
            // Optionally update the payment record with payout info
            const guestAfterUpdate = await guestDocRef.get();
            const finalGuestState = produce(guestAfterUpdate.data() as Guest, draft => {
                const paymentRecord = draft.paymentHistory?.find(p => p.id === payment.id);
                if(paymentRecord) {
                    paymentRecord.payoutId = payout.id;
                    paymentRecord.payoutStatus = 'processed';
                }
            });
            await guestDocRef.set(finalGuestState, { merge: true });
            
            break; // Exit loop on success
          } catch(payoutError: any) {
             lastError = payoutError.error?.description || payoutError.message || "An unknown error occurred.";
             console.warn(`Payout via ${method.name} failed for owner ${ownerId}:`, lastError);
             // Optionally update method status
             // await adminDb.doc(`users/${ownerId}`).update(...)
          }
        }
        
        if(!payoutSucceeded) {
            console.error(`All payout methods failed for owner ${ownerId}. Last error: ${lastError}`);
            // Use server-side helper to create notification
            await createNotification({
                ownerId: ownerId, // Ensure ownerId is passed
                notification: {
                    type: 'payout-failed',
                    title: 'Payout Failed: Manual Action Required',
                    message: `Payment of ₹${amountPaid} from ${guest.name} was received, but all payout attempts failed. Last error: ${lastError}`,
                    link: `/dashboard/rent-passbook`,
                    targetId: ownerId,
                }
            });

            // Update payment record to reflect payout failure
            const guestAfterUpdate = await guestDocRef.get();
            const finalGuestState = produce(guestAfterUpdate.data() as Guest, draft => {
                const paymentRecord = draft.paymentHistory?.find(p => p.id === payment.id);
                if(paymentRecord) {
                    paymentRecord.payoutStatus = 'failed';
                    paymentRecord.payoutFailureReason = lastError;
                }
            });
            await guestDocRef.set(finalGuestState, { merge: true });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing Razorpay rent webhook:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
