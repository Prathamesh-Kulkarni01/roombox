
'use server'

import { getAdminDb } from '../firebaseAdmin';
import type { User, PremiumFeatures } from '../types';
import { PRICING_CONFIG } from '../mock-data';

export interface BillingCycleDetails {
    totalAmount: number;
    propertyCharge: number;
    tenantCharge: number;
    premiumFeaturesCharge: number;
    premiumFeaturesDetails: Record<string, { charge: number; description: string }>;
}

export interface BillingDetails {
    currentCycle: BillingCycleDetails;
    nextCycleEstimate: BillingCycleDetails;
    details: {
        propertyCount: number;
        billableTenantCount: number;
        pricingConfig: typeof PRICING_CONFIG;
    };
}


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

    // --- Calculate Next Cycle's Estimated Bill ---
    const nextCyclePropertyCharge = propertyCount * PRICING_CONFIG.perProperty;
    const nextCycleTenantCharge = billableTenantCount * PRICING_CONFIG.perTenant;

    let nextCyclePremiumCharge = 0;
    const nextCycleFeaturesDetails: Record<string, { charge: number; description: string; }> = {};
    const currentFeatures = owner.subscription?.premiumFeatures || {};
    
    // Logic for next cycle is based on what is currently ENABLED
    for (const [key, config] of Object.entries(PRICING_CONFIG.premiumFeatures)) {
        if (currentFeatures[key as keyof PremiumFeatures]?.enabled) {
            let charge = 0;
            if (config.billingType === 'monthly') {
                charge = config.monthlyCharge;
            } else if (config.billingType === 'per_tenant') {
                charge = billableTenantCount * config.perTenantCharge;
            }
            nextCyclePremiumCharge += charge;
            nextCycleFeaturesDetails[key] = { charge, description: `${config.name}` };
        }
    }
    const nextCycleTotal = nextCyclePropertyCharge + nextCycleTenantCharge + nextCyclePremiumCharge;

    // --- Calculate Current Cycle's Bill ---
    // For the current cycle, we assume any feature that was ever enabled is billed for the full cycle.
    // A more complex system could prorate, but for now, we bill if it was used.
    // This logic is simplified here; a real system might check historical usage flags.
    // For this implementation, we'll assume the current cycle bill is the same as the next cycle estimate
    // as we don't track historical feature usage within the cycle.
    const currentCycleDetails = {
        totalAmount: nextCycleTotal,
        propertyCharge: nextCyclePropertyCharge,
        tenantCharge: nextCycleTenantCharge,
        premiumFeaturesCharge: nextCyclePremiumCharge,
        premiumFeaturesDetails: nextCycleFeaturesDetails,
    };

    return {
        currentCycle: currentCycleDetails,
        nextCycleEstimate: {
             totalAmount: nextCycleTotal,
            propertyCharge: nextCyclePropertyCharge,
            tenantCharge: nextCycleTenantCharge,
            premiumFeaturesCharge: nextCyclePremiumCharge,
            premiumFeaturesDetails: nextCycleFeaturesDetails,
        },
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
