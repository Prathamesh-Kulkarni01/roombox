
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
      return NextResponse.json(
        { success: false, error: 'Invalid signature.' },
        { status: 400 }
      );
    }

    const event = JSON.parse(body);
    const adminDb = await getAdminDb();

    // Handle failed subscription payments
    if (
      event.event === 'subscription.charged' &&
      event.payload.payment.entity.status === 'failed'
    ) {
      const subscriptionId = event.payload.subscription.entity.id;

      console.log(`Processing failed payment for subscription: ${subscriptionId}`);

      const usersRef = adminDb.collection('users');
      const snapshot = await usersRef
        .where('subscription.razorpay_subscription_id', '==', subscriptionId)
        .get();

      if (snapshot.empty) {
        console.warn(`No user found with subscription ID: ${subscriptionId}`);
        return NextResponse.json({
          success: true,
          message: 'No user found for this subscription.',
        });
      }

      const batch = adminDb.batch();
      snapshot.forEach((userDoc) => {
        console.log(`Downgrading user ${userDoc.id} to free plan.`);
        batch.update(userDoc.ref, {
          'subscription.planId': 'free',
          'subscription.status': 'inactive',
          updatedAt: new Date().toISOString(),
        });
      });

      await batch.commit();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing Razorpay subscription webhook:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
