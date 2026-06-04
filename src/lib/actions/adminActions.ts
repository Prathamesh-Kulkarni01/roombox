'use server'

import * as Sentry from '@sentry/nextjs';

import { getAdminDb } from '../firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import type { User, PG, Guest, ActivityLog, Complaint, AdminAuditLog } from '../types';
import { writeAdminAudit, fetchAdminAuditLogs } from '../admin-audit-service';

interface AdminDataResult {
  success: boolean;
  owners?: User[];
  pendingPgs?: PG[];
  allPgs?: PG[];
  allGuests?: Guest[];
  allPayments?: any[];
  allComplaints?: Complaint[];
  activityLogs?: ActivityLog[];
  adminAuditLogs?: AdminAuditLog[];
  stats?: {
    totalOwners: number;
    totalProperties: number;
    totalTenants: number;
    totalRevenue: number;
  };
  schemaDistribution?: Record<number, number>;
  error?: string;
}

/**
 * Server Action to fetch all administrative data securely.
 * Runs via the Admin SDK, completely bypassing client-side security rules.
 */
export async function fetchAdminDashboardData(adminId: string): Promise<AdminDataResult> {
  try {
    const adminDb = await getAdminDb();
    
    // 1. Strict Security Guard: Confirm caller has the Admin role
    const adminDoc = await adminDb.collection('users').doc(adminId).get();
    const adminData = adminDoc.data();
    if (!adminDoc.exists || adminData?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Administrative credentials required.' };
    }

    // 2. Fetch Users
    const usersSnapshot = await adminDb.collection('users').get();
    const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    
    const ownerUsers = allUsers.filter(user => user.role === 'owner');
    
    // 3. Calculate Schema Distribution
    const schemaDistribution: Record<number, number> = {};
    allUsers.forEach(user => {
      const ver = user.schemaVersion || 0;
      schemaDistribution[ver] = (schemaDistribution[ver] || 0) + 1;
    });

    // 4. Fetch Properties (PGs), Guests (Tenants), and Complaints in Parallel
    let totalProperties = 0;
    let totalTenants = 0;
    let totalRevenue = 0;
    const pendingPgs: PG[] = [];
    const allPgs: PG[] = [];
    const allGuests: Guest[] = [];
    const allPayments: any[] = [];
    const allComplaints: Complaint[] = [];

    const pgsAndGuestsPromise = ownerUsers.map(async (owner) => {
      const pgsSnapshot = await adminDb.collection('users_data').doc(owner.id).collection('pgs').get();
      pgsSnapshot.forEach(pgDoc => {
        const pg = pgDoc.data() as PG;
        const fullPg = { ...pg, id: pgDoc.id } as PG;
        allPgs.push(fullPg);
        if (pg.status === 'active') {
          totalProperties++;
        } else if (pg.status === 'pending_approval') {
          pendingPgs.push(fullPg);
        }
      });

      const guestsSnapshot = await adminDb.collection('users_data').doc(owner.id).collection('guests').get();
      guestsSnapshot.forEach(guestDoc => {
        const guest = guestDoc.data() as Guest;
        const fullGuest = { ...guest, id: guestDoc.id, ownerId: owner.id } as Guest;
        allGuests.push(fullGuest);
        
        if (!guest.isVacated) {
          totalTenants++;
        }
        
        (guest.paymentHistory || []).forEach(payment => {
          totalRevenue += payment.amount;
          allPayments.push({
            ...payment,
            guestId: guestDoc.id,
            guestName: guest.name,
            ownerId: owner.id,
            ownerName: owner.name || owner.email
          });
        });
      });
    });

    const complaintsPromise = (async () => {
      try {
        const complaintsSnapshot = await adminDb.collection('complaints').get();
        complaintsSnapshot.forEach(doc => {
          allComplaints.push({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date || new Date().toISOString()
          } as Complaint);
        });
      } catch (err) {
        console.warn('[AdminActions] Failed to fetch complaints:', err);
      }
    })();

    // 5. Fetch Activity Logs + Admin Audit Logs in parallel
    let activityLogs: ActivityLog[] = [];
    let adminAuditLogs: AdminAuditLog[] = [];

    const logsPromise = (async () => {
      try {
        const logsSnapshot = await adminDb.collection('activity_logs')
          .orderBy('timestamp', 'desc')
          .limit(25)
          .get();
          
        activityLogs = logsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString()
          } as unknown as ActivityLog;
        });
      } catch (logErr) {
        console.warn('[AdminActions] Failed to fetch activity logs:', logErr);
      }
    })();

    const auditLogsPromise = (async () => {
      adminAuditLogs = await fetchAdminAuditLogs({ limit: 50 });
    })();

    await Promise.all([...pgsAndGuestsPromise, complaintsPromise, logsPromise, auditLogsPromise]);

    return {
      success: true,
      owners: JSON.parse(JSON.stringify(ownerUsers)),
      pendingPgs: JSON.parse(JSON.stringify(pendingPgs)),
      allPgs: JSON.parse(JSON.stringify(allPgs)),
      allGuests: JSON.parse(JSON.stringify(allGuests)),
      allPayments: JSON.parse(JSON.stringify(allPayments)),
      allComplaints: JSON.parse(JSON.stringify(allComplaints)),
      activityLogs: JSON.parse(JSON.stringify(activityLogs)),
      adminAuditLogs: JSON.parse(JSON.stringify(adminAuditLogs)),
      stats: {
        totalOwners: ownerUsers.length,
        totalProperties,
        totalTenants,
        totalRevenue
      },
      schemaDistribution
    };

  } catch (error: any) {
    Sentry.captureException(error);
    console.error('[AdminActions] Failed to fetch admin data on server:', error);
    return { success: false, error: error.message || 'Server error fetching admin data.' };
  }
}

