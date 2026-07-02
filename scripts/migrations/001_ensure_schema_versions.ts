/**
 * Migration: 001_ensure_schema_versions
 * Description: Scans all core collections (guests, pgs, complaints) under each user
 * and ensures they have a `schemaVersion` attached.
 * 
 * Execution tracking: Stores execution record in `system_migrations` collection.
 */

import * as admin from 'firebase-admin';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import type { MigrationResult } from './runner';

// Note: Ensure you have FIREBASE_SERVICE_ACCOUNT_KEY or service-account.json 
// accessible before running this script via ts-node.

export const targetVersion = 1;
export const collection = 'users';
export const description = 'Ensures core collections under each user have a schemaVersion field.';

export const up = async (db: admin.firestore.Firestore, isDryRun: boolean = false): Promise<MigrationResult> => {
  const MIGRATION_NAME = '001_ensure_schema_versions';
  const migrationRef = db.collection('system_migrations').doc(MIGRATION_NAME);

  const migrationDoc = await migrationRef.get();
  if (migrationDoc.exists) {
    console.log(`Migration ${MIGRATION_NAME} already executed. Skipping.`);
    return { scanned: 0, updated: 0, errors: 0 };
  }

  console.log(`Starting migration: ${MIGRATION_NAME}...`);

  // We need to iterate over all users first, since our DB is multi-tenant by user ID
  const usersSnapshot = await db.collection('users').get();
  let totalUpdated = 0;
  let totalScanned = 0;

  for (const userDoc of usersSnapshot.docs) {
    const ownerId = userDoc.id;
    console.log(`Processing owner: ${ownerId}`);

    // Core Collections to migrate
    const collectionsToMigrate = ['guests', 'pgs', 'complaints', 'payments', 'expenses'];

    for (const collName of collectionsToMigrate) {
      const collRef = db.collection(`users/${ownerId}/${collName}`);
      const snapshot = await collRef.get();

      const batch = db.batch();
      let batchCount = 0;

      for (const doc of snapshot.docs) {
        totalScanned++;
        const data = doc.data();
        if (data.schemaVersion === undefined) {
          if (!isDryRun) {
            batch.update(doc.ref, {
              schemaVersion: 1, // Default baseline schema
              updatedAt: new Date().toISOString()
            });
          }
          batchCount++;
          totalUpdated++;
        }

        // Firestore batches can hold up to 500 operations
        if (batchCount >= 450) {
          if (!isDryRun) {
            await batch.commit();
          }
          batchCount = 0;
        }
      }

      if (batchCount > 0 && !isDryRun) {
        await batch.commit();
      }
    }
  }

  // Mark migration as completed
  if (!isDryRun) {
    await migrationRef.set({
      name: MIGRATION_NAME,
      executedAt: new Date().toISOString(),
      updatedRecords: totalUpdated
    });
  }

  console.log(`Migration ${MIGRATION_NAME} completed successfully. Total records updated: ${totalUpdated}`);
  return { scanned: totalScanned, updated: totalUpdated, errors: 0 };
};

export const down = async (): Promise<MigrationResult> => ({ scanned: 0, updated: 0, errors: 0 });

async function runMigration() {
  const serviceAccountPath = path.resolve(__dirname, '../../service-account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('Migration aborted: service-account.json not found in root.');
    process.exit(1);
  }

  const serviceAccount = require(serviceAccountPath);

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  const db = getFirestore();
  return up(db, false);
}

// Execute if run directly
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
