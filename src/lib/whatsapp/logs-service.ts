import { getAdminDb } from '../firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export interface WhatsAppLog {
    id: string;
    ownerId: string;
    targetId?: string; // Tenant/Guest ID if available
    phone: string;
    direction: 'inbound' | 'outbound';
    type: 'text' | 'image' | 'interactive' | 'template';
    content: string;
    cost: number;
    status: 'success' | 'failed';
    error?: string;
    timestamp: Timestamp | Date;
}

/**
 * Service to manage WhatsApp usage logs in Firestore.
 * Logs are stored in a top-level 'whatsapp_logs' collection for global querying
 * and potentially sub-collections for owner-specific views.
 */
export class WhatsAppLogsService {
    private static COLLECTION = 'whatsapp_usage_logs';

    /**
     * Logs a WhatsApp message event.
     */
    static async logMessage(log: Omit<WhatsAppLog, 'id' | 'timestamp'>) {
        try {
            const adminDb = await getAdminDb();
            const logRef = adminDb.collection(this.COLLECTION).doc();

            const logData: any = {
                ...log,
                id: logRef.id,
                timestamp: FieldValue.serverTimestamp(),
            };

            // 🛡️ Firestore doesn't allow 'undefined'. Sanitize all fields.
            Object.keys(logData).forEach(key => {
                if (logData[key] === undefined) {
                    logData[key] = null;
                }
            });

            await logRef.set(logData);
            console.log(`[WhatsAppLogsService] Logged ${log.direction} message for ${log.phone}`);
            return logRef.id;
        } catch (error) {
            console.error('[WhatsAppLogsService] Failed to log message:', error);
            // We don't throw here to avoid breaking the main message flow if logging fails
            return null;
        }
    }

    /**
     * Retrieves usage logs for a specific owner.
     */
    static async getOwnerLogs(ownerId: string, limit: number = 50) {
        try {
            const adminDb = await getAdminDb();
            let query = adminDb.collection(this.COLLECTION)
                .where('ownerId', '==', ownerId);

            try {
                // Try sorted query first (requires index)
                const snapshot = await query.orderBy('timestamp', 'desc')
                    .limit(limit)
                    .get();

                return snapshot.docs.map(doc => ({
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate().toISOString() || new Date().toISOString()
                }));
            } catch (sortError: any) {
                // If index is missing, fallback to unsorted (will still work, just not desc)
                if (sortError.message?.includes('index') || sortError.code === 9) {
                    console.warn('[WhatsAppLogsService] Missing index for sorted logs, falling back to unsorted. Error details:', sortError.message);
                    const snapshot = await query.limit(limit).get();
                    return snapshot.docs.map(doc => ({
                        ...doc.data(),
                        timestamp: doc.data().timestamp?.toDate().toISOString() || new Date().toISOString()
                    })).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                }
                throw sortError;
            }
        } catch (error) {
            console.error('[WhatsAppLogsService] Failed to fetch logs:', error);
            return [];
        }
    }
}
