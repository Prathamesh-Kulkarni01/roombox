import type { BaseEntity } from '@/core/database/schema';

export interface RentProperty extends BaseEntity {
  name: string;
  address: string;
  ownerId: string;
  totalRooms: number;
  schemaVersion: number;
}

export interface RentTenant extends BaseEntity {
  name: string;
  phone: string;
  email?: string;
  propertyId: string;
  roomId?: string;
  bedId?: string;
  rentAmount: number;
  depositAmount: number;
  status: 'active' | 'vacated' | 'notice';
  schemaVersion: number;
}

