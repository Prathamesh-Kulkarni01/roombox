import { Firestore } from 'firebase-admin/firestore';

export interface AttendanceLog {
    id: string; // Document ID: scanId (idempotency key)
    scanId: string;
    ownerId: string;
    pgId: string;
    pgName: string;
    zoneId: string; // e.g. "GATE", "BUILDING-A"
    guestId: string;
    tenantName: string;
    roomName: string;
    type: 'IN' | 'OUT';
    purpose?: 'College' | 'Office' | 'Home Visit' | 'Vacation' | 'Other' | null;
    latitude?: number | null;
    longitude?: number | null;
    distanceFromPG?: number | null;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NO_GPS';
    locationStatus: 'Normal' | 'Warning' | 'Remote Scan' | 'No GPS';
    timestamp: string; // ISO String
    attendanceDate: string; // YYYY-MM-DD
    deviceFingerprint?: string;
    userAgent?: string;
    source: 'QR_SCAN' | 'STAFF_ENTRY' | 'ADMIN_ENTRY';
    isEmergency?: boolean;
    schemaVersion: number;
}

export interface AttendanceStatus {
    guestId: string;
    tenantName: string;
    roomName: string;
    pgId: string;
    pgName: string;
    status: 'IN' | 'OUT';
    lastUpdated: string;
    lastLogId: string;
    schemaVersion: number;
}

export interface DailyAttendanceSummary {
    date: string; // YYYY-MM-DD
    totalResidents: number;
    presentAtMidnight: number;
    outAtMidnight: number;
    schemaVersion: number;
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // meters
}

export class AttendanceService {
    /**
     * Gets the latest attendance log for a given guest/tenant.
     */
    static async getLatestAttendanceLog(
        db: Firestore,
        ownerId: string,
        guestId: string
    ): Promise<AttendanceLog | null> {
        const snapshot = await db
            .collection('users_data')
            .doc(ownerId)
            .collection('attendance_logs')
            .where('guestId', '==', guestId)
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as AttendanceLog;
    }

    /**
     * Gets the O(1) attendance status cache for a resident.
     */
    static async getAttendanceStatus(
        db: Firestore,
        ownerId: string,
        guestId: string
    ): Promise<AttendanceStatus | null> {
        const doc = await db
            .collection('users_data')
            .doc(ownerId)
            .collection('attendance_status')
            .doc(guestId)
            .get();

        if (!doc.exists) return null;
        return { guestId: doc.id, ...doc.data() } as AttendanceStatus;
    }

