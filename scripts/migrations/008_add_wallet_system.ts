import { PRICING_CONFIG } from '../../src/lib/constants';
import { CURRENT_SCHEMA_VERSION } from '../../src/lib/types';
import * as admin from 'firebase-admin';

export const targetVersion = 8;
export const collection = 'users';

export async function up(db: admin.firestore.Firestore, isDryRun: boolean = false) {
  // Get all users with role 'owner'
  const usersSnapshot = await db
    .collection('users')
    .where('role', '==', 'owner')
    .get();

  let updated = 0;
  let scanned = 0;
  let errors = 0;

  for (const doc of usersSnapshot.docs) {
    scanned++;
    try {
      const userData = doc.data();
      const updates: Record<string, any> = {};

      // Only update if schema version is less than current
      if ((userData.schemaVersion ?? 0) >= targetVersion) {
        continue;
      }

      // Add wallet if missing
      if (!userData.wallet) {
        updates['wallet'] = {
          balance: 0,
          lastRechargeAt: null,
          lastRechargeAmount: null,
        };
      }

      // Add billing config if missing
      if (!userData.billingConfig) {
        const isTrialing = userData.subscription?.status === 'trialing';
        const isActive = userData.subscription?.status === 'active';

        updates['billingConfig'] = {
          planType: isTrialing ? 'trial' : (isActive ? 'monthly' : 'monthly'),
          baseFee: PRICING_CONFIG.baseFee,
          perTenantFee: PRICING_CONFIG.perTenant,
          discount: null,
          lastBilledAt: null,
          nextBillingDate: null,
        };
      }

      // Add trial tenant limit for trialing users
      if (userData.subscription?.status === 'trialing' && !userData.subscription?.trialTenantLimit) {
        updates['subscription.trialTenantLimit'] = PRICING_CONFIG.trial.maxTenants;
      }

      // Update schema version
      updates['schemaVersion'] = targetVersion;

      if (Object.keys(updates).length > 0) {
        if (!isDryRun) {
          await db.collection('users').doc(doc.id).update(updates);
        }
        updated++;
      }
    } catch (error: any) {
      errors++;
      console.error(`  ❌ Failed to update ${doc.id}:`, error.message);
    }
  }

  return { scanned, updated, errors };
}

