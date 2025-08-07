
'use server'

import { getAdminDb } from '../firebaseAdmin';
import type { User, PG, Guest, PremiumFeatures } from '../types';

// Centralized pricing configuration
export const PRICING_CONFIG = {
    perTenant: 20, // ₹20 per tenant per month
    premiumFeatures: {
        website: {
            monthlyCharge: 20, // Flat monthly fee
            billingType: 'monthly' as const,
        },
        kyc: {
            monthlyCharge: 50, // Flat monthly fee for KYC access
            billingType: 'monthly' as const,
        },
        whatsapp: {
            perTenantCharge: 30, // Per-tenant charge for WhatsApp services
            billingType: 'per_tenant' as const,
        }
    }
};

export interface BillingDetails {
    totalAmount: number;
    details: {
        tenantCount: number;
        tenantCharge: number;
        premiumFeaturesCharge: number;
        premiumFeaturesDetails: Record<string, { charge: number; description: string; }>;
        pricingConfig: typeof PRICING_CONFIG;
    };
}


export async function calculateOwnerBill(owner: User): Promise<BillingDetails> {
    const adminDb = await getAdminDb();

    // Fetch active tenants, as they are the primary driver of usage
    const guestsSnapshot = await adminDb
        .collection('users_data')
        .doc(owner.id)
        .collection('guests')
        .where('isVacated', '==', false)
        .get();

    const activeTenants = guestsSnapshot.docs.map(doc => doc.data() as Guest);

    // Calculate base tenant charge
    const tenantCharge = activeTenants.length * PRICING_CONFIG.perTenant;

    // Calculate premium feature charges
    let totalPremiumFeaturesCharge = 0;
    const premiumFeaturesDetails: Record<string, { charge: number, description: string }> = {};
    const enabledFeatures = owner.subscription?.premiumFeatures || {};

    if (enabledFeatures.website?.enabled) {
        const charge = PRICING_CONFIG.premiumFeatures.website.monthlyCharge;
        premiumFeaturesDetails['website'] = { charge, description: `Website Builder @ ₹${charge}/mo` };
        totalPremiumFeaturesCharge += charge;
    }
    if (enabledFeatures.kyc?.enabled) {
        const charge = PRICING_CONFIG.premiumFeatures.kyc.monthlyCharge;
        premiumFeaturesDetails['kyc'] = { charge, description: `Automated KYC @ ₹${charge}/mo` };
        totalPremiumFeaturesCharge += charge;
    }
    if (enabledFeatures.whatsapp?.enabled) {
        const charge = activeTenants.length * PRICING_CONFIG.premiumFeatures.whatsapp.perTenantCharge;
        premiumFeaturesDetails['whatsapp'] = { charge, description: `${activeTenants.length} tenants x ₹${PRICING_CONFIG.premiumFeatures.whatsapp.perTenantCharge} for WhatsApp` };
        totalPremiumFeaturesCharge += charge;
    }
    
    // Calculate total bill
    const totalAmount = tenantCharge + totalPremiumFeaturesCharge;

    return {
        totalAmount,
        details: {
            tenantCount: activeTenants.length,
            tenantCharge,
            premiumFeaturesCharge: totalPremiumFeaturesCharge,
            premiumFeaturesDetails,
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
