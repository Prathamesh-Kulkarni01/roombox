const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/types.ts');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Find the line where "export interface Lead extends BaseEntity {" starts
const leadLineIndex = lines.findIndex(line => line.startsWith('export interface Lead extends BaseEntity {'));

if (leadLineIndex !== -1) {
  // Truncate everything from that line onwards
  const goodLines = lines.slice(0, leadLineIndex);
  
  // Append the correct interfaces
  const appendContent = `export interface Lead extends BaseEntity {
  id: string;
  ownerId: string;
  name: string;
  phone: string;
  status: LeadStatus;
  pgId?: string; // Optional: If they inquired about a specific PG
  expectedRent?: number;
  source?: 'website' | 'walk-in' | 'broker' | 'referral' | 'other';
  notes?: string;
  nextFollowUpDate?: string; // ISO string
}

export interface UtilityReading extends BaseEntity {
  id: string;
  ownerId: string;
  pgId: string;
  roomId: string;
  roomName: string;
  utilityType: 'electricity' | 'water' | 'other';
  utilityName?: string; 
  previousReading: number;
  currentReading: number;
  readingDate: string; // ISO String
  ratePerUnit?: number; // fallback
  costPerUnit?: number; // in types.ts it was costPerUnit in one version, ratePerUnit in another
  totalAmount: number;
  isBilled: boolean;
  billedGuestIds?: string[]; 
  notes?: string;
}

export interface StaffAdvance extends BaseEntity {
  id: string;
  staffId: string;
  ownerId: string;
  amount: number;
  date: string; // ISO string
  reason?: string;
  deductedInPayrollId?: string;
  status?: 'unsettled' | 'settled';
}

export interface PayrollRecord extends BaseEntity {
  id: string;
  staffId: string;
  ownerId: string;
  staffName?: string;
  month: string; // e.g., '2026-06'
  baseSalary: number;
  attendanceDays: number; 
  calculatedDeduction: number; 
  advancesDeducted: number;
  bonus?: number;
  finalPayout: number;
  status: 'draft' | 'pending' | 'paid';
  paidDate?: string;
  paidAt?: string;
}

export interface RefundRecord extends BaseEntity {
  id: string;
  ownerId: string;
  pgId: string;
  guestId: string;
  guestName: string;
  originalDeposit: number;
  unpaidRentDeduction: number;
  damageDeduction: number;
  damageNotes?: string;
  finalRefundAmount: number;
  refundDate?: string; // ISO string
  processedAt?: string;
  refundMethod: 'cash' | 'bank_transfer' | 'upi' | 'waived';
  status: 'pending' | 'processed' | 'completed';
  expenseId?: string;
}

export interface CommunityPost extends BaseEntity {
  id: string;
  pgId: string;
  ownerId: string;
  authorId: string;
  authorName: string;
  authorRole: 'owner' | 'tenant' | 'staff';
  type: 'notice' | 'event' | 'marketplace';
  title: string;
  content: string;
  price?: number;
  date: string; // ISO string
  status: 'active' | 'resolved' | 'archived';
  isPinned: boolean;
}
`;

  fs.writeFileSync(filePath, goodLines.join('\n') + '\n' + appendContent);
  console.log('Fixed types.ts successfully');
} else {
  console.log('Could not find Lead interface start');
}