// ─── Audited Owner Status Mutation ───────────────────────────────────────────

export async function adminUpdateOwnerStatus(
  adminId: string,
  adminName: string,
  targetOwnerId: string,
  targetOwnerName: string,
  newStatus: 'active' | 'suspended',
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminDb = await getAdminDb();
    
    // Security guard
    const adminDoc = await adminDb.collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return { success: false, error: 'Unauthorized.' };
    }

    await adminDb.collection('users').doc(targetOwnerId).update({
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });

    // Write immutable audit record
    await writeAdminAudit(
      { adminId, adminName },
      { targetType: 'owner', targetId: targetOwnerId, targetName: targetOwnerName },
      newStatus === 'active' ? 'OWNER_UNSUSPENDED' : 'OWNER_SUSPENDED',
      `Owner status changed to '${newStatus}' by admin ${adminName}`,
    );

    return { success: true };
  } catch (err: any) {
    Sentry.captureException(err);
    console.error('[AdminActions] adminUpdateOwnerStatus failed:', err);
    return { success: false, error: err.message };
  }
}

// ─── Audited Owner Approval ───────────────────────────────────────────────────

export async function adminApproveOwner(
  adminId: string,
  adminName: string,
  targetOwnerId: string,
  targetOwnerName: string,
  approve: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminDb = await getAdminDb();

    const adminDoc = await adminDb.collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return { success: false, error: 'Unauthorized.' };
    }

    const newStatus = approve ? 'active' : 'suspended';
    await adminDb.collection('users').doc(targetOwnerId).update({
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });

    await writeAdminAudit(
      { adminId, adminName },
      { targetType: 'owner', targetId: targetOwnerId, targetName: targetOwnerName },
      approve ? 'OWNER_APPROVED' : 'OWNER_REJECTED',
      `Owner ${approve ? 'approved' : 'rejected'} by admin ${adminName}`,
    );

    return { success: true };
  } catch (err: any) {
    Sentry.captureException(err);
    console.error('[AdminActions] adminApproveOwner failed:', err);
    return { success: false, error: err.message };
  }
}

