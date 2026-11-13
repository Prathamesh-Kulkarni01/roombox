import { PRICING_CONFIG } from '../../src/lib/constants';
import * as admin from 'firebase-admin';

export const targetVersion = 10;
export const collection = 'users';

/**
 * Migration 010: Harden Billing Ledger
 * 
 * Ensures all owners have schemaVersion 10 and initialized billingConfig.
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
            
            // Only update if schema version is less than 10
            if ((userData.schemaVersion || 0) >= targetVersion) {
                continue;
            }

            const updates: Record<string, any> = {
                schemaVersion: targetVersion,
                updatedAt: now.toISOString()
            };

            // Initialize billingConfig if missing
            if (!userData.billingConfig) {
                updates.billingConfig = {
                    planType: 'trial',
                    baseFee: PRICING_CONFIG.baseFee,
                    perTenantFee: PRICING_CONFIG.monthly.perTenant,
                    lastBilledAt: null,
                    nextBillingDate: null
                };
            }

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
