
'use server'

import Razorpay from 'razorpay'
import crypto from 'crypto'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { plans } from '../mock-data'
import type { PlanName, User } from '../types'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// A fixed plan ID for the base subscription on Razorpay.
// This plan should be created manually in your Razorpay dashboard with ₹0 cost.
const BASE_PLAN_ID = process.env.RAZORPAY_BASE_PLAN_ID || 'plan_base_monthly';

/**
 * Creates a base subscription for a new user on Razorpay.
 * This subscription has a ₹0 cost and serves as the anchor for monthly addons.
 */
export async function createRazorpaySubscription(userId: string) {
  try {
    // Check if the base plan exists on Razorpay
    try {
       await razorpay.plans.fetch(BASE_PLAN_ID);
    } catch(fetchError: any) {
        if (fetchError.statusCode === 404) {
            console.error(`FATAL: Razorpay plan with ID "${BASE_PLAN_ID}" not found. Please create it in your Razorpay dashboard.`);
            return { success: false, error: 'Base subscription plan is not configured.' };
        }
        throw fetchError;
    }
      
    const subscription = await razorpay.subscriptions.create({
      plan_id: BASE_PLAN_ID,
      customer_notify: 1,
      quantity: 1,
      total_count: 120, // Keep it long-running, e.g., 10 years
      notes: {
        userId: userId,
        type: 'base_subscription'
      },
    });

    return { success: true, subscription };
  } catch (error: any) {
    console.error('Razorpay base subscription creation failed:', error);
    return { success: false, error: 'Could not create base subscription on payment gateway.' };
  }
}

/**
 * Verifies the initial base subscription payment and updates the user record.
 */
export async function verifySubscriptionPayment(data: {
  razorpay_payment_id: string
  razorpay_subscription_id: string
  razorpay_signature: string
  userId: string
}) {
  const { userId, razorpay_subscription_id, razorpay_payment_id, razorpay_signature } = data;
  
  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(razorpay_payment_id + '|' + razorpay_subscription_id)
    .digest('hex');

  if (generated_signature !== razorpay_signature) {
    return { success: false, error: 'Payment verification failed. Signature mismatch.' };
  }

  // Signature is valid, update user's subscription in Firestore
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
        'subscription.planId': 'pro', // Set to pro to unlock features, billing is separate
        'subscription.status': 'active',
        'subscription.razorpay_subscription_id': razorpay_subscription_id,
        'subscription.razorpay_payment_id': razorpay_payment_id, // For the initial setup
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating user subscription:", error);
    return { success: false, error: 'Failed to update subscription status in our system.' };
  }
}

/**
 * Creates a one-time addon to an existing subscription for the monthly dynamic charge.
 */
export async function calculateAndCreateAddons(
    subscriptionId: string, 
    itemName: string, 
    amount: number,
    idempotencyKey: string,
) {
    try {
        const addon = await razorpay.subscriptions.createAddon(subscriptionId, {
            item: {
                name: idempotencyKey, // Using our key for Razorpay's idempotency
                amount: amount * 100, // Amount in paisa
                currency: 'INR',
                description: itemName,
            },
            quantity: 1,
        });
        return { success: true, addon };
    } catch (error: any) {
        console.error(`Failed to create addon for subscription ${subscriptionId}:`, error);
        return { success: false, error: error.description || 'Could not create addon on payment gateway.' };
    }
}
