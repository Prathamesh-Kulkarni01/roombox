import type { BaseEntity } from '@/core/database/schema';

export const GYM_SCHEMA_VERSION = 1;

export interface GymMember extends BaseEntity {
  gymId: string;
  name: string;
  phone: string;
  planId: string;
  startDate: any;
  endDate: any;
  feeAmount: number;
  paidAmount: number;
  status: 'active' | 'expired' | 'frozen';
  trainerId?: string;
  schemaVersion: number;
}

export interface GymPlan extends BaseEntity {
  gymId: string;
  name: string;
  durationMonths: number;
  price: number;
  description?: string;
  isActive: boolean;
  schemaVersion: number;
}

export interface GymAttendance extends BaseEntity {
  gymId: string;
  memberId: string;
  timestamp: any;
  method: 'biometric' | 'qr_scan' | 'manual';
  schemaVersion: number;
}

