
'use server'

import Razorpay from 'razorpay'
import crypto from 'crypto'
import type { User, PremiumFeatures, BillingDetails, BillingCycleDetails, BillingDiscount } from '../types'
import { getAdminDb } from '../firebaseAdmin'
import { PRICING_CONFIG } from '../mock-data'


/**
 * Applies a discount to a raw bill amount.
 * Order: Base + tenant → apply discount → final bill
 */
function applyDiscount(baseAmount: number, baseFee: number, tenantCharge: number, discount?: BillingDiscount | null): { discountedAmount: number; discountValue: number } {
  const safeBaseAmount = isNaN(baseAmount) ? 0 : baseAmount;
  const safeBaseFee = isNaN(baseFee) ? 0 : baseFee;

  let discountValue = 0;
  if (discount) {
    switch (discount.type) {
      case 'flat':
        discountValue = Math.min(discount.value, safeBaseAmount);
        break;
      case 'percentage':
        discountValue = Math.round(safeBaseAmount * (discount.value / 100));
        break;
      case 'free_base':
        // Only charge per-tenant, waive base fee
        discountValue = safeBaseFee;
        break;
    }
  }

  const finalDiscountValue = isNaN(discountValue) ? 0 : discountValue;

  return {
    discountedAmount: Math.max(0, safeBaseAmount - finalDiscountValue),
    discountValue: finalDiscountValue,
  };
}

/**
 * Counts unique tenants who were active at any point during the billing month.
 * Rule: A tenant is counted if they stayed at least 1 day in the billing cycle.
 */
export async function getUniqueTenantsForMonth(ownerId: string, monthIso: string): Promise<string[]> {
  const adminDb = await getAdminDb();
  const [year, month] = monthIso.split('-').map(Number);
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59));

  const guestsSnapshot = await adminDb
    .collection('users_data')
    .doc(ownerId)
    .collection('guests')
    .get();

  const uniquePhoneNumbers = new Set<string>();
  const billableTenantIds: string[] = [];

  guestsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const joinDate = new Date(data.moveInDate || data.createdAt || 0);
    const exitDate = data.isVacated ? new Date(data.exitDate) : null;

    // Logic: Active if joinDate <= endOfMonth AND (exitDate is null OR exitDate >= startOfMonth)
    const wasActive = joinDate <= endOfMonth && (!exitDate || exitDate >= startOfMonth);

    if (wasActive) {
      const phone = data.phone || doc.id; // Fallback to doc ID if phone missing
      if (!uniquePhoneNumbers.has(phone)) {
        uniquePhoneNumbers.add(phone);
        billableTenantIds.push(doc.id);
      }
    }
  });

  return billableTenantIds;
}

/**
 * Calculates the billing details for a given owner for both the current and next cycle.
 */
