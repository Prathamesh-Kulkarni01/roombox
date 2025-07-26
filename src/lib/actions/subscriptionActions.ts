
'use server'

import Razorpay from 'razorpay'
import crypto from 'crypto'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { plans } from '../mock-data'
import type { PlanName } from '../types'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

function getRazorpayPlanId(planId: PlanName): string | null {
    switch (planId) {
        case 'starter':
            return process.env.RAZORPAY_STARTER_PLAN_ID || null;
        case 'pro':
            return process.env.RAZORPAY_PRO_PLAN_ID || null;
        case 'business':
            return process.env.RAZORPAY_BUSINESS_PLAN_ID || null;
        // Add other plans here if they become subscribable
        default:
            return null;
    }
}

export async function createRazorpaySubscription(planId: PlanName, userId: string) {
  const plan = plans[planId]
  if (!plan || typeof plan.price !== 'number' || plan.price <= 0) {
    return { success: false, error: 'Invalid plan selected for subscription.' }
  }

  const razorpayPlanId = getRazorpayPlanId(planId);

  if (!razorpayPlanId) {
      console.error(`Razorpay Plan ID not found in .env for plan: ${planId}`);
      return { success: false, error: 'Subscription configuration error. Please contact support.' };
  }

  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: razorpayPlanId,
      customer_notify: 1,
      quantity: 1,
      total_count: 120, // For 10 years
      notes: {
        userId: userId,
        planName: plan.name,
      },
    })
    return { success: true, subscription }
  } catch (error: any) {
    console.error('Razorpay subscription creation failed:', error);
    return { success: false, error: 'Could not create subscription on the payment gateway. Please ensure plan IDs are correct.' };
  }
}

export async function verifySubscriptionPayment(data: {
  razorpay_payment_id: string
  razorpay_subscription_id: string
  razorpay_signature: string
  userId: string
  planId: PlanName
}) {
  const { userId, planId, razorpay_subscription_id, razorpay_payment_id, razorpay_signature } = data;
  
  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(razorpay_payment_id + '|' + razorpay_subscription_id)
    .digest('hex')

  if (generated_signature !== razorpay_signature) {
    return { success: false, error: 'Payment verification failed. Signature mismatch.' }
  }

  // Signature is valid, update user's subscription in Firestore
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
        'subscription.planId': planId,
        'subscription.status': 'active',
        'subscription.razorpay_subscription_id': razorpay_subscription_id,
        'subscription.razorpay_payment_id': razorpay_payment_id,
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating user subscription:", error);
    return { success: false, error: 'Failed to update subscription status in our system.' };
  }
}
