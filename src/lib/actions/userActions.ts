
'use server'

import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { PremiumFeatures } from '../types'

interface ToggleFeatureParams {
    userId: string;
    feature: keyof PremiumFeatures;
    enabled: boolean;
}

// This is now a pure server action that only updates the database.
// The Redux thunk in userSlice will handle the business logic and state updates.
export async function togglePremiumFeature({ userId, feature, enabled }: ToggleFeatureParams) {
    try {
        if(!db) throw new Error("Database not connected");

        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            throw new Error("User not found.");
        }

        const subscription = userDoc.data()?.subscription || {};
        
        // Cannot enable features if not subscribed (and not in trial)
        if (enabled && subscription.status !== 'active' && subscription.status !== 'trialing') {
            throw new Error("You must have an active subscription to enable premium features.");
        }
        
        await updateDoc(userDocRef, {
            [`subscription.premiumFeatures.${feature}.enabled`]: enabled
        });

        const updatedDoc = await getDoc(userDocRef);
        const updatedUser = updatedDoc.data();

        return { success: true, updatedUser };
    } catch (error: any) {
        console.error("Error toggling premium feature:", error);
        throw error;
    }
}
