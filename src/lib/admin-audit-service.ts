/**
 * admin-audit-service.ts
 *
 * Immutable audit trail for all high-risk Super Admin operations.
 * Writes to the `admin_audit_logs` Firestore collection.
 *
 * Schema: Each doc is write-once. No updates. No deletes.
 * Collections affected: admin_audit_logs (NEW — additive only)
 */
import { getAdminDb } from './firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import type { AdminAuditLog, AdminAuditAction, AdminSubRole } from './types';

const COLLECTION = 'admin_audit_logs';
const SCHEMA_VERSION = 1;

export interface AuditContext {
    adminId: string;
    adminName: string;
    adminSubRole?: AdminSubRole;
    sessionId?: string;
    ipAddress?: string;
}

export interface AuditTarget {
    targetType: AdminAuditLog['targetType'];
    targetId: string;
    targetName?: string;
}

/**
 * Write an immutable audit record for a high-risk admin operation.
 * Fire-and-forget safe — errors are caught and logged, never thrown.
 */
export async function writeAdminAudit(
    ctx: AuditContext,
    target: AuditTarget,
    action: AdminAuditAction,
    details?: string,
    metadata?: Record<string, unknown>
): Promise<string | null> {
    try {
        const db = await getAdminDb();
        const ref = db.collection(COLLECTION).doc();

        const record: Record<string, unknown> = {
            id: ref.id,
            adminId: ctx.adminId,
            adminName: ctx.adminName,
            adminSubRole: ctx.adminSubRole ?? 'admin',
            action,
            targetType: target.targetType,
            targetId: target.targetId,
            targetName: target.targetName ?? null,
            details: details ?? null,
            metadata: metadata ?? null,
            ipAddress: ctx.ipAddress ?? null,
            sessionId: ctx.sessionId ?? null,
            timestamp: FieldValue.serverTimestamp(),
            schemaVersion: SCHEMA_VERSION,
        };

        await ref.set(record);
        console.log(`[AdminAudit] ${action} by ${ctx.adminId} on ${target.targetType}:${target.targetId}`);
        return ref.id;
    } catch (err) {
        console.error('[AdminAudit] Failed to write audit record:', err);
        return null;
    }
}

/**
 * Fetch recent audit logs for the admin console viewer.
 * Sorted newest-first. Optionally filtered by action or targetId.
 */
export async function fetchAdminAuditLogs(filters: {
    action?: AdminAuditAction;
    targetId?: string;
    adminId?: string;
    limit?: number;
    lastId?: string;
} = {}): Promise<AdminAuditLog[]> {
    try {
        const db = await getAdminDb();
        let query = db.collection(COLLECTION)
            .orderBy('timestamp', 'desc')
            .limit(filters.limit ?? 50) as FirebaseFirestore.Query;

        if (filters.action) {
            query = query.where('action', '==', filters.action);
        }
        if (filters.targetId) {
            query = query.where('targetId', '==', filters.targetId);
        }
        if (filters.adminId) {
            query = query.where('adminId', '==', filters.adminId);
        }
        if (filters.lastId) {
            const lastDoc = await db.collection(COLLECTION).doc(filters.lastId).get();
            if (lastDoc.exists) {
                query = query.startAfter(lastDoc);
            }
        }

        const snap = await query.get();
        return snap.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                timestamp: data.timestamp
                    ? data.timestamp.toDate().toISOString()
                    : new Date().toISOString(),
            } as AdminAuditLog;
        });
    } catch (err) {
        console.error('[AdminAudit] Failed to fetch audit logs:', err);
        return [];
    }
}
