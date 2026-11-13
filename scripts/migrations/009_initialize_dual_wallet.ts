import { PRICING_CONFIG } from '../../src/lib/constants';
import * as admin from 'firebase-admin';

export const targetVersion = 9;
export const collection = 'users';

/**
 * Migration 009: Initialize Dual Wallet System
 * 
 * This script initializes the new wallet structure for all owners:
 * - trialBalance: ₹500 (one-time credit)
 * - rechargeBalance: Existing balance (if any)
 * - dues: 0
 * - trialExpiresAt: 30 days from now (or from creation if available)
 * - schemaVersion: 9
 */
export async function up(db: admin.firestore.Firestore, isDryRun: boolean = false) {
    const usersSnapshot = await db.collection('users').where('role', '==', 'owner').get();
    
    let scanned = 0;
    let updated = 0;
    let errors = 0;
    const now = new Date();
    
    for (const doc of usersSnapshot.docs) {
        scanned++;
        try {
            const userData = doc.data();
            
            // Only update if schema version is less than 9
            if ((userData.schemaVersion || 0) >= targetVersion) {
                continue;
            }

            const existingBalance = userData.wallet?.balance || 0;
            
            // Calculate trial expiration (30 days from creation if possible, else from now)
            let trialExpiresAt: string;
            if (userData.createdAt) {
                const createdAtDate = typeof userData.createdAt === 'string' 
                    ? new Date(userData.createdAt) 
                    : new Date(userData.createdAt.seconds * 1000);
                trialExpiresAt = new Date(createdAtDate.getTime() + PRICING_CONFIG.trial.durationDays * 24 * 60 * 60 * 1000).toISOString();
            } else {
                trialExpiresAt = new Date(now.getTime() + PRICING_CONFIG.trial.durationDays * 24 * 60 * 60 * 1000).toISOString();
            }

            const newWallet = {
                trialBalance: PRICING_CONFIG.trial.credit,
                rechargeBalance: existingBalance,
                balance: PRICING_CONFIG.trial.credit + existingBalance, // Combined for legacy
                dues: 0,
                trialExpiresAt: trialExpiresAt,
                schemaVersion: targetVersion,
                updatedAt: now.toISOString()
            };

            const updates: Record<string, any> = {
                wallet: newWallet,
                schemaVersion: targetVersion
            };

            if (!isDryRun) {
                await doc.ref.update(updates);
            }
            updated++;
        } catch (error: any) {
            errors++;
            console.error(`  ❌ Failed to migrate owner ${doc.id}:`, error.message);
        }
    }
    
    return { scanned, updated, errors };
}
