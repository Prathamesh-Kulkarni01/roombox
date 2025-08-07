
'use server'

import Razorpay from 'razorpay'
import crypto from 'crypto'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { User, PremiumFeatures, BillingDetails, BillingCycleDetails } from '../types'
import { getAdminDb } from '../firebaseAdmin'
import { PRICING_CONFIG } from '../mock-data'


/**
 * Calculates the billing details for a given owner for both the current and next cycle.
 */
export async function calculateOwnerBill(owner: User): Promise<BillingDetails> {
    const adminDb = await getAdminDb();

    // Fetch active properties
    const pgsSnapshot = await adminDb
        .collection('users_data')
        .doc(owner.id)
        .collection('pgs')
        .get();
    
    const propertyCount = pgsSnapshot.docs.length;
    
    // Fetch active tenants
    const guestsSnapshot = await adminDb
        .collection('users_data')
        .doc(owner.id)
        .collection('guests')
        .where('isVacated', '==', false)
        .get();

    const billableTenantCount = guestsSnapshot.docs.length;
    
    // Gracefully handle cases where subscription or premiumFeatures might not exist
    const subscription = owner.subscription || {};
    const premiumFeatures = subscription.premiumFeatures || {};
    const isSubscribed = subscription.status === 'active' || subscription.status === 'trialing';

    const calculateCycleDetails = (features: PremiumFeatures): BillingCycleDetails => {
        const propertyCharge = isSubscribed ? propertyCount * PRICING_CONFIG.perProperty : 0;
        const tenantCharge = isSubscribed ? billableTenantCount * PRICING_CONFIG.perTenant : 0;

        let premiumCharge = 0;
        const premiumDetails: BillingCycleDetails['premiumFeaturesDetails'] = {};

        if (isSubscribed) {
            for (const [key, config] of Object.entries(PRICING_CONFIG.premiumFeatures)) {
                const featureKey = key as keyof PremiumFeatures;
                if (features[featureKey]?.enabled) {
                    let charge = 0;
                    let description = `${config.name}`;

                    if (config.billingType === 'monthly') {
                        charge = config.monthlyCharge;
                        description = `${config.name}`;
                    } else if (config.billingType === 'per_tenant') {
                        charge = billableTenantCount * config.perTenantCharge;
                        description = `${config.name} (${billableTenantCount} tenants × ₹${config.perTenantCharge})`;
                    }

                    premiumCharge += charge;
                    premiumDetails[key] = { charge, description };
                }
            }
        }
        
        return {
            totalAmount: propertyCharge + tenantCharge + premiumCharge,
            propertyCharge,
            tenantCharge,
            premiumFeaturesCharge: premiumCharge,
            premiumFeaturesDetails: premiumDetails,
        };
    };
    
    const currentCycle = calculateCycleDetails(premiumFeatures);
    // For estimation, we assume the same state.
    const nextCycleEstimate = calculateCycleDetails(premiumFeatures);

    return {
        currentCycle,
        nextCycleEstimate,
        details: {
            propertyCount,
            billableTenantCount,
            pricingConfig: PRICING_CONFIG,
        }
    };
}


export async function getBillingDetails(ownerId: string): Promise<{ success: boolean; data?: BillingDetails; error?: string }> {
    const adminDb = await getAdminDb();
    try {
        const ownerDoc = await adminDb.collection('users').doc(ownerId).get();
        if (!ownerDoc.exists()) {
            return { success: false, error: "Owner not found." };
        }

        const owner = { ...ownerDoc.data(), id: ownerDoc.id } as User;
        const billingData = await calculateOwnerBill(owner);
        return { success: true, data: billingData };
    } catch (error: any) {
        console.error('Error in getBillingDetails:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Creates a base subscription for a new user on Razorpay.
 * This subscription has a ₹0 cost and serves as the anchor for monthly addons.
 */
export async function createRazorpaySubscription(userId: string) {
  try {
    const BASE_PLAN_ID = process.env.RAZORPAY_BASE_PLAN_ID || 'plan_base_monthly';
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
 * Calculates the total monthly bill and creates a single addon for it on Razorpay.
 */
export async function calculateAndCreateAddons() {
  const adminDb = await getAdminDb();
  console.log('Running monthly billing cron job...');
  let processedCount = 0;
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });

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
        const totalAmount = billingDetails.currentCycle.totalAmount;
        
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
