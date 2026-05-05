
'use server'

import Razorpay from 'razorpay'
import crypto from 'crypto'
import type { User } from '../types'
import { getAdminDb } from '../firebaseAdmin'
import { calculateOwnerBill } from './billingActions'
import { getVerifiedOwnerIdFromHeaders } from '../auth-server'
import { PRICING_CONFIG } from '../constants'

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

/**
 * Creates a Razorpay order for a wallet recharge.
 */
export async function createRazorpayOrder(amount: number, token?: string) {
  try {
    const { ownerId: userId, error: authError } = await getVerifiedOwnerIdFromHeaders(token);
    if (!userId) return { success: false, error: authError || 'Unauthorized' };

    if (amount < 1) {
      return { success: false, error: 'Invalid recharge amount.' };
    }

    const order = await getRazorpay().orders.create({
      amount: amount * 100, // Razorpay expects amount in paise
      currency: 'INR',
      receipt: `recharge_${userId}_${Date.now()}`,
      notes: {
        userId: userId,
        type: 'wallet_recharge',
        amount: amount
      },
    });

    return { success: true, order };
  } catch (error: any) {
    console.error('Razorpay order creation failed:', error);
    return { success: false, error: 'Could not create payment order.' };
  }
}

/**
 * Verifies a Razorpay payment for a wallet recharge.
 */
export async function verifyPayment(data: {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}, token?: string) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;
  
  try {
    const { ownerId: userId, error: authError } = await getVerifiedOwnerIdFromHeaders(token);
    if (!userId) return { success: false, error: authError || 'Unauthorized' };

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return { success: false, error: 'Payment verification failed. Signature mismatch.' };
    }

    // Signature is valid, fetch the order to get the amount
    const order = await getRazorpay().orders.fetch(razorpay_order_id);
    const amount = order.amount / 100; // Convert back from paise

    // Process the recharge in our wallet system
    const { processRecharge } = await import('./walletActions');
    const rechargeResult = await processRecharge({
      ownerId: userId,
      amount: amount,
      razorpayPaymentId: razorpay_payment_id,
    });

    if (!rechargeResult.success) {
      return { success: false, error: rechargeResult.error || 'Failed to credit wallet.' };
    }

    // Update user's subscription status if it was restricted
    const adminDb = await getAdminDb();
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    const userData = userDoc.data() as User;

    if (userData.subscription?.status === 'restricted') {
        await userDocRef.update({
            'subscription.status': 'active'
        });
    }

    return { success: true };
  } catch (error) {
    console.error("Error verifying payment:", error);
    return { success: false, error: 'Failed to verify payment.' };
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
