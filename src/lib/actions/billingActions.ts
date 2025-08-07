
'use server'

import { getAdminDb } from '../firebaseAdmin';
import type { User, PG, Guest, PremiumFeatures } from '../types';
import { calculateAndCreateAddons } from './subscriptionActions';

const PRICING_CONFIG = {
    perProperty: 100, // Base charge per property
    perTenant: 10, // Charge for each tenant
    freeTenantQuota: 10, // Free tenants before charging begins
    premiumFeatures: {
        website: {
            monthlyCharge: 20, // Flat monthly fee
        },
        kyc: {
            // This might be per-verification in a real scenario, but for simplicity, we'll do a flat fee if enabled.
            // Let's assume for now it's part of a "Pro" bundle.
            monthlyCharge: 50,
        },
        whatsapp: {
            perTenantCharge: 30, // Per-tenant charge for WhatsApp services
        }
    }
};

export interface BillingDetails {
    totalAmount: number;
    details: {
        propertyCount: number;
        tenantCount: number;
        billableTenantCount: number;
        freeTenantQuota: number;
        enabledPremiumFeatures: PremiumFeatures;
        propertyCharge: number;
        tenantCharge: number;
        premiumFeaturesCharge: number;
        premiumFeaturesDetails: Record<string, { charge: number; description: string; }>;
        pricingConfig: typeof PRICING_CONFIG;
    };
}


export async function calculateOwnerBill(owner: User): Promise<BillingDetails> {
    const adminDb = await getAdminDb();

    // Fetch active properties
    const pgsSnapshot = await adminDb
        .collection('users_data')
        .doc(owner.id)
        .collection('pgs')
        .get();

    const activeProperties = pgsSnapshot.docs.map(doc => doc.data() as PG);

    // Fetch active tenants
    const guestsSnapshot = await adminDb
        .collection('users_data')
        .doc(owner.id)
        .collection('guests')
        .where('isVacated', '==', false)
        .get();

    const activeTenants = guestsSnapshot.docs.map(doc => doc.data() as Guest);
    const billableTenants = Math.max(0, activeTenants.length - PRICING_CONFIG.freeTenantQuota);

    // Calculate base charges
    const propertyCharge = activeProperties.length * PRICING_CONFIG.perProperty;
    const tenantCharge = billableTenants * PRICING_CONFIG.perTenant;

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
    const totalAmount = propertyCharge + tenantCharge + totalPremiumFeaturesCharge;

    return {
        totalAmount,
        details: {
            propertyCount: activeProperties.length,
            tenantCount: activeTenants.length,
            billableTenantCount: billableTenants,
            freeTenantQuota: PRICING_CONFIG.freeTenantQuota,
            enabledPremiumFeatures: enabledFeatures,
            propertyCharge,
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