export async function calculateOwnerBill(owner: User, monthIso?: string): Promise<BillingDetails> {
  const adminDb = await getAdminDb();
  const currentMonth = monthIso || new Date().toISOString().slice(0, 7);

  // Fetch unique tenants for the cycle
  const billableTenantIds = await getUniqueTenantsForMonth(owner.id, currentMonth);
  const billableTenantCount = billableTenantIds.length;

  // Fetch active properties (still needed for display)
  const pgsSnapshot = await adminDb
    .collection('users_data')
    .doc(owner.id)
    .collection('pgs')
    .get();
  const propertyCount = pgsSnapshot.docs.length;
  let totalBeds = 0;
  pgsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    let pgBeds = data.totalBeds || 0;
    
    // If totalBeds is 0 or missing, calculate from floors and rooms
    if (pgBeds === 0 && data.floors) {
      data.floors.forEach((floor: any) => {
        if (floor.rooms) {
          floor.rooms.forEach((room: any) => {
            if (room.beds) {
              pgBeds += room.beds.length;
            } else if (room.capacity) {
              pgBeds += room.capacity;
            }
          });
        }
      });
    }
    totalBeds += pgBeds;
  });

  // Gracefully handle cases where subscription or premiumFeatures might not exist
  const subscription = owner.subscription as Record<string, any> | undefined;
  const premiumFeatures = (subscription?.premiumFeatures || {}) as PremiumFeatures;
  const isSubscribed = subscription?.status === 'active' || subscription?.status === 'trialing' || subscription?.status === 'restricted';

  // Use owner-specific billing config if set by admin, else defaults
  const billingConfig = owner.billingConfig;
  
  // Per-tenant fee based on plan type
  let perTenantFee = PRICING_CONFIG.perTenant;
  if ((billingConfig?.planType as any) === 'yearly') perTenantFee = PRICING_CONFIG.yearly.perTenant;
  else if ((billingConfig?.planType as any) === 'sixMonth') perTenantFee = PRICING_CONFIG.sixMonth.perTenant;
  else if (billingConfig?.planType === 'monthly') perTenantFee = PRICING_CONFIG.monthly.perTenant;

  // Admin Override
  if (billingConfig?.perTenantFee !== undefined) perTenantFee = billingConfig.perTenantFee;
  
  const baseFee = billingConfig?.baseFee ?? PRICING_CONFIG.baseFee;
  const discount = billingConfig?.discount;

  const calculateCycleDetails = (features: PremiumFeatures): BillingCycleDetails => {
    const propertyCharge = isSubscribed ? baseFee : 0;
    const tenantCharge = isSubscribed ? billableTenantCount * perTenantFee : 0;

    let premiumCharge = 0;
    const premiumDetails: BillingCycleDetails['premiumFeaturesDetails'] = {};

    if (isSubscribed) {
      for (const [key, config] of Object.entries(PRICING_CONFIG.premiumFeatures)) {
        const featureKey = key as keyof PremiumFeatures;
        if (features[featureKey]?.enabled) {
          const configCharge = config.billingType === 'monthly' 
            ? (config.monthlyCharge || 0)
            : (billableTenantCount * (config.perTenantCharge || 0));
          
          const charge = isNaN(configCharge) ? 0 : configCharge;
          let description = `${config.name}`;

          if (config.billingType === 'monthly') {
            description = config.name;
          } else if (config.billingType === 'per_tenant') {
            description = `${config.name} (${billableTenantCount} tenants × ₹${config.perTenantCharge || 0})`;
          }

          premiumCharge += charge;
          premiumDetails[key] = { charge, description };
        }
      }
    }

    const rawTotal = (propertyCharge || 0) + (tenantCharge || 0) + (premiumCharge || 0);
    const safeRawTotal = isNaN(rawTotal) ? 0 : rawTotal;
    const { discountedAmount, discountValue } = applyDiscount(safeRawTotal, propertyCharge || 0, tenantCharge || 0, discount);

    return {
      totalAmount: discountedAmount,
      propertyCharge, 
      tenantCharge,
      tenantCount: billableTenantCount,
      perTenantFee,
      premiumFeaturesCharge: premiumCharge,
      premiumFeaturesDetails: premiumDetails,
      discountAmount: discountValue,
      discountDetails: discount || undefined,
    };
  };

  const currentCycle = calculateCycleDetails(premiumFeatures);
  const nextCycleEstimate = calculateCycleDetails(premiumFeatures);

  return {
    currentCycle,
    nextCycleEstimate,
    details: {
      propertyCount,
      billableTenantCount,
      totalBeds,
      billableTenantNames: [], // Can be populated if needed
      pricingConfig: PRICING_CONFIG as any,
    }
  };
}



export async function getBillingDetails(ownerId: string): Promise<{ success: boolean; data?: BillingDetails; error?: string }> {
  const adminDb = await getAdminDb();
  try {
    const ownerDoc = await adminDb.collection('users').doc(ownerId).get();
    if (!ownerDoc.exists) {
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
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
  try {
    const BASE_PLAN_ID = process.env.RAZORPAY_BASE_PLAN_ID || 'plan_base_monthly';
    // Check if the base plan exists on Razorpay
    try {
      await razorpay.plans.fetch(BASE_PLAN_ID);
    } catch (fetchError: any) {
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
    // Use Admin SDK syntax: adminDb.doc() not client SDK doc()
    await adminDb.doc(`users/${userId}`).update({
      'subscription.status': 'active',
      'subscription.planId': 'pro',
      'subscription.razorpay_subscription_id': razorpay_subscription_id,
      'subscription.razorpay_payment_id': razorpay_payment_id,
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating user subscription:", error);
    return { success: false, error: 'Failed to update subscription status in our system.' };
  }
}

