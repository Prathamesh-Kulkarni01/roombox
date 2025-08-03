
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebaseAdmin';
import { collection, query, where, getDocs, writeBatch } from 'firebase-admin/firestore';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!WEBHOOK_SECRET) {
    console.error('Razorpay webhook secret is not set.');
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
      return NextResponse.json({ success: false, error: 'Invalid signature.' }, { status: 400 });
    }

    const event = JSON.parse(body);

    // We are interested in failed subscription payments
    if (event.event === 'subscription.charged' && event.payload.payment.entity.status === 'failed') {
      const subscriptionId = event.payload.subscription.entity.id;
      
      console.log(`Processing failed payment for subscription: ${subscriptionId}`);

      const usersRef = collection(adminDb, 'users');
      const q = query(usersRef, where('subscription.razorpay_subscription_id', '==', subscriptionId));
      
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.warn(`No user found with subscription ID: ${subscriptionId}`);
        return NextResponse.json({ success: true, message: 'No user found for this subscription.' });
      }

      const batch = writeBatch(adminDb);
      querySnapshot.forEach(doc => {
        console.log(`Downgrading user ${doc.id} to free plan.`);
        const userRef = doc.ref;
        batch.update(userRef, {
          'subscription.planId': 'free',
          'subscription.status': 'inactive',
        });
      });
      
      await batch.commit();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing Razorpay webhook:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
