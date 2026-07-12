'use server';

import { selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import type { AttendanceRecord, VisitorLog } from '@/lib/types';

// ─── Attendance ─────────────────────────────────────────────────────────────

/**
 * Mark a guest's attendance for a specific date.
 * If a record already exists for the date, it is overwritten (idempotent).
 */
export async function markAttendance(
  ownerId: string,
  pgId: string,
  guestId: string,
  date: string, // YYYY-MM-DD
  status: AttendanceRecord['status']
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await selectOwnerDataAdminDb(ownerId);
    // Use a deterministic doc ID to ensure idempotency (one record per guest per day)
    const docId = `${guestId}_${date}`;
    const ref = db
      .collection('users_data')
      .doc(ownerId)
      .collection('attendance')
      .doc(docId);

    const record: AttendanceRecord = {
      id: docId,
      pgId,
      guestId,
      date,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await ref.set(record, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error('[Attendance] Failed to mark attendance:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get attendance records for a specific PG on a specific date.
 */
export async function getAttendanceForDate(
  ownerId: string,
  pgId: string,
  date: string // YYYY-MM-DD
): Promise<AttendanceRecord[]> {
  try {
    const db = await selectOwnerDataAdminDb(ownerId);
    const snap = await db
      .collection('users_data')
      .doc(ownerId)
      .collection('attendance')
      .where('pgId', '==', pgId)
      .where('date', '==', date)
      .get();
    return snap.docs.map((doc) => doc.data() as AttendanceRecord);
  } catch (err: any) {
    console.error('[Attendance] Failed to fetch attendance:', err);
    return [];
  }
}

/**
 * Get attendance records for a specific guest within a date range.
 */
export async function getAttendanceForGuest(
  ownerId: string,
  guestId: string,
  startDate: string, // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
): Promise<AttendanceRecord[]> {
  try {
    const db = await selectOwnerDataAdminDb(ownerId);
    const snap = await db
      .collection('users_data')
      .doc(ownerId)
      .collection('attendance')
      .where('guestId', '==', guestId)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'desc')
      .get();
    return snap.docs.map((doc) => doc.data() as AttendanceRecord);
  } catch (err: any) {
    console.error('[Attendance] Failed to fetch guest attendance:', err);
    return [];
  }
}

// ─── Visitor Logs ────────────────────────────────────────────────────────────

/**
 * Log a new visitor entry for a PG.
 */
export async function logVisitorEntry(
  ownerId: string,
  pgId: string,
  input: { visitorName: string; phone: string; guestId?: string }
): Promise<{ success: boolean; visitorLogId?: string; error?: string }> {
  try {
    const db = await selectOwnerDataAdminDb(ownerId);
    const ref = db
      .collection('users_data')
      .doc(ownerId)
      .collection('visitor_logs')
      .doc();

    const record: VisitorLog = {
      id: ref.id,
      pgId,
      guestId: input.guestId,
      visitorName: input.visitorName,
      phone: input.phone,
      entryTime: new Date().toISOString(),
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await ref.set(record);
    return { success: true, visitorLogId: ref.id };
  } catch (err: any) {
    console.error('[VisitorLog] Failed to log entry:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Mark a visitor as exited.
 */
export async function logVisitorExit(
  ownerId: string,
  visitorLogId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await selectOwnerDataAdminDb(ownerId);
    const ref = db
      .collection('users_data')
      .doc(ownerId)
      .collection('visitor_logs')
      .doc(visitorLogId);

    await ref.update({
      exitTime: new Date().toISOString(),
      status: 'completed',
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (err: any) {
    console.error('[VisitorLog] Failed to log exit:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get all active visitors currently inside a PG.
 */
export async function getActiveVisitors(
  ownerId: string,
  pgId: string
): Promise<VisitorLog[]> {
  try {
    const db = await selectOwnerDataAdminDb(ownerId);
    const snap = await db
      .collection('users_data')
      .doc(ownerId)
      .collection('visitor_logs')
      .where('pgId', '==', pgId)
      .where('status', '==', 'active')
      .orderBy('entryTime', 'desc')
      .get();
    return snap.docs.map((doc) => doc.data() as VisitorLog);
  } catch (err: any) {
    console.error('[VisitorLog] Failed to fetch active visitors:', err);
    return [];
  }
}

/**
 * Get visitor log history for a PG (last N entries).
 */
export async function getVisitorHistory(
  ownerId: string,
  pgId: string,
  limitCount = 100
): Promise<VisitorLog[]> {
  try {
    const db = await selectOwnerDataAdminDb(ownerId);
    const snap = await db
      .collection('users_data')
      .doc(ownerId)
      .collection('visitor_logs')
      .where('pgId', '==', pgId)
      .orderBy('entryTime', 'desc')
      .limit(limitCount)
      .get();
    return snap.docs.map((doc) => doc.data() as VisitorLog);
  } catch (err: any) {
    console.error('[VisitorLog] Failed to fetch visitor history:', err);
    return [];
  }
}
