
'use server'

import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { PremiumFeatures } from '../types'

interface ToggleFeatureParams {
    userId: string;
    feature: keyof PremiumFeatures;
    enabled: boolean;
}

export async function togglePremiumFeature({ userId, feature, enabled }: ToggleFeatureParams) {
    try {
        if(!db) throw new Error("Database not connected");

        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            return { success: false, error: "User not found." };
        }

        const subscription = userDoc.data()?.subscription || {};
        
        // Cannot enable features if not subscribed (and not in trial)
        if (enabled && subscription.status !== 'active' && subscription.status !== 'trialing') {
            return { success: false, error: "You must have an active subscription to enable premium features." };
        }
        
        await updateDoc(userDocRef, {
            [`subscription.premiumFeatures.${feature}.enabled`]: enabled
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error toggling premium feature:", error);
        return { success: false, error: error.message || "An unexpected error occurred." };
    }
}
