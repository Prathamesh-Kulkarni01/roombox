/**
 * rbac-audit.ts — Audit logging for RBAC access denials.
 * Writes denied access attempts to a dedicated Firestore collection.
 * This provides a security audit trail for detecting unauthorized access attempts.
 */
import { getAdminDb } from './firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export interface RbacAuditEntry {
    id?: string;
    staffId: string;      // userId of the staff member
    ownerId: string;      // The owner whose data was being accessed
    module: string;       // e.g., 'guests', 'complaints'
    action: string;       // e.g., 'add', 'edit', 'delete'
    route: string;        // e.g., 'POST /api/guests'
    result: 'DENIED';
    userPermissions?: string[];  // What permissions the user actually has
    timestamp?: FirebaseFirestore.Timestamp;
}

const COLLECTION = 'rbac_audit_logs';

/**
 * Logs a denied access attempt to Firestore.
 * Non-blocking — failures are logged to console but don't throw.
 */
export async function logAccessDenied(entry: Omit<RbacAuditEntry, 'id' | 'timestamp' | 'result'>): Promise<void> {
    try {
        const db = await getAdminDb();
        const ref = db.collection(COLLECTION).doc();

        const logData: Record<string, any> = {
            ...entry,
            id: ref.id,
            result: 'DENIED',
            timestamp: FieldValue.serverTimestamp(),
        };

        // Sanitize undefined fields
        Object.keys(logData).forEach(key => {
            if (logData[key] === undefined) {
                logData[key] = null;
            }
        });

        await ref.set(logData);
        console.warn(`[RBAC] ACCESS DENIED: ${entry.staffId} tried ${entry.action} on ${entry.module} via ${entry.route}`);
    } catch (error) {
        // Audit logging should never crash the request handler
        console.error('[RBAC] Failed to log access denial:', error);
    }
}
