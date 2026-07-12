'use server';

import { selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import type { Lease } from '@/lib/types';

const SCHEMA_VERSION = 1;

/**
 * Create a lease record for a guest (draft state).
 * This lays the foundation for digital leasing and e-signature integration.
 * When an external e-signature provider (e.g., DocuSign, HelloSign) is added,
 * it should update the `documentUrl` and `status` fields here.
 */
export async function createLease(
  ownerId: string,
  input: { guestId: string; pgId: string; documentUrl?: string }
): Promise<{ success: boolean; leaseId?: string; error?: string }> {
  try {
    const db = await selectOwnerDataAdminDb(ownerId);
    const ref = db
      .collection('users_data')
      .doc(ownerId)
      .collection('leases')
      .doc();

    const lease: Lease = {
      id: ref.id,
      guestId: input.guestId,
      pgId: input.pgId,
      documentUrl: input.documentUrl,
      status: 'draft',
      schemaVersion: SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await ref.set(lease);

    // Link the leaseId back to the guest document
    const guestRef = db
      .collection('users_data')
      .doc(ownerId)
      .collection('guests')
      .doc(input.guestId);
    await guestRef.update({ leaseAgreementId: ref.id });

    return { success: true, leaseId: ref.id };
  } catch (err: any) {
    console.error('[Lease] Failed to create lease:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get all leases for an owner.
 */
export async function getLeases(ownerId: string): Promise<Lease[]> {
  try {
    const db = await selectOwnerDataAdminDb(ownerId);
    const snap = await db
      .collection('users_data')
      .doc(ownerId)
      .collection('leases')
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((doc) => doc.data() as Lease);
  } catch (err: any) {
    console.error('[Lease] Failed to fetch leases:', err);
    return [];
  }
}

/**
 * Get a specific lease by its ID.
 */
export async function getLease(
  ownerId: string,
  leaseId: string
): Promise<Lease | null> {
  try {
    const db = await selectOwnerDataAdminDb(ownerId);
    const doc = await db
      .collection('users_data')
      .doc(ownerId)
      .collection('leases')
      .doc(leaseId)
      .get();
    return doc.exists ? (doc.data() as Lease) : null;
  } catch (err: any) {
    console.error('[Lease] Failed to fetch lease:', err);
    return null;
  }
}

/**
 * Update the lease status (e.g., from draft -> sent -> signed).
 * Intended to be called by e-signature webhook handlers in the future.
 */
export async function updateLeaseStatus(
  ownerId: string,
  leaseId: string,
  status: Lease['status'],
  eSignatureData?: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await selectOwnerDataAdminDb(ownerId);
    const ref = db
      .collection('users_data')
      .doc(ownerId)
      .collection('leases')
      .doc(leaseId);

    const update: Partial<Lease> & { updatedAt: string } = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (eSignatureData) {
      update.eSignatureData = eSignatureData;
    }

    await ref.update(update);
    return { success: true };
  } catch (err: any) {
    console.error('[Lease] Failed to update lease status:', err);
    return { success: false, error: err.message };
  }
}