    /**
     * Logs a new attendance entry. Runs within a secure Firestore Transaction
     * to prevent double-scan race conditions and implement idempotency check.
     */
    static async logAttendance(
        db: Firestore,
        ownerId: string,
        logData: Omit<AttendanceLog, 'confidence' | 'locationStatus' | 'attendanceDate' | 'schemaVersion'>
    ): Promise<AttendanceLog> {
        const scanId = logData.scanId || `att-${Date.now()}`;
        const timestampDate = new Date(logData.timestamp);
        const attendanceDate = timestampDate.toISOString().split('T')[0];

        // 1. Fetch geofence configuration values (from PG document)
        const pgRef = db.collection('users_data').doc(ownerId).collection('pgs').doc(logData.pgId);
        const pgDoc = await pgRef.get();
        
        let confidence: AttendanceLog['confidence'] = 'NO_GPS';
        let locationStatus: AttendanceLog['locationStatus'] = 'No GPS';
        let finalDistance: number | null = null;

        if (logData.latitude !== undefined && logData.longitude !== undefined && logData.latitude !== null && logData.longitude !== null) {
            if (pgDoc.exists) {
                const pgData = pgDoc.data()!;
                const pgLat = pgData.latitude;
                const pgLon = pgData.longitude;

                if (typeof pgLat === 'number' && typeof pgLon === 'number') {
                    finalDistance = calculateDistance(logData.latitude, logData.longitude, pgLat, pgLon);
                    if (finalDistance < 50) {
                        confidence = 'HIGH';
                        locationStatus = 'Normal';
                    } else if (finalDistance <= 200) {
                        confidence = 'MEDIUM';
                        locationStatus = 'Warning';
                    } else {
                        confidence = 'LOW';
                        locationStatus = 'Remote Scan';
                    }
                } else {
                    confidence = 'HIGH';
                    locationStatus = 'Normal'; // No PG location defined, assume normal
                }
            }
        }

        const newLog: AttendanceLog = {
            ...logData,
            id: scanId,
            scanId,
            distanceFromPG: finalDistance,
            confidence,
            locationStatus,
            attendanceDate,
            schemaVersion: 2,
        };

        const logDocRef = db.collection('users_data').doc(ownerId).collection('attendance_logs').doc(scanId);
        const statusDocRef = db.collection('users_data').doc(ownerId).collection('attendance_status').doc(logData.guestId);

        // 2. Transaction for idempotency and status caching
        await db.runTransaction(async (transaction) => {
            const existingLog = await transaction.get(logDocRef);
            if (existingLog.exists) {
                // Idempotency hit: return existing document instead of duplicating
                return;
            }

            // Write Log
            transaction.set(logDocRef, newLog);

            // Write Status Cache
            const statusUpdate: AttendanceStatus = {
                guestId: logData.guestId,
                tenantName: logData.tenantName,
                roomName: logData.roomName,
                pgId: logData.pgId,
                pgName: logData.pgName,
                status: logData.type,
                lastUpdated: logData.timestamp,
                lastLogId: scanId,
                schemaVersion: 1
            };
            transaction.set(statusDocRef, statusUpdate);
        });

        return newLog;
    }

