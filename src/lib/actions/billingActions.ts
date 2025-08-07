
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

    const calculateCycleDetails = (features: PremiumFeatures): BillingCycleDetails => {
        const propertyCharge = propertyCount * PRICING_CONFIG.perProperty;
        const tenantCharge = billableTenantCount * PRICING_CONFIG.perTenant;

        let premiumCharge = 0;
        const premiumDetails: BillingCycleDetails['premiumFeaturesDetails'] = {};

        for (const [key, config] of Object.entries(PRICING_CONFIG.premiumFeatures)) {
            const featureKey = key as keyof PremiumFeatures;
            if (features[featureKey]?.enabled) {
                let charge = 0;
                let description = `${config.name}`;

                if (config.billingType === 'monthly') {
                    charge = config.monthlyCharge;
                    description = `${config.name} (Flat Fee)`;
                } else if (config.billingType === 'per_tenant') {
                    charge = billableTenantCount * config.perTenantCharge;
                    description = `${config.name} (${billableTenantCount} tenants × ₹${config.perTenantCharge})`;
                }

                premiumCharge += charge;
                premiumDetails[key] = { charge, description };
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
