
'use server'

import { collection, getDocs, query, where, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAdminDb } from '../firebaseAdmin';
import type { User, PG, Guest } from '../types';
import { createRazorpayAddon } from './subscriptionActions';

// --- Pricing Configuration ---
const PRICING_CONFIG = {
    perProperty: 100, // ₹100 per property per month
    perTenant: 10,   // ₹10 per tenant per month (reduced from 200 for scalability)
    perFeature: 150, // ₹150 per enabled "premium" feature
};

// --- Main Billing Logic ---
export async function calculateAndCreateAddons() {
    const adminDb = getAdminDb();
    let processedCount = 0;
    try {
        // 1. Fetch all subscribed owners
        const ownersQuery = query(
            collection(adminDb, 'users'),
            where('role', '==', 'owner'),
            where('subscription.status', '==', 'active')
        );
        const ownersSnapshot = await getDocs(ownersQuery);

        if (ownersSnapshot.empty) {
            console.log('No active owners found to bill.');
            return { success: true, processedCount: 0 };
        }

        // 2. Process each owner in a batch
        const billingPromises = ownersSnapshot.docs.map(ownerDoc => 
            processOwnerBilling(ownerDoc.data() as User)
        );

        const results = await Promise.allSettled(billingPromises);
        
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                processedCount++;
            }
        });

        return { success: true, processedCount };

    } catch (error: any) {
        console.error('Error in calculateAndCreateAddons:', error);
        return { success: false, error: error.message, processedCount };
    }
}

/**
 * Processes billing for a single owner.
 * This function is idempotent for the current month.
 */
async function processOwnerBilling(owner: User): Promise<boolean> {
    const adminDb = getAdminDb();
    const { id: ownerId, subscription } = owner;

    if (!subscription || !subscription.razorpay_subscription_id) {
        console.log(`Skipping owner ${ownerId}: no subscription ID.`);
        return false;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    const idempotencyKey = `billing-addon-${year}-${month}`;
    
    // 3. Idempotency Check: See if we've already billed for this month
    const billingRecordRef = doc(adminDb, 'users_data', ownerId, 'billing', idempotencyKey);
    const billingRecordSnap = await getDoc(billingRecordRef);

    if (billingRecordSnap.exists() && billingRecordSnap.data().status === 'created') {
        console.log(`Skipping owner ${ownerId}: already billed for ${year}-${month}.`);
        return false;
    }
    
    try {
        // 4. Calculate Billing Amount
        const { totalAmount, details } = await calculateOwnerBill(owner);

        // Don't create an addon if the amount is zero
        if (totalAmount === 0) {
            console.log(`Skipping owner ${ownerId}: billing amount is zero.`);
            await setDoc(billingRecordRef, {
                id: idempotencyKey,
                ownerId,
                status: 'skipped_zero_amount',
                amount: 0,
                details,
                createdAt: new Date().toISOString(),
            });
            return true;
        }

        // 5. Create Razorpay Addon
        const addonResult = await createRazorpayAddon(
            subscription.razorpay_subscription_id,
            `Monthly Charge (${year}-${month})`,
            totalAmount,
            idempotencyKey // Use our key as the addon item name for Razorpay's idempotency
        );
        
        if (!addonResult.success || !addonResult.addon) {
            throw new Error(addonResult.error || 'Addon creation failed');
        }

        // 6. Log success in DB
        await setDoc(billingRecordRef, {
            id: idempotencyKey,
            ownerId,
            status: 'created',
            amount: totalAmount,
            details,
            razorpay_addon_id: addonResult.addon.id,
            createdAt: new Date().toISOString(),
        });

        console.log(`Successfully created addon for owner ${ownerId} for amount ₹${totalAmount}.`);
        return true;

    } catch (error: any) {
        console.error(`Failed to process billing for owner ${ownerId}:`, error);
        // Log failure for potential retry
        await setDoc(billingRecordRef, {
            id: idempotencyKey,
            ownerId,
            status: 'failed',
            error: error.message,
            retries: (billingRecordSnap.data()?.retries || 0) + 1,
            failedAt: new Date().toISOString(),
        });
        return false;
    }
}

/**
 * Calculates the total billable amount for an owner for the current cycle.
 */
export async function calculateOwnerBill(owner: User) {
    const adminDb = getAdminDb();
    const pgsSnapshot = await getDocs(collection(adminDb, 'users_data', owner.id, 'pgs'));
    const activeProperties = pgsSnapshot.docs.map(doc => doc.data() as PG);

    const guestsSnapshot = await getDocs(collection(adminDb, 'users_data', owner.id, 'guests'));
    const activeTenants = guestsSnapshot.docs.filter(doc => !(doc.data() as Guest).isVacated);

    // Feature calculation can be expanded here
    const enabledFeaturesCount = (owner.subscription?.planId === 'pro' || owner.subscription?.planId === 'business' || owner.subscription?.planId === 'enterprise') ? 2 : 0; // Simplified logic

    const propertyCharge = activeProperties.length * PRICING_CONFIG.perProperty;
    const tenantCharge = activeTenants.length * PRICING_CONFIG.perTenant;
    const featureCharge = enabledFeaturesCount * PRICING_CONFIG.perFeature;

    const totalAmount = propertyCharge + tenantCharge + featureCharge;

    return {
        totalAmount,
        details: {
            propertyCount: activeProperties.length,
            tenantCount: activeTenants.length,
            featureCount: enabledFeaturesCount,
            propertyCharge,
            tenantCharge,
            featureCharge,
            pricingConfig: PRICING_CONFIG,
        }
    };
}


// --- Test Function ---
export async function testOwnerBilling(ownerId: string) {
    const adminDb = getAdminDb();
    try {
        const ownerDoc = await getDoc(doc(adminDb, 'users', ownerId));
        if (!ownerDoc.exists()) {
            return { success: false, error: "Owner not found." };
        }
        const owner = ownerDoc.data() as User;
        const billingData = await calculateOwnerBill(owner);
        return { success: true, data: billingData };
    } catch (error: any) {
        console.error('Error in testOwnerBilling:', error);
        return { success: false, error: error.message };
    }
}
