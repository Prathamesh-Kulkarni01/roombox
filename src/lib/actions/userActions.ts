
'use server'

import { getAdminDb } from '../firebaseAdmin'
import type { PremiumFeatures } from '../types'

interface ToggleFeatureParams {
    userId: string;
    feature: keyof PremiumFeatures;
    enabled: boolean;
}

// This is now a pure server action that only updates the database using ADMIN SDK to bypass rules.
export async function togglePremiumFeature({ userId, feature, enabled }: ToggleFeatureParams) {
    try {
        const adminDb = await getAdminDb();
        const userDocRef = adminDb.collection('users').doc(userId);
        const userDoc = await userDocRef.get();

        if (!userDoc.exists) {
            throw new Error("User not found.");
        }

        const subscription = userDoc.data()?.subscription || {};

        // Cannot enable features if not subscribed (and not in trial)
        if (enabled && subscription.status !== 'active' && subscription.status !== 'trialing') {
            throw new Error("You must have an active subscription to enable premium features.");
        }

        await userDocRef.update({
            [`subscription.premiumFeatures.${feature}.enabled`]: enabled,
            updatedAt: new Date().toISOString()
        });

        const updatedDoc = await userDocRef.get();
        const updatedUser = updatedDoc.data();

        return { success: true, updatedUser: JSON.parse(JSON.stringify(updatedUser)) };
    } catch (error: any) {
        console.error("Error toggling premium feature:", error);
        throw error;
    }
}

export async function fetchUserData(userId: string) {
    try {
        const adminDb = await getAdminDb();
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (!userDoc.exists) throw new Error("User not found");
        return { success: true, user: JSON.parse(JSON.stringify(userDoc.data())) };
    } catch (error: any) {
        console.error("Error fetching user data:", error);
        return { success: false, error: error.message };
    }
}