// ─── Audited Property (PG) Approval ──────────────────────────────────────────

export async function adminApprovePG(
  adminId: string,
  adminName: string,
  ownerId: string,
  pgId: string,
  pgName: string,
  approve: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminDb = await getAdminDb();

    const adminDoc = await adminDb.collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return { success: false, error: 'Unauthorized.' };
    }

    const newStatus = approve ? 'active' : 'rejected';
    await adminDb
      .collection('users_data').doc(ownerId)
      .collection('pgs').doc(pgId)
      .update({ status: newStatus, updatedAt: new Date().toISOString() });

    await writeAdminAudit(
      { adminId, adminName },
      { targetType: 'property', targetId: pgId, targetName: pgName },
      approve ? 'PROPERTY_APPROVED' : 'PROPERTY_REJECTED',
      `Property '${pgName}' ${approve ? 'approved' : 'rejected'} by ${adminName}`,
      { ownerId },
    );

    return { success: true };
  } catch (err: any) {
    Sentry.captureException(err);
    console.error('[AdminActions] adminApprovePG failed:', err);
    return { success: false, error: err.message };
  }
}

// ─── Audited Wallet Adjustment ────────────────────────────────────────────────

export async function adminAdjustWallet(
  adminId: string,
  adminName: string,
  targetOwnerId: string,
  targetOwnerName: string,
  delta: number,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminDb = await getAdminDb();

    const adminDoc = await adminDb.collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return { success: false, error: 'Unauthorized.' };
    }

    const ownerRef = adminDb.collection('users').doc(targetOwnerId);
    const ownerDoc = await ownerRef.get();
    if (!ownerDoc.exists) {
      return { success: false, error: 'Owner not found.' };
    }

    const currentBalance = ownerDoc.data()?.wallet?.balance ?? 0;
    const newBalance = Math.max(0, currentBalance + delta);

    await ownerRef.update({
      'wallet.balance': newBalance,
      'wallet.rechargeBalance': FieldValue.increment(delta > 0 ? delta : 0),
      updatedAt: new Date().toISOString(),
    });

    await writeAdminAudit(
      { adminId, adminName },
      { targetType: 'wallet', targetId: targetOwnerId, targetName: targetOwnerName },
      delta >= 0 ? 'WALLET_CREDITED' : 'WALLET_DEBITED',
      `Wallet adjusted by ₹${delta} for ${targetOwnerName}. Reason: ${reason}`,
      { delta, reason, previousBalance: currentBalance, newBalance },
    );

    return { success: true };
  } catch (err: any) {
    Sentry.captureException(err);
    console.error('[AdminActions] adminAdjustWallet failed:', err);
    return { success: false, error: err.message };
  }
}

// ─── Audited Impersonation ────────────────────────────────────────────────────

export async function adminLogImpersonation(
  adminId: string,
  adminName: string,
  targetOwnerId: string,
  targetOwnerName: string,
  eventType: 'IMPERSONATION_STARTED' | 'IMPERSONATION_ENDED' | 'IMPERSONATION_EXPIRED',
  sessionId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminDb = await getAdminDb();
    const adminDoc = await adminDb.collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return { success: false, error: 'Unauthorized.' };
    }

    await writeAdminAudit(
      { adminId, adminName, sessionId },
      { targetType: 'owner', targetId: targetOwnerId, targetName: targetOwnerName },
      eventType,
      `God Mode ${eventType.replace('IMPERSONATION_', '').toLowerCase()} for owner ${targetOwnerName}`,
      { sessionId },
    );

    return { success: true };
  } catch (err: any) {
    Sentry.captureException(err);
    console.error('[AdminActions] adminLogImpersonation failed:', err);
    return { success: false, error: err.message };
  }
}

