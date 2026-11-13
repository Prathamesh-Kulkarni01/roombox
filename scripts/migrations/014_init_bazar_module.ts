import * as admin from 'firebase-admin';
import type { MigrationResult } from './runner';

export const targetVersion = 14;

/**
 * Migration 004: Initialize Palus Local Bazar namespaced collections and schema markers
 * 
 * Strict Database Rules Followed:
 * 1. Does not modify or rename existing 'owners', 'properties', 'rooms', 'tenants', 'payments'
 * 2. Uses namespaced collections 'bazar_stores', 'bazar_products', 'bazar_orders'
 * 3. Enforces schemaVersion: 1 for Bazar
 * 4. Safe defaults on read/write
 */
export async function up(db: admin.firestore.Firestore, isDryRun?: boolean): Promise<MigrationResult> {
  const result: MigrationResult = { scanned: 0, updated: 0, errors: 0 };

  console.log(`[Migration 004] Verifying and setting up Bazar namespace collections...`);

  // Ensure 'bazar_stores' index/metadata doc exists without impacting other data
  const metaDocRef = db.collection('bazar_stores').doc('_metadata');
  result.scanned++;

  const snap = await metaDocRef.get();
  if (!snap.exists) {
    if (!isDryRun) {
      await metaDocRef.set({
        initialized: true,
        schemaVersion: 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        description: 'Namespace marker for Palus Local Bazar module'
      });
    }
    result.updated++;
  }

  return result;
}

export async function down(db: admin.firestore.Firestore, isDryRun?: boolean): Promise<MigrationResult> {
  const result: MigrationResult = { scanned: 0, updated: 0, errors: 0 };
  const metaDocRef = db.collection('bazar_stores').doc('_metadata');
  const snap = await metaDocRef.get();
  if (snap.exists) {
    if (!isDryRun) {
      await metaDocRef.delete();
    }
    result.updated++;
  }
  return result;
}

