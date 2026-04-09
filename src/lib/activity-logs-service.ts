import { getAdminDb } from './firebaseAdmin';
import { FieldValue, Timestamp, Query } from 'firebase-admin/firestore';
import { ActivityLog, ActivityChange, ActivityType } from './types';

/**
 * Service to manage general server activity logs in Firestore.
 */
export class ActivityLogsService {
    private static COLLECTION = 'activity_logs';

    /**
     * Detects changes between two objects.
     */
    static getChangedFields(before: any, after: any, ignoreFields: string[] = ['updatedAt', 'updatedBy', 'schemaVersion']): string[] {
        const changedFields: string[] = [];
        
        // Combine all keys
        const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

        for (const key of allKeys) {
            if (ignoreFields.includes(key)) continue;

            const valBefore = before?.[key];
            const valAfter = after?.[key];

            // Simple equality check for primitive values and common types
            if (JSON.stringify(valBefore) !== JSON.stringify(valAfter)) {
                changedFields.push(key);
            }
        }

        return changedFields;
    }

    /**
     * Legacy helper to get changed fields in detailed format.
     */
    static getDetailedChanges(before: any, after: any, ignoreFields: string[] = ['updatedAt', 'updatedBy', 'schemaVersion']): ActivityChange[] {
        const changes: ActivityChange[] = [];
        const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

        for (const key of allKeys) {
            if (ignoreFields.includes(key)) continue;
            const valBefore = before?.[key];
            const valAfter = after?.[key];

            if (JSON.stringify(valBefore) !== JSON.stringify(valAfter)) {
                changes.push({
                    field: key,
                    before: valBefore ?? null,
                    after: valAfter ?? null
                });
            }
        }
        return changes;
    }

    /**
     * Logs a server activity event.
     */
    static async logActivity(log: Omit<ActivityLog, 'id' | 'timestamp'>) {
        try {
            const adminDb = await getAdminDb();
            const logRef = adminDb.collection(this.COLLECTION).doc();

            const logData: any = {
                ...log,
                id: logRef.id,
                timestamp: FieldValue.serverTimestamp(),
            };

            // Sanitize undefined fields for Firestore
            Object.keys(logData).forEach(key => {
                if (logData[key] === undefined) {
                    logData[key] = null;
                }
            });

            await logRef.set(logData);
            console.log(`[ActivityLogsService] Logged ${log.activityType} for owner ${log.ownerId}`);
            return logRef.id;
        } catch (error) {
            console.error('[ActivityLogsService] Failed to log activity:', error);
            return null;
        }
    }

    static async getLogs(ownerId: string, filters: {
        module?: string;
        activityType?: string;
        targetId?: string;
        userId?: string;
        limit?: number;
        lastId?: string;
    } = {}) {
        const { module, activityType, targetId, userId, limit = 20, lastId } = filters;
        const adminDb = await getAdminDb();
        const collection = adminDb.collection(this.COLLECTION);
        
        let query: Query = collection
            .where('ownerId', '==', ownerId)
            .orderBy('timestamp', 'desc');

        if (module) query = query.where('module', '==', module);
        if (activityType) query = query.where('activityType', '==', activityType);
        if (targetId) query = query.where('targetId', '==', targetId);
        if (userId) query = query.where('performedBy.userId', '==', userId);

        if (lastId) {
            const lastDoc = await collection.doc(lastId).get();
            if (lastDoc.exists) {
                query = query.startAfter(lastDoc);
            }
        }

        const snap = await query.limit(limit).get();
        const logs = snap.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                timestamp: data.timestamp ? (data.timestamp as Timestamp).toDate().toISOString() : new Date().toISOString()
            };
        }) as ActivityLog[];

        return {
            logs,
            lastDoc: snap.docs[snap.docs.length - 1]
        };
    }
}
