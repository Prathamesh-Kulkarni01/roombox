import { getAdminDb } from './firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export type ActivityType = 
    | 'GUEST_ONBOARDING'
    | 'GUEST_VACATED'
    | 'PAYMENT_RECORDED'
    | 'KYC_SUBMITTED'
    | 'COMPLAINT_CREATED'
    | 'SYSTEM_LOG';

export interface ActivityLog {
    id: string;
    ownerId: string;
    activityType: ActivityType;
    details: string;
    targetId?: string; // e.g., guestId, complaintId
    targetType?: 'guest' | 'complaint' | 'payment' | 'room';
    status: 'success' | 'failed' | 'warning';
    error?: string;
    metadata?: Record<string, any>;
    timestamp: Timestamp | Date;
}

/**
 * Service to manage general server activity logs in Firestore.
 */
export class ActivityLogsService {
    private static COLLECTION = 'activity_logs';

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
}
