import { db } from '@/core/database';
import { collection, doc, getDocs, setDoc, query, where, Timestamp } from 'firebase/firestore';
import type { GymMember, GymPlan, GymAttendance } from '../schemas';
import { GYM_SCHEMA_VERSION } from '../schemas';

const MEMBERS_COLLECTION = 'gym_members';
const PLANS_COLLECTION = 'gym_plans';
const ATTENDANCE_COLLECTION = 'gym_attendance';

export class GymService {
  async getMembers(gymId: string): Promise<GymMember[]> {
    if (!db) return [];
    try {
      const q = query(collection(db, MEMBERS_COLLECTION), where('gymId', '==', gymId));
      const snap = await getDocs(q);
      return snap.docs.map(d => {
        const data = d.data() as GymMember;
        return {
          ...data,
          id: d.id,
          schemaVersion: data.schemaVersion ?? GYM_SCHEMA_VERSION,
        };
      });
    } catch (e) {
      console.error('[GymService] getMembers error:', e);
      return [];
    }
  }

  async addMember(member: Omit<GymMember, 'id' | 'schemaVersion' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!db) throw new Error('Database not initialized');
    const memberRef = doc(collection(db, MEMBERS_COLLECTION));
    const now = Timestamp.now();
    
    const payload: GymMember = {
      ...member,
      id: memberRef.id,
      schemaVersion: GYM_SCHEMA_VERSION,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(memberRef, payload);
    return memberRef.id;
  }

  async markAttendance(gymId: string, memberId: string, method: GymAttendance['method'] = 'qr_scan'): Promise<string> {
    if (!db) throw new Error('Database not initialized');
    const attRef = doc(collection(db, ATTENDANCE_COLLECTION));
    const now = Timestamp.now();

    const record: GymAttendance = {
      id: attRef.id,
      gymId,
      memberId,
      timestamp: now,
      method,
      schemaVersion: GYM_SCHEMA_VERSION,
      createdAt: now,
    };

    await setDoc(attRef, record);
    return attRef.id;
  }
}

export const gymService = new GymService();

