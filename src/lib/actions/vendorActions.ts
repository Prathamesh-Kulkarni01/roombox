'use server';

import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import type { Vendor } from '@/lib/types';

const SCHEMA_VERSION = 1;

/**
 * Add a new vendor (maintenance contractor) for an owner.
 */
export async function addVendor(
  ownerId: string,
  input: Omit<Vendor, 'id' | 'schemaVersion' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; vendorId?: string; error?: string }> {
  try {
    const db = await selectOwnerDataAdminDb(ownerId);
    const ref = db
      .collection('users_data')
      .doc(ownerId)
      .collection('vendors')
      .doc();

    const vendor: Vendor = {
      ...input,
      id: ref.id,
      ownerId,
      schemaVersion: SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await ref.set(vendor);
    return { success: true, vendorId: ref.id };
  } catch (err: any) {
    console.error('[Vendor] Failed to add vendor:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get all vendors for an owner.
 */
export async function getVendors(ownerId: string): Promise<Vendor[]> {
  try {
    const db = await selectOwnerDataAdminDb(ownerId);
    const snap = await db
      .collection('users_data')
      .doc(ownerId)
      .collection('vendors')
      .get();
    return snap.docs.map((doc) => doc.data() as Vendor);
  } catch (err: any) {
    console.error('[Vendor] Failed to fetch vendors:', err);
    return [];
  }
}

/**
 * Update a vendor's details.
 */
export async function updateVendor(
  ownerId: string,
  vendorId: string,
  updates: Partial<Omit<Vendor, 'id' | 'ownerId' | 'schemaVersion'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await selectOwnerDataAdminDb(ownerId);
    const ref = db
      .collection('users_data')
      .doc(ownerId)
      .collection('vendors')
      .doc(vendorId);

    await ref.update({ ...updates, updatedAt: new Date().toISOString() });
    return { success: true };
  } catch (err: any) {
    console.error('[Vendor] Failed to update vendor:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete a vendor.
 */
export async function deleteVendor(
  ownerId: string,
  vendorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await selectOwnerDataAdminDb(ownerId);
    await db
      .collection('users_data')
      .doc(ownerId)
      .collection('vendors')
      .doc(vendorId)
      .delete();
    return { success: true };
  } catch (err: any) {
    console.error('[Vendor] Failed to delete vendor:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Assign a vendor to a complaint (maintenance dispatching).
 */
export async function assignVendorToComplaint(
  ownerId: string,
  complaintId: string,
  vendorId: string,
  scheduledDate?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await selectOwnerDataAdminDb(ownerId);
    const ref = db
      .collection('users_data')
      .doc(ownerId)
      .collection('complaints')
      .doc(complaintId);

    await ref.update({
      vendorId,
      scheduledDate: scheduledDate ?? null,
      status: 'in-progress',
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (err: any) {
    console.error('[Vendor] Failed to assign vendor to complaint:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Log the vendor invoice after work is done.
 */
export async function logVendorInvoice(
  ownerId: string,
  complaintId: string,
  invoiceAmount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await selectOwnerDataAdminDb(ownerId);
    const ref = db
      .collection('users_data')
      .doc(ownerId)
      .collection('complaints')
      .doc(complaintId);

    await ref.update({
      invoiceAmount,
      invoiceStatus: 'pending',
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (err: any) {
    console.error('[Vendor] Failed to log vendor invoice:', err);
    return { success: false, error: err.message };
  }
}
