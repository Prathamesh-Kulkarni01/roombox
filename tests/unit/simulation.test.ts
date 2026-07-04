import { describe, it, expect } from 'vitest';
import { runReconciliationLogic } from '../../src/lib/reconciliation';
import { getReminderForGuest } from '../../src/lib/reminder-logic';
import { Guest } from '../../src/lib/types';
import { addDays, addMonths, isSameDay } from 'date-fns';

describe('Long Term Simulation: 1 Year Reconciliation and Reminders', () => {
  it('should correctly process 1 year for Anniversary vs Fixed Date tenants', () => {
    
    let currentSimDate = new Date('2024-01-01T12:00:00.000Z');
    const endDate = new Date('2024-12-31T12:00:00.000Z');

    // Tenant 1: Standard Anniversary (Joined Jan 15th)
    let tenant1: Guest = {
      id: 'g-anniv',
      ownerId: 'o-1',
      name: 'Anniversary Tenant',
      phone: '+919999999991',
      pgId: 'pg-1',
      roomId: 'r-1',
      bedId: 'b-1',
      rentAmount: 5000,
      balance: 0,
      paidAmount: 0,
      rentStatus: 'paid',
      paymentStatus: 'paid',
      isVacated: false,
      ledger: [],
      joinDate: '2024-01-15T12:00:00.000Z',
      dueDate: '2024-02-15T12:00:00.000Z',
      rentCycleUnit: 'months',
      rentCycleValue: 1,
      billingAnchorDay: 15,
      createdAt: '2024-01-15T12:00:00.000Z',
      updatedAt: '2024-01-15T12:00:00.000Z',
      amountType: 'numeric'
    } as any;

    // Tenant 2: Fixed Date (Joined Jan 15th, fixed date 5th)
    // Initial prorated already done. Next due date Feb 5th.
    let tenant2: Guest = {
      id: 'g-fixed',
      ownerId: 'o-1',
      name: 'Fixed Date Tenant',
      phone: '+919999999992',
      pgId: 'pg-2',
      roomId: 'r-2',
      bedId: 'b-2',
      rentAmount: 6000,
      balance: 0,
      paidAmount: 0,
      rentStatus: 'paid',
      paymentStatus: 'paid',
      isVacated: false,
      ledger: [],
      joinDate: '2024-01-15T12:00:00.000Z',
      dueDate: '2024-02-05T12:00:00.000Z',
      rentCycleUnit: 'months',
      rentCycleValue: 1,
      billingAnchorDay: 5,
      createdAt: '2024-01-15T12:00:00.000Z',
      updatedAt: '2024-01-15T12:00:00.000Z',
      amountType: 'numeric'
    } as any;

    let tenant1ReconciliationCount = 0;
    let tenant2ReconciliationCount = 0;
    
    let tenant1T1Count = 0;
    let tenant2T1Count = 0;

    // Simulate daily cron job over a year
    while (currentSimDate <= endDate) {
      
      // Check reminders BEFORE reconciliation (which might roll the due date)
      const r1 = getReminderForGuest(tenant1, currentSimDate);
      const r2 = getReminderForGuest(tenant2, currentSimDate);
      
      if (r1.shouldSend && r1.type === 'T-1') tenant1T1Count++;
      if (r2.shouldSend && r2.type === 'T-1') tenant2T1Count++;

      // Run reconciliation
      const res1 = runReconciliationLogic(tenant1, currentSimDate);
      if (res1.cyclesProcessed > 0) {
        tenant1ReconciliationCount += res1.cyclesProcessed;
        tenant1 = { ...res1.guest } as any;
        // Mock paying the rent a few days later so balance goes to 0
        tenant1.balance = 0;
        tenant1.rentStatus = 'paid';
      }

      const res2 = runReconciliationLogic(tenant2, currentSimDate);
      if (res2.cyclesProcessed > 0) {
        tenant2ReconciliationCount += res2.cyclesProcessed;
        tenant2 = { ...res2.guest } as any;
        // Mock paying the rent
        tenant2.balance = 0;
        tenant2.rentStatus = 'paid';
      }

      currentSimDate = addDays(currentSimDate, 1);
    }

    // Over 11 remaining months (Feb -> Dec), there should be 11 cycles
    expect(tenant1ReconciliationCount).toBe(11);
    expect(tenant2ReconciliationCount).toBe(11);
    
    // There should be 11 T-1 reminders sent for each tenant
    expect(tenant1T1Count).toBe(11);
    expect(tenant2T1Count).toBe(11);
    
    // Check final due dates
    expect(tenant1.dueDate).toBe('2025-01-15T12:00:00.000Z');
    expect(tenant2.dueDate).toBe('2025-01-05T12:00:00.000Z');
  });
});
