
'use server'

import Razorpay from 'razorpay'
import crypto from 'crypto'
import type { User } from '../types'
import { getAdminDb } from '../firebaseAdmin'
import { calculateOwnerBill } from './billingActions'
import { getVerifiedOwnerIdFromHeaders } from '../auth-server'

let razorpayInstance: any = null;
function getRazorpay() {
  if (!razorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay keys are missing in environment variables.');
    }
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
}

// A fixed plan ID for the base subscription on Razorpay.
// This plan should be created manually in your Razorpay dashboard with ₹0 cost.
const BASE_PLAN_ID = process.env.RAZORPAY_BASE_PLAN_ID || 'plan_base_monthly';

/**
 * Creates a base subscription for the authenticated user on Razorpay.
 * This subscription has a ₹0 cost and serves as the anchor for monthly addons.
 */
export async function createRazorpaySubscription(token?: string) {
  try {
    const { ownerId: userId, error: authError } = await getVerifiedOwnerIdFromHeaders(token);
    if (!userId) return { success: false, error: authError || 'Unauthorized' };

    // Check if the base plan exists on Razorpay
    try {
       await getRazorpay().plans.fetch(BASE_PLAN_ID);
    } catch(fetchError: any) {
        if (fetchError.statusCode === 404) {
            console.error(`FATAL: Razorpay plan with ID "${BASE_PLAN_ID}" not found. Please create it in your Razorpay dashboard.`);
            return { success: false, error: 'Base subscription plan is not configured.' };
        }
        throw fetchError;
    }
      
    const subscription = await getRazorpay().subscriptions.create({
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
}, token?: string) {
  const { razorpay_subscription_id, razorpay_payment_id, razorpay_signature } = data;
  
  try {
    const { ownerId: userId, error: authError } = await getVerifiedOwnerIdFromHeaders(token);
    if (!userId) return { success: false, error: authError || 'Unauthorized' };

    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(razorpay_payment_id + '|' + razorpay_subscription_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return { success: false, error: 'Payment verification failed. Signature mismatch.' };
    }

    // Signature is valid, update user's subscription in Firestore using Admin SDK
    const adminDb = await getAdminDb();
    const userDocRef = adminDb.collection('users').doc(userId);
    await userDocRef.update({
        'subscription.status': 'active',
        'subscription.planId': 'pro',
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
 * Main billing cron job.
 * 1. Checks trial expiration.
 * 2. Processes monthly wallet debits for active users.
 */
export async function runMonthlyBillingCron() {
  const adminDb = await getAdminDb();
  console.log('Running monthly billing cron job...');
  let processedCount = 0;
  let debitedCount = 0;
  let trialExpiredCount = 0;
  
  const now = new Date();
  const nowIso = now.toISOString();
  const currentMonth = nowIso.slice(0, 7); // YYYY-MM

  try {
    // We process ALL owners who are not inactive/canceled
    const ownersSnapshot = await adminDb
        .collection('users')
        .where('role', '==', 'owner')
        .get();
        
    for (const userDoc of ownersSnapshot.docs) {
        const owner = { id: userDoc.id, ...userDoc.data() } as User;
        const sub = owner.subscription;
        
        if (!sub || sub.status === 'inactive' || sub.status === 'canceled') continue;

        processedCount++;

        // 1. Handle Trial Expiration
        if (sub.status === 'trialing') {
            const trialEndDate = sub.trialEndDate ? new Date(sub.trialEndDate) : null;
            if (trialEndDate && trialEndDate < now) {
                console.log(`Trial expired for ${owner.id}.`);
                const balance = owner.wallet?.balance ?? 0;
                const newStatus = balance > 0 ? 'active' : 'restricted';
                
                await userDoc.ref.update({
                    'subscription.status': newStatus,
                });
                owner.subscription!.status = newStatus; // Update local copy for next step
                trialExpiredCount++;
            } else {
                // Still in trial, skip billing
                continue;
            }
        }

        // 2. Process Wallet Debit
        if (sub.status === 'active' || sub.status === 'restricted') {
            // Check if already billed this month
            const lastBilled = owner.billingConfig?.lastBilledAt;
            if (lastBilled && lastBilled.startsWith(currentMonth)) {
                // Already billed this month
                continue;
            }

            const billingDetails = await calculateOwnerBill(owner);
            const totalAmount = billingDetails.currentCycle.totalAmount;
            
            if (totalAmount > 0) {
                const { success, error, newBalance } = await import('./walletActions').then(m => m.debitWallet({
                    ownerId: owner.id,
                    amount: totalAmount,
                    description: `Monthly billing for ${now.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
                    invoiceMonth: currentMonth,
                    additionalUpdates: {
                        'billingConfig.lastBilledAt': nowIso
                    }
                }));

                if (success) {
                    console.log(`Debited ₹${totalAmount} from ${owner.id}. New balance: ${newBalance}`);
                    debitedCount++;
                } else {
                    console.error(`Failed to debit ${owner.id}: ${error}`);
                }
            } else {
                // If bill is 0, still update lastBilledAt to prevent redundant checks
                await userDoc.ref.update({
                    'billingConfig.lastBilledAt': nowIso
                });
            }
        }
    }
    
    console.log(`Billing cron job finished. Processed: ${processedCount}, Debited: ${debitedCount}, Trials Expired: ${trialExpiredCount}`);
    return { success: true, processedCount, debitedCount, trialExpiredCount };
  } catch(error: any) {
    console.error("Error running billing cron job:", error);
    return { success: false, error: error.message };
  }
}
