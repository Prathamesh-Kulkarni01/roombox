
'use server'

import Razorpay from 'razorpay'
import crypto from 'crypto'
import shortid from 'shortid'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { plans } from '../mock-data'
import type { PlanName, User } from '../types'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function createRazorpaySubscription(planId: PlanName, userId: string) {
  const plan = plans[planId]
  if (!plan || typeof plan.price !== 'number' || plan.price <= 0) {
    throw new Error('Invalid plan selected for subscription.')
  }

  // A plan needs to be created on Razorpay first.
  // We'll create one on the fly if it doesn't exist, using the planId as a reference.
  // Note: This is a simplified approach. A production app might pre-create plans on Razorpay.
  let razorpayPlanId = '';
  
  try {
    // Check if a plan with our internal ID exists
    const existingPlans = await razorpay.plans.all({ count: 100 });
    const existingPlan = existingPlans.items.find(p => p.notes?.planId === planId);

    if (existingPlan) {
        razorpayPlanId = existingPlan.id;
    } else {
        // Create the plan on Razorpay if it doesn't exist
        const newPlan = await razorpay.plans.create({
            period: 'monthly',
            interval: 1,
            item: {
                name: `${plan.name} Plan`,
                amount: plan.price * 100, // Amount in paisa
                currency: 'INR',
                description: plan.description
            },
            notes: {
                // Store our internal planId in the notes for future lookup
                planId: planId
            }
        });
        razorpayPlanId = newPlan.id;
    }

    if (!razorpayPlanId) {
        throw new Error('Could not find or create a plan on Razorpay.');
    }

    const subscription = await razorpay.subscriptions.create({
      plan_id: razorpayPlanId,
      customer_notify: 1,
      quantity: 1,
      total_count: 120, // For 10 years
      notes: {
        userId: userId,
      },
    })
    return { success: true, subscription }
  } catch (error) {
    console.error('Razorpay subscription creation failed:', error)
    return { success: false, error: 'Could not create subscription on payment gateway.' }
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
