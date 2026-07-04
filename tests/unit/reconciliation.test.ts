import { describe, it, expect } from 'vitest';
import { runReconciliationLogic } from '../../src/lib/reconciliation';
import { Guest } from '../../src/lib/types';
import { addMonths } from 'date-fns';

describe('runReconciliationLogic for Fixed Date Collections', () => {
  it('should correctly roll forward the due date to the fixed day of the next month', () => {
    // Simulate tenant joining on April 15, with fixed collection day on the 5th
    // In onboardTenant, this sets:
    // dueDate = May 5
    // billingAnchorDay = 5
    
    const mockGuest: Guest = {
      id: 'g-1',
      ownerId: 'o-1',
      name: 'Test Tenant',
      phone: '+919999999999',
      pgId: 'pg-1',
      pgName: 'Test PG',
      roomId: 'r-1',
      roomName: 'Room 1',
      bedId: 'b-1',
      rentAmount: 3000, // Monthly
      depositAmount: 1000,
      balance: 0,
      paidAmount: 0,
      rentStatus: 'paid',
      paymentStatus: 'paid',
      isVacated: false,
      kycStatus: 'not_submitted',
      documents: [],
      ledger: [
         // Initial prorated rent for April 15 - April 30 = ~1500 (already paid off for this test)
         { id: 'rent-1', date: '2024-04-15T12:00:00.000Z', type: 'debit', amount: 1500, description: 'Pro-rated Rent' },
         { id: 'pay-1', date: '2024-04-15T12:01:00.000Z', type: 'credit', amount: 1500, description: 'Paid' },
      ],
      paymentHistory: [],
      joinDate: '2024-04-15T12:00:00.000Z',
      moveInDate: '2024-04-15T12:00:00.000Z',
      dueDate: '2024-05-05T12:00:00.000Z', // May 5th
      rentCycleUnit: 'months',
      rentCycleValue: 1,
      billingAnchorDay: 5, // <--- Key for fixed date
      createdAt: '2024-04-15T12:00:00.000Z',
      updatedAt: '2024-04-15T12:00:00.000Z',
      noticePeriodDays: 30,
      amountType: 'numeric'
    };

    // Fast forward time to May 6th, which should trigger a reconciliation for May 5th
    const now = new Date('2024-05-06T12:00:00.000Z');
    
    const result = runReconciliationLogic(mockGuest, now);
    
    expect(result.cyclesProcessed).toBe(1);
    expect(result.guest.balance).toBe(3000); // 3000 new rent added
    expect(result.guest.rentStatus).toBe('unpaid');
    
    // Check if the next due date rolled exactly to June 5th (since anchor day is 5)
    expect(result.guest.dueDate).toBe('2024-06-05T12:00:00.000Z');
    
    // Verify a new ledger entry was generated
    expect(result.guest.ledger?.length).toBe(3);
    const newEntry = result.guest.ledger![2];
    expect(newEntry.amount).toBe(3000);
    expect(newEntry.date).toBe('2024-05-05T12:00:00.000Z'); // The date the cycle triggered
  });
});