    /**
     * Queries logs from database.
     */
    static async getAttendanceLogs(
        db: Firestore,
        ownerId: string,
        filters: {
            pgId?: string;
            guestId?: string;
            startDate?: string;
            endDate?: string;
            type?: 'IN' | 'OUT';
            limit?: number;
        } = {}
    ): Promise<AttendanceLog[]> {
        let query = db
            .collection('users_data')
            .doc(ownerId)
            .collection('attendance_logs') as FirebaseFirestore.Query;

        if (filters.pgId) {
            query = query.where('pgId', '==', filters.pgId);
        }
        if (filters.guestId) {
            query = query.where('guestId', '==', filters.guestId);
        }
        if (filters.type) {
            query = query.where('type', '==', filters.type);
        }
        if (filters.startDate) {
            query = query.where('timestamp', '>=', filters.startDate);
        }
        if (filters.endDate) {
            query = query.where('timestamp', '<=', filters.endDate);
        }

        query = query.orderBy('timestamp', 'desc');

        const limit = filters.limit || 500;
        query = query.limit(limit);

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceLog));
    }

    /**
     * Dashboard O(1) counters read entirely from `attendance_status`.
     */
    static async getAttendanceStats(
        db: Firestore,
        ownerId: string,
        pgId?: string
    ) {
        let guestsQuery = db.collection('users_data').doc(ownerId).collection('guests').where('isVacated', '==', false);
        if (pgId) {
            guestsQuery = guestsQuery.where('pgId', '==', pgId);
        }
        const guestsSnap = await guestsQuery.get();
        const totalResidents = guestsSnap.size;

        let statusQuery = db.collection('users_data').doc(ownerId).collection('attendance_status') as FirebaseFirestore.Query;
        if (pgId) {
            statusQuery = statusQuery.where('pgId', '==', pgId);
        }
        const statusSnap = await statusQuery.get();

        let present = 0;
        let out = 0;

        statusSnap.docs.forEach(doc => {
            const data = doc.data();
            if (data.status === 'IN') {
                present++;
            } else if (data.status === 'OUT') {
                out++;
            }
        });

        // Fill in missing default values
        const neverScanned = Math.max(0, totalResidents - (present + out));
        present += neverScanned;

        return {
            totalResidents,
            present,
            out,
            occupancyRate: totalResidents > 0 ? Math.round((present / totalResidents) * 100) : 100
        };
    }

    /**
     * Resolves late returns. Check-ins occurring after curfewTime (or fallback "23:00").
     */
    static async getLateReturns(db: Firestore, ownerId: string, pgId?: string): Promise<AttendanceLog[]> {
        const todayStr = new Date().toISOString().split('T')[0];
        let query = db
            .collection('users_data')
            .doc(ownerId)
            .collection('attendance_logs')
            .where('attendanceDate', '==', todayStr)
            .where('type', '==', 'IN');

        if (pgId) {
            query = query.where('pgId', '==', pgId);
        }

        const snapshot = await query.get();
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceLog));

        // Get curfew config
        let curfewHour = 23;
        let curfewMinute = 0;

        if (pgId) {
            const pgDoc = await db.collection('users_data').doc(ownerId).collection('pgs').doc(pgId).get();
            if (pgDoc.exists) {
                const pgData = pgDoc.data()!;
                const curfewSetting = pgData.attendance?.curfewTime; // e.g. "21:30"
                if (curfewSetting && typeof curfewSetting === 'string') {
                    const parts = curfewSetting.split(':');
                    if (parts.length === 2) {
                        curfewHour = parseInt(parts[0], 10);
                        curfewMinute = parseInt(parts[1], 10);
                    }
                }
            }
        }

        return logs.filter(log => {
            const time = new Date(log.timestamp);
            const hours = time.getHours();
            const minutes = time.getMinutes();
            return hours > curfewHour || (hours === curfewHour && minutes >= curfewMinute);
        });
    }

    /**
     * Returns list of tenants missing (OUT for > 3 days).
     */
    static async getMissingTenants(db: Firestore, ownerId: string, pgId?: string): Promise<AttendanceStatus[]> {
        const boundaryDate = new Date();
        boundaryDate.setDate(boundaryDate.getDate() - 3);

        let query = db
            .collection('users_data')
            .doc(ownerId)
            .collection('attendance_status')
            .where('status', '==', 'OUT')
            .where('lastUpdated', '<', boundaryDate.toISOString());

        if (pgId) {
            query = query.where('pgId', '==', pgId);
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ guestId: doc.id, ...doc.data() } as AttendanceStatus));
    }

    /**
     * Returns list of tenants who have never scanned in the last 7 days.
     */
    static async getNeverScannedTenants(db: Firestore, ownerId: string, pgId?: string): Promise<any[]> {
        const boundaryDate = new Date();
        boundaryDate.setDate(boundaryDate.getDate() - 7);

        let tenantsQuery = db.collection('users_data').doc(ownerId).collection('guests').where('isVacated', '==', false);
        if (pgId) {
            tenantsQuery = tenantsQuery.where('pgId', '==', pgId);
        }
        const tenantsSnap = await tenantsQuery.get();
        const activeTenants = tenantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

        let statusQuery = db.collection('users_data').doc(ownerId).collection('attendance_status') as FirebaseFirestore.Query;
        if (pgId) {
            statusQuery = statusQuery.where('pgId', '==', pgId);
        }
        const statusSnap = await statusQuery.get();
        const statusMap = new Map<string, any>();
        statusSnap.docs.forEach(doc => {
            statusMap.set(doc.id, doc.data());
        });

        return activeTenants.filter(t => {
            const status = statusMap.get(t.id);
            if (!status) return true;
            return new Date(status.lastUpdated) < boundaryDate;
        });
    }

    /**
     * Daily auto snapshot generation (to be called by midnight cron job or admin page refresh logic).
     */
    static async createDailySummarySnapshot(db: Firestore, ownerId: string, dateStr: string): Promise<DailyAttendanceSummary> {
        const stats = await AttendanceService.getAttendanceStats(db, ownerId);

        const summary: DailyAttendanceSummary = {
            date: dateStr,
            totalResidents: stats.totalResidents,
            presentAtMidnight: stats.present,
            outAtMidnight: stats.out,
            schemaVersion: 1
        };

        await db
            .collection('users_data')
            .doc(ownerId)
            .collection('daily_attendance_summary')
            .doc(dateStr)
            .set(summary);

        return summary;
    }
}
