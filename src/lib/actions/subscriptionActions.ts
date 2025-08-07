
'use server'

import Razorpay from 'razorpay'
import crypto from 'crypto'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { PlanName, User, PremiumFeatures } from '../types'
import { getAdminDb } from '../firebaseAdmin'
import { calculateOwnerBill } from './billingActions'


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
    const adminDb = await getAdminDb();
    const userDocRef = doc(adminDb, 'users', userId);
    await updateDoc(userDocRef, {
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
 * Calculates the total monthly bill and creates a single addon for it on Razorpay.
 */
export async function calculateAndCreateAddons() {
  const adminDb = await getAdminDb();
  console.log('Running monthly billing cron job...');
  let processedCount = 0;

  try {
    const ownersSnapshot = await adminDb
        .collection('users')
        .where('subscription.status', '==', 'active')
        .get();
        
    for (const userDoc of ownersSnapshot.docs) {
        const owner = { id: userDoc.id, ...userDoc.data() } as User;
        const subscriptionId = owner.subscription?.razorpay_subscription_id;
        
        if (!subscriptionId) {
            console.warn(`Owner ${owner.id} is active but has no Razorpay subscription ID. Skipping.`);
            continue;
        }

        const billingDetails = await calculateOwnerBill(owner);
        const totalAmount = billingDetails.totalAmount;
        
        if (totalAmount <= 0) {
            console.log(`Owner ${owner.id} has no charges this month. Skipping.`);
            continue;
        }

        const idempotencyKey = `bill-${owner.id}-${new Date().toISOString().slice(0, 7)}`; // e.g., bill-userId-2024-08
        const itemName = `Monthly Bill for ${new Date().toLocaleString('default', { month: 'long' })}`;

        try {
            await razorpay.subscriptions.createAddon(subscriptionId, {
                item: {
                    name: idempotencyKey,
                    amount: totalAmount * 100, // Amount in paisa
                    currency: 'INR',
                    description: itemName,
                },
                quantity: 1,
            });
            console.log(`Successfully created addon for ${owner.id} of ₹${totalAmount}`);
            processedCount++;
        } catch (error: any) {
            console.error(`Failed to create addon for ${owner.id} (Sub ID: ${subscriptionId}):`, error.error?.description || error.message);
        }
    }
    console.log(`Billing cron job finished. Processed ${processedCount} owner(s).`);
    return { success: true, processedCount };
  } catch(error: any) {
    console.error("Error running billing cron job:", error);
    return { success: false, error: error.message };
  }
}
