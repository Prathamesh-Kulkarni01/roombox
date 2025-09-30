
'use server';

import { calculateFirstDueDate } from '@/lib/utils';
import type { Guest } from './types';
import { format, parseISO, isBefore } from 'date-fns';

/**
 * This is a stand-alone, mock version of the reconciliation logic.
 * It does NOT use Firestore. It takes a guest object and a "now" time,
 * and returns the calculated result. This makes it pure, predictable, and perfect for testing.
 */
function runMockReconciliation(guest: Guest, now: Date): { guest: Guest, cyclesProcessed: number } {
  let dueDate = parseISO(guest.dueDate);
  let newDueDate = dueDate;
  let cyclesProcessed = 0;
  let newBalance = guest.balanceBroughtForward || 0;

  if (guest.isVacated || guest.exitDate) {
    return { guest, cyclesProcessed: 0 };
  }
  
  while (isBefore(newDueDate, now)) {
    newDueDate = calculateFirstDueDate(newDueDate, guest.rentCycleUnit, guest.rentCycleValue, guest.billingAnchorDay);
    cyclesProcessed++;
  }
  
  if (cyclesProcessed === 0) {
      return { guest, cyclesProcessed: 0 };
  }
  
  const unpaidFromLastCycle = guest.rentAmount - (guest.rentPaidAmount || 0) + (guest.balanceBroughtForward || 0);
  const rentForNewCycles = guest.rentAmount * (cyclesProcessed - 1);
  newBalance = unpaidFromLastCycle + rentForNewCycles;
  
  const updatedGuest: Guest = {
      ...guest,
      dueDate: format(newDueDate, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").replace('T23:59:59.000Z', 'T10:00:00.000Z').replace('.000Z',''), // Quick fix for date formatting
      balanceBroughtForward: newBalance,
      rentPaidAmount: 0,
      rentStatus: 'unpaid',
  };

  return { guest: updatedGuest, cyclesProcessed };
}


// --- Test Case Definitions ---

const createMockGuest = (overrides: Partial<Guest>): Guest => ({
  id: `guest-test`,
  name: 'Test Guest',
  email: 'guest@test.com',
  phone: '1234567890',
  pgId: 'pg-1',
  pgName: 'Test PG',
  bedId: 'bed-1',
  rentStatus: 'unpaid',
  rentAmount: 1,
  depositAmount: 0,
  moveInDate: '2024-08-01T09:00:00.000Z',
  dueDate: '2024-08-01T10:00:00.000Z',
  isVacated: false,
  rentCycleUnit: 'minutes',
  rentCycleValue: 3,
  billingAnchorDay: 1,
  balanceBroughtForward: 1,
  ...overrides,
});

const scenarios: { [key: string]: { guest: Guest; now: Date } } = {
  '2_mins_overdue': {
    guest: createMockGuest({}),
    now: new Date('2024-08-01T10:02:00.000Z'),
  },
  '4_mins_overdue': {
    guest: createMockGuest({}),
    now: new Date('2024-08-01T10:04:00.000Z'),
  },
  '7_mins_overdue': {
    guest: createMockGuest({}),
    now: new Date('2024-08-01T10:07:00.000Z'),
  },
   '9_mins_overdue': {
    guest: createMockGuest({}),
    now: new Date('2024-08-01T10:09:00.000Z'),
  },
  '1_month_overdue': {
    guest: createMockGuest({ rentCycleUnit: 'months', rentAmount: 1000, balanceBroughtForward: 0, dueDate: '2024-07-15' }),
    now: new Date('2024-08-15'),
  },
  '3_months_overdue': {
    guest: createMockGuest({ rentCycleUnit: 'months', rentAmount: 1000, balanceBroughtForward: 0, dueDate: '2024-05-15' }),
    now: new Date('2024-08-15'),
  },
  'fully_paid': {
    guest: createMockGuest({ rentStatus: 'paid', balanceBroughtForward: 0, dueDate: '2024-09-01' }),
    now: new Date('2024-08-15'),
  },
  'notice_period': {
    guest: createMockGuest({ exitDate: '2024-08-30' }),
    now: new Date('2024-08-15'),
  },
  'vacated': {
    guest: createMockGuest({ isVacated: true }),
    now: new Date('2024-08-15'),
  },
  'due_in_future': {
    guest: createMockGuest({ dueDate: '2024-09-01' }),
    now: new Date('2024-08-15'),
  },
  'due_today': {
    guest: createMockGuest({ dueDate: '2024-08-15' }),
    now: new Date('2024-08-15T12:00:00.000Z'),
  },
  'eom_31_to_30': {
    guest: createMockGuest({ rentCycleUnit: 'months', rentAmount: 5000, dueDate: '2024-08-31', billingAnchorDay: 31, balanceBroughtForward: 0 }),
    now: new Date('2024-10-01'),
  },
   'eom_feb_non_leap': {
    guest: createMockGuest({ rentCycleUnit: 'months', rentAmount: 5000, dueDate: '2025-01-31', billingAnchorDay: 31, balanceBroughtForward: 0 }),
    now: new Date('2025-03-01'),
  },
  'eom_feb_leap': {
    guest: createMockGuest({ rentCycleUnit: 'months', rentAmount: 5000, dueDate: '2024-01-31', billingAnchorDay: 31, balanceBroughtForward: 0 }),
    now: new Date('2024-03-01'),
  }
};


export function runReconciliationTest(scenarioName: string) {
    const scenario = scenarios[scenarioName];
    if (!scenario) {
        return { success: false, error: `Scenario "${scenarioName}" not found.` };
    }
    const result = runMockReconciliation(scenario.guest, scenario.now);
    return { success: true, ...result };
}