// ─── Audited Owner Deletion (Data Cleanup) ────────────────────────────────────

export interface AdminDeleteOwnerOptions {
  ownerAccount: boolean;
  properties: boolean;
  tenants: boolean;
  staff: boolean;
  expenses: boolean;
  notices: boolean;
  complaints: boolean;
}

export async function adminDeleteOwnerData(
  adminId: string,
  adminName: string,
  targetOwnerId: string,
  targetOwnerName: string,
  options: AdminDeleteOwnerOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminDb = await getAdminDb();
    
    // Security guard
    const adminDoc = await adminDb.collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return { success: false, error: 'Unauthorized.' };
    }

    const batchSize = 100;
    
    // Helper function to delete a collection in batches
    const deleteCollection = async (collectionPath: string) => {
      const collectionRef = adminDb.collection(collectionPath);
      const query = collectionRef.orderBy('__name__').limit(batchSize);

      return new Promise<void>((resolve, reject) => {
        const deleteQueryBatch = async (db: FirebaseFirestore.Firestore, query: FirebaseFirestore.Query, res: () => void) => {
          const snapshot = await query.get();
          const count = snapshot.size;
          if (count === 0) {
            res();
            return;
          }
          const batch = db.batch();
          snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          process.nextTick(() => {
            deleteQueryBatch(db, query, res);
          });
        };
        deleteQueryBatch(adminDb, query, resolve).catch(reject);
      });
    };

    const userDataRef = adminDb.collection('users_data').doc(targetOwnerId);

    // Delete properties (pgs), rooms, and beds
    if (options.properties) {
      await deleteCollection(`users_data/${targetOwnerId}/pgs`);
      await deleteCollection(`users_data/${targetOwnerId}/rooms`);
      await deleteCollection(`users_data/${targetOwnerId}/beds`);
    }

    // Delete tenants (guests)
    if (options.tenants) {
      await deleteCollection(`users_data/${targetOwnerId}/guests`);
    }

    // Delete staff
    if (options.staff) {
      await deleteCollection(`users_data/${targetOwnerId}/staff`);
    }

    // Delete expenses
    if (options.expenses) {
      await deleteCollection(`users_data/${targetOwnerId}/expenses`);
    }

    // Delete notices
    if (options.notices) {
      await deleteCollection(`users_data/${targetOwnerId}/notices`);
    }

    // Delete complaints (Root collection where ownerId matches)
    if (options.complaints) {
      const complaintsSnapshot = await adminDb.collection('complaints').where('ownerId', '==', targetOwnerId).get();
      if (!complaintsSnapshot.empty) {
        let batch = adminDb.batch();
        let count = 0;
        for (const doc of complaintsSnapshot.docs) {
          batch.delete(doc.ref);
          count++;
          if (count === batchSize) {
            await batch.commit();
            batch = adminDb.batch();
            count = 0;
          }
        }
        if (count > 0) {
          await batch.commit();
        }
      }
    }

    // Delete owner account and users_data root doc
    if (options.ownerAccount) {
      await adminDb.collection('users').doc(targetOwnerId).delete();
      await userDataRef.delete();
      try {
        const { getAuth } = await import('firebase-admin/auth');
        await getAuth().deleteUser(targetOwnerId);
      } catch (authErr) {
        Sentry.captureException(authErr);
        console.warn(`[AdminActions] Failed to delete auth user ${targetOwnerId}:`, authErr);
      }
    }

    // Write immutable audit record
    await writeAdminAudit(
      { adminId, adminName },
      { targetType: 'owner', targetId: targetOwnerId, targetName: targetOwnerName },
      'OWNER_DELETED',
      `Admin deleted owner data for '${targetOwnerName}' with selective options`,
      { options }
    );

    return { success: true };
  } catch (err: any) {
    Sentry.captureException(err);
    console.error('[AdminActions] adminDeleteOwnerData failed:', err);
    return { success: false, error: err.message };
  }
}
