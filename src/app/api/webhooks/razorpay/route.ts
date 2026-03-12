
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminDb } from '@/lib/firebaseAdmin';

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!WEBHOOK_SECRET) {
    console.error('Razorpay subscription webhook secret is not set.');
    return NextResponse.json(
      { success: false, error: 'Webhook secret not configured.' },
      { status: 500 }
    );
  }

    const signature = req.headers.get('x-razorpay-signature');
    const body = await req.text();

    try {
      const expectedSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.warn('[Webhook: Razorpay-Subscription] Invalid signature mismatch.');
        return NextResponse.json(
          { success: false, error: 'Invalid signature.' },
          { status: 400 }
        );
      }

    const event = JSON.parse(body);
    console.log(`[Webhook: Razorpay-Subscription] Received event: ${event.event} (ID: ${event.id})`);
    const adminDb = await getAdminDb();

    // 1. Get Subscription ID from payload
    const subEntity = event.payload.subscription?.entity;
    const subscriptionId = subEntity?.id;

    if (!subscriptionId) {
      console.warn(`[Webhook: Razorpay-Subscription] No subscription ID found in event payload.`);
      return NextResponse.json({ success: true });
    }

    // 2. Find associated user(s)
    const usersRef = adminDb.collection('users');
    const snapshot = await usersRef
      .where('subscription.razorpay_subscription_id', '==', subscriptionId)
      .get();

    if (snapshot.empty) {
      console.warn(`[Webhook: Razorpay-Subscription] No user found with subscription ID: ${subscriptionId}`);
      return NextResponse.json({ success: true });
    }

    const batch = adminDb.batch();
    const now = new Date().toISOString();

    // 3. Handle Events
    switch (event.event) {
      case 'subscription.charged': {
        const paymentStatus = event.payload.payment.entity.status;
        
        if (paymentStatus === 'captured' || paymentStatus === 'authorized') {
          console.log(`[Webhook: Razorpay-Subscription] Successful payment for ${subscriptionId}. Syncing status.`);
          snapshot.forEach((userDoc) => {
            batch.update(userDoc.ref, {
              'subscription.status': 'active',
              'subscription.lastPaymentAt': now,
              updatedAt: now,
            });
          });
        } else if (paymentStatus === 'failed') {
          console.log(`[Webhook: Razorpay-Subscription] Failed payment for ${subscriptionId}. Downgrading users.`);
          snapshot.forEach((userDoc) => {
            batch.update(userDoc.ref, {
              'subscription.planId': 'free',
              'subscription.status': 'inactive',
              updatedAt: now,
            });
          });
        }
        break;
      }

      case 'subscription.cancelled':
      case 'subscription.halted': {
        console.log(`[Webhook: Razorpay-Subscription] Subscription ${subscriptionId} ${event.event}. Deactivating users.`);
        snapshot.forEach((userDoc) => {
          batch.update(userDoc.ref, {
            'subscription.status': 'inactive',
            'subscription.planId': 'free',
            updatedAt: now,
          });
        });
        break;
      }

      case 'subscription.activated': {
        console.log(`[Webhook: Razorpay-Subscription] Subscription ${subscriptionId} activated.`);
        snapshot.forEach((userDoc) => {
          batch.update(userDoc.ref, {
            'subscription.status': 'active',
            updatedAt: now,
          });
        });
        break;
      }

      default:
        console.log(`[Webhook: Razorpay-Subscription] Unhandled event: ${event.event}`);
    }

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing Razorpay subscription webhook:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
