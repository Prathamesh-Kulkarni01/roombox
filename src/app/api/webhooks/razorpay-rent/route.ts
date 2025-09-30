
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { format, addMonths, setDate, lastDayOfMonth } from 'date-fns';
import type { Guest, Payment, User } from '@/lib/types';
import { produce } from 'immer';
import { createAndSendNotification } from '@/lib/actions/notificationActions';
import { calculateFirstDueDate } from '@/lib/utils';

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
      const ownerDoc = await adminDb.collection('users').doc(ownerId).get();
      if (!ownerDoc.exists) {
          console.error(`Webhook handler: Owner with ID ${ownerId} not found.`);
          return NextResponse.json({ success: false, error: 'Owner not found.' }, { status: 404 });
      }
      const enterpriseDbId = ownerDoc.data()?.subscription?.enterpriseProject?.databaseId as string | undefined;
      const enterpriseProjectId = ownerDoc.data()?.subscription?.enterpriseProject?.projectId as string | undefined;
      const dataDb = await getAdminDb(enterpriseProjectId, enterpriseDbId);
      const guestDocRef = dataDb.collection('users_data').doc(ownerId).collection('guests').doc(guestId);
      
      // Use a transaction to prevent race conditions
      await dataDb.runTransaction(async (transaction) => {
          const guestDoc = await transaction.get(guestDocRef);
          if (!guestDoc.exists) {
              console.error(`Webhook handler: Guest with ID ${guestId} not found.`);
              return;
          }

          const guest = guestDoc.data() as Guest;

          // Idempotency Check
          if (guest.paymentHistory?.some(p => p.id === payment.id)) {
              console.log(`Payment ${payment.id} already processed for guest ${guestId}. Skipping.`);
              return;
          }

          const owner = ownerDoc.data() as User;
          const primaryPayoutAccount = owner.subscription?.payoutMethods?.find(m => m.isPrimary && m.isActive);

          const newPayment: Payment = {
              id: payment.id,
              date: new Date(payment.created_at * 1000).toISOString(),
              amount: amountPaid,
              method: 'in-app',
              forMonth: format(new Date(guest.dueDate), 'MMMM yyyy'),
              notes: `Paid via ${(payment.method || 'online').toLowerCase()}`,
              payoutId: order.id,
              payoutStatus: 'processed',
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
                  draft.dueDate = format(calculateFirstDueDate(new Date(draft.dueDate), draft.rentCycleUnit, draft.rentCycleValue, draft.billingAnchorDay), 'yyyy-MM-dd');
              } else {
                  draft.rentStatus = 'partial';
                  draft.rentPaidAmount = totalPaidInCycle;
              }
          });

          transaction.set(guestDocRef, updatedGuest);

          // Notifications are sent outside the transaction
          await createAndSendNotification({
              ownerId: ownerId,
              notification: {
                  type: 'rent-paid',
                  title: 'Rent Received!',
                  message: `You have received ₹${amountPaid.toLocaleString('en-IN')} from ${guest.name}.`,
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
                      message: `Your payment of ₹${amountPaid.toLocaleString('en-IN')} has been recorded.`,
                      link: '/tenants/my-pg',
                      targetId: guest.userId
                  }
              });
          }
      });
      console.log(`Successfully updated rent payment for guest ${guestId}.`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing Razorpay rent webhook:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
