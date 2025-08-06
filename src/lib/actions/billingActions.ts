
'use server'

import { getAdminDb } from '../firebaseAdmin';
import type { User, PG, Guest, PremiumFeatures } from '../types';
import { calculateAndCreateAddons } from './subscriptionActions';

const PRICING_CONFIG = {
    perProperty: 100,
    perTenant: 10,
    freeTenantQuota: 10,
    premiumFeatures: {
        website: {
            monthlyCharge: 20
        },
        whatsapp: {
            perTenantCharge: 30
        },
        // Future features can be added here
    }
};

async function processOwnerBilling(owner: User): Promise<boolean> {
    const adminDb = await getAdminDb();
    const { id: ownerId, subscription } = owner;

    if (!subscription?.razorpay_subscription_id) {
        console.log(`Skipping owner ${ownerId}: no subscription ID.`);
        return false;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const idempotencyKey = `billing-addon-${year}-${month}`;

    const billingRecordRef = adminDb
        .collection('users_data')
        .doc(ownerId)
        .collection('billing')
        .doc(idempotencyKey);

    const billingRecordSnap = await billingRecordRef.get();

    if (billingRecordSnap.exists && billingRecordSnap.data()?.status === 'created') {
        console.log(`Skipping owner ${ownerId}: already billed for ${year}-${month}.`);
        return false;
    }

    try {
        const { totalAmount, details } = await calculateOwnerBill(owner);

        if (totalAmount === 0) {
            console.log(`Skipping owner ${ownerId}: billing amount is zero.`);
            await billingRecordRef.set({
                id: idempotencyKey,
                ownerId,
                status: 'skipped_zero_amount',
                amount: 0,
                details,
                createdAt: new Date().toISOString(),
            }, { merge: true });
            return true;
        }

        const addonResult = await calculateAndCreateAddons(
            subscription.razorpay_subscription_id,
            `Monthly Charge (${year}-${month})`,
            totalAmount,
            idempotencyKey
        );

        if (!addonResult?.success || !addonResult?.addon?.id) {
            throw new Error(addonResult?.error || 'Addon creation failed');
        }

        await billingRecordRef.set({
            id: idempotencyKey,
            ownerId,
            status: 'created',
            amount: totalAmount,
            details,
            razorpay_addon_id: addonResult.addon.id,
            createdAt: new Date().toISOString(),
        }, { merge: true });

        console.log(`Successfully created addon for owner ${ownerId} for amount ₹${totalAmount}.`);
        return true;
    } catch (error: any) {
        console.error(`Failed to process billing for owner ${ownerId}:`, error);
        await billingRecordRef.set({
            id: idempotencyKey,
            ownerId,
            status: 'failed',
            error: error.message,
            retries: (billingRecordSnap.data()?.retries || 0) + 1,
            failedAt: new Date().toISOString(),
        }, { merge: true });
        return false;
    }
}

export async function calculateOwnerBill(owner: User) {
    const adminDb = await getAdminDb();

    const pgsSnapshot = await adminDb
        .collection('users_data')
        .doc(owner.id)
        .collection('pgs')
        .get();

    const activeProperties = pgsSnapshot.docs.map(doc => doc.data() as PG);

    const guestsSnapshot = await adminDb
        .collection('users_data')
        .doc(owner.id)
        .collection('guests')
        .where('isVacated', '==', false)
        .get();

    const activeTenants = guestsSnapshot.docs.map(doc => doc.data() as Guest);
    const billableTenants = Math.max(0, activeTenants.length - PRICING_CONFIG.freeTenantQuota);

    const propertyCharge = activeProperties.length * PRICING_CONFIG.perProperty;
    const tenantCharge = billableTenants * PRICING_CONFIG.perTenant;

    let totalPremiumFeaturesCharge = 0;
    const premiumFeaturesDetails: Record<string, number> = {};

    const enabledFeatures = owner.subscription?.premiumFeatures || {};

    if (enabledFeatures.website?.enabled) {
        const charge = PRICING_CONFIG.premiumFeatures.website.monthlyCharge;
        premiumFeaturesDetails['website'] = charge;
        totalPremiumFeaturesCharge += charge;
    }
    if (enabledFeatures.whatsapp?.enabled) {
        const charge = activeTenants.length * PRICING_CONFIG.premiumFeatures.whatsapp.perTenantCharge;
        premiumFeaturesDetails['whatsapp'] = charge;
        totalPremiumFeaturesCharge += charge;
    }
    
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

export async function testOwnerBilling(ownerId: string) {
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
        console.error('Error in testOwnerBilling:', error);
        return { success: false, error: error.message };
    }
}
