
'use server'

import { getAdminDb } from '../firebaseAdmin';
import type { User, PremiumFeatures, BillingDetails, BillingCycleDetails } from '../types';
import { PRICING_CONFIG } from '../mock-data';


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

    const calculateCycleDetails = (features: PremiumFeatures | undefined): BillingCycleDetails => {
        const propertyCharge = propertyCount * PRICING_CONFIG.perProperty;
        const tenantCharge = billableTenantCount * PRICING_CONFIG.perTenant;

        let premiumCharge = 0;
        const premiumDetails: BillingCycleDetails['premiumFeaturesDetails'] = {};

        // Safely iterate over premium features, even if the features object is undefined
        if (features) {
            for (const [key, config] of Object.entries(PRICING_CONFIG.premiumFeatures)) {
                const featureKey = key as keyof PremiumFeatures;
                if (features[featureKey]?.enabled) {
                    let charge = 0;
                    let description = `${config.name}`;

                    if (config.billingType === 'monthly') {
                        charge = config.monthlyCharge;
                        description = `${config.name} (${billableTenantCount} tenants × ₹0)`; // Clarify flat fee
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

    // For current cycle, we use all features that were ever enabled during the cycle.
    // This is a simplified model. A real system would track usage more granularly.
    // We assume any feature object present was used.
    const currentCycleFeatures = owner.subscription?.premiumFeatures || {};
    
    // For next cycle, it's based on what is currently enabled.
    const nextCycleFeatures = owner.subscription?.premiumFeatures || {};
    
    const currentCycle = calculateCycleDetails(currentCycleFeatures);
    const nextCycleEstimate = calculateCycleDetails(nextCycleFeatures);

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
