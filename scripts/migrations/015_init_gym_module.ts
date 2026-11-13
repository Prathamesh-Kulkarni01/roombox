import * as admin from 'firebase-admin';
import type { MigrationResult } from './runner';

export const targetVersion = 15;

/**
 * Migration 005: Initialize Gym module collections & metadata
 * 
 * Strict Database Rules:
 * - Does not touch existing RentSutra or Bazar collections.
 * - Namespaces collections as 'gym_members', 'gym_plans', 'gym_attendance'.
 * - Sets schemaVersion: 1 for the Gym module.
 */
export async function up(db: admin.firestore.Firestore, isDryRun?: boolean): Promise<MigrationResult> {
  const result: MigrationResult = { scanned: 0, updated: 0, errors: 0 };

  console.log(`[Migration 005] Initializing Gym domain namespace...`);
  const metaDocRef = db.collection('gym_plans').doc('_metadata');
  result.scanned++;

  const snap = await metaDocRef.get();
  if (!snap.exists) {
    if (!isDryRun) {
      await metaDocRef.set({
        initialized: true,
        schemaVersion: 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        description: 'Namespace marker for Pulse Gym & Fitness module'
      });
    }
    result.updated++;
  }

  return result;
}

export async function down(db: admin.firestore.Firestore, isDryRun?: boolean): Promise<MigrationResult> {
  const result: MigrationResult = { scanned: 0, updated: 0, errors: 0 };
  const metaDocRef = db.collection('gym_plans').doc('_metadata');
  const snap = await metaDocRef.get();
  if (snap.exists) {
    if (!isDryRun) {
      await metaDocRef.delete();
    }
    result.updated++;
  }
  return result;
}

