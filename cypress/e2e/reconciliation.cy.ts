import { runReconciliationLogic } from '../../src/lib/reconciliation';
import type { Guest } from '../../src/lib/types';
import { addMinutes, addHours, addDays, addMonths, parseISO, isAfter, differenceInHours, differenceInDays } from 'date-fns';

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
  rentPaidAmount: 0,
  kycStatus: 'verified',
  noticePeriodDays: 30,
  ...overrides,
});

describe('Extended Rent Reconciliation Tests (50+ Scenarios)', () => {

  // ---------------------------
  // 1. Minute-based Cycles
  // ---------------------------
  context('Minute-based cycles', () => {
    for (let i = 1; i <= 10; i++) {
      it(`Minute Cycle Overdue #${i} - ${i} cycle(s) overdue`, () => {
        const guest = createMockGuest({});
        const now = addMinutes(new Date(guest.dueDate), 3 * i + 1); // i cycles overdue
        const result = runReconciliationLogic(guest, now);

        expect(result.cyclesProcessed).to.equal(i);
        expect(result.guest.balanceBroughtForward).to.equal(1 + i);
      });
    }
  });

  // ---------------------------
  // 2. Hour-based Cycles
  // ---------------------------
  context('Hour-based cycles', () => {
    for (let i = 1; i <= 5; i++) {
        it(`Hourly Cycle Overdue #${i} - should process ${i} cycle(s)`, () => {
            const guest = createMockGuest({
                rentCycleUnit: 'hours',
                rentCycleValue: 1,
                rentAmount: 100,
                balanceBroughtForward: 0,
            });

            const now = addHours(new Date(guest.dueDate), i);
            const result = runReconciliationLogic(guest, now);
            
            const expectedCycles = Math.floor(differenceInHours(now, parseISO(guest.dueDate)) / guest.rentCycleValue);
            const expectedBalance = expectedCycles * guest.rentAmount;

            expect(result.cyclesProcessed).to.equal(expectedCycles);
            expect(result.guest.balanceBroughtForward).to.equal(expectedBalance);
        });
    }
  });
  // ---------------------------
  // 3. Day-based Cycles
  // ---------------------------
  context('Day-based cycles', () => {
    for (let i = 1; i <= 7; i++) {
        it(`Daily Cycle Overdue #${i} - should process ${i} cycle(s)`, () => {
            const guest = createMockGuest({
                rentCycleUnit: 'days',
                rentCycleValue: 1,
                rentAmount: 500,
                balanceBroughtForward: 0,
            });

            const now = addDays(new Date(guest.dueDate), i);
            const result = runReconciliationLogic(guest, now);

            const expectedCycles = Math.floor(differenceInDays(now, parseISO(guest.dueDate)) / guest.rentCycleValue);
            const expectedBalance = expectedCycles * guest.rentAmount;

            expect(result.cyclesProcessed).to.equal(expectedCycles);
            expect(result.guest.balanceBroughtForward).to.equal(expectedBalance);
        });
    }
  });

  // ---------------------------
  // 4. Month-based Cycles
  // ---------------------------
  context('Month-based cycles', () => {
    for (let i = 1; i <= 12; i++) {
      it(`Monthly Cycle Overdue #${i} - ${i} month(s) overdue`, () => {
        const guest = createMockGuest({ rentCycleUnit: 'months', rentCycleValue: 1, rentAmount: 1000, dueDate: '2024-01-01T00:00:00.000Z', balanceBroughtForward: 1000, billingAnchorDay: 1 });
        const now = addMonths(new Date(guest.dueDate), i);
        const result = runReconciliationLogic(guest, now);

        expect(result.cyclesProcessed).to.equal(i);
        expect(result.guest.balanceBroughtForward).to.equal(1000 + i * 1000);
      });
    }
  });

  // ---------------------------
  // 5. Paid → Overdue Transitions
  // ---------------------------
  context('Paid → Overdue transitions', () => {
    it('Paid guest becomes 1 cycle overdue', () => {
      const guest = createMockGuest({ rentStatus: 'paid', balanceBroughtForward: 0 });
      const now = addMinutes(new Date(guest.dueDate), 4);
      const result = runReconciliationLogic(guest, now);

      expect(result.cyclesProcessed).to.equal(1);
      expect(result.guest.balanceBroughtForward).to.equal(1);
      expect(result.guest.rentStatus).to.equal('unpaid');
    });

    it('Paid guest becomes 3 cycles overdue', () => {
      const guest = createMockGuest({ rentStatus: 'paid', balanceBroughtForward: 0 });
      const now = addMinutes(new Date(guest.dueDate), 10);
      const result = runReconciliationLogic(guest, now);

      expect(result.cyclesProcessed).to.equal(3);
      expect(result.guest.balanceBroughtForward).to.equal(3);
      expect(result.guest.rentStatus).to.equal('unpaid');
    });
  });

  // ---------------------------
  // 6. Notice Period & Vacated
  // ---------------------------
  context('Notice period & vacated guests', () => {
    it('Guest on notice period should not accrue cycles', () => {
      const guest = createMockGuest({ exitDate: '2024-08-30T00:00:00.000Z' });
      const now = addDays(new Date(guest.dueDate), 10);
      const result = runReconciliationLogic(guest, now);

      expect(result.cyclesProcessed).to.equal(0);
    });

    it('Guest already vacated should not accrue cycles', () => {
      const guest = createMockGuest({ isVacated: true });
      const now = addDays(new Date(guest.dueDate), 5);
      const result = runReconciliationLogic(guest, now);

      expect(result.cyclesProcessed).to.equal(0);
    });
  });

  // ---------------------------
  // 7. End-of-Month & Leap Year
  // ---------------------------
  context('End-of-month & leap year scenarios', () => {
    it('Jan 31 → Feb 28 (non-leap year)', () => {
      const guest = createMockGuest({ rentCycleUnit: 'months', rentCycleValue: 1, rentAmount: 5000, dueDate: '2025-01-31T00:00:00.000Z', balanceBroughtForward: 0, billingAnchorDay: 31 });
      const now = new Date('2025-03-01T00:00:00.000Z');
      const result = runReconciliationLogic(guest, now);

      expect(result.cyclesProcessed).to.equal(1);
      expect(result.guest.dueDate).to.equal('2025-02-28T00:00:00.000Z');
    });

    it('Jan 31 → Feb 29 (leap year)', () => {
      const guest = createMockGuest({ rentCycleUnit: 'months', rentCycleValue: 1, rentAmount: 5000, dueDate: '2024-01-31T00:00:00.000Z', balanceBroughtForward: 0, billingAnchorDay: 31 });
      const now = new Date('2024-03-01T00:00:00.000Z');
      const result = runReconciliationLogic(guest, now);

      expect(result.cyclesProcessed).to.equal(1);
      expect(result.guest.dueDate).to.equal('2024-02-29T00:00:00.000Z');
    });

    it('Guest with billing anchor day 30 for 31-day month', () => {
      const guest = createMockGuest({ rentCycleUnit: 'months', rentCycleValue: 1, rentAmount: 3000, dueDate: '2024-07-30T00:00:00.000Z', balanceBroughtForward: 0, billingAnchorDay: 30 });
      const now = new Date('2024-08-31T00:00:00.000Z');
      const result = runReconciliationLogic(guest, now);

      expect(result.cyclesProcessed).to.equal(1);
      expect(result.guest.dueDate).to.equal('2024-08-30T00:00:00.000Z');
    });
  });

  // ---------------------------
  // 8. Complex Multi-Cycle
  // ---------------------------
  context('Complex multi-cycle scenarios', () => {
    it('Guest missed 2 cycles, paid partially, then overdue again', () => {
      let guest = createMockGuest({});
      let now = addMinutes(new Date(guest.dueDate), 7); // 2 cycles
      let result = runReconciliationLogic(guest, now);

      expect(result.cyclesProcessed).to.equal(2);
      expect(result.guest.balanceBroughtForward).to.equal(3);

      // Partial payment
      guest = { ...result.guest, rentStatus: 'paid', balanceBroughtForward: 1 };
      now = addMinutes(new Date(guest.dueDate), 4); // 1 cycle overdue
      result = runReconciliationLogic(guest, now);

      expect(result.cyclesProcessed).to.equal(1);
      expect(result.guest.balanceBroughtForward).to.equal(2);
      expect(result.guest.rentStatus).to.equal('unpaid');
    });
  });

  // ---------------------------
  // 9. Rapid consecutive cycles
  // ---------------------------
  context('Rapid consecutive minute cycles', () => {
    for (let i = 1; i <= 10; i++) {
      it(`Rapid Cycle #${i} - guest misses ${i} consecutive cycles`, () => {
        const guest = createMockGuest({});
        const now = addMinutes(new Date(guest.dueDate), 3 * i + 2);
        const result = runReconciliationLogic(guest, now);

        expect(result.cyclesProcessed).to.equal(i);
        expect(result.guest.balanceBroughtForward).to.equal(1 + i);
      });
    }
  });

  // ---------------------------
  // 10. Randomized real-world scenarios
  // ---------------------------
  context('Randomized scenarios', () => {
    const cycleUnits = ['minutes', 'hours', 'days', 'months'] as const;
    for (let i = 1; i <= 20; i++) {
      it(`Random Scenario #${i}`, () => {
        const unit = cycleUnits[Math.floor(Math.random() * cycleUnits.length)];
        const guest = createMockGuest({ rentCycleUnit: unit, rentAmount: 100 * i, balanceBroughtForward: 50 * i });
        const now = addDays(new Date(guest.dueDate), i % 5 + 1); // random days overdue
        const result = runReconciliationLogic(guest, now);

        expect(result.cyclesProcessed).to.be.at.least(0);
expect(result.guest.balanceBroughtForward).to.be.at.least(guest.balanceBroughtForward);

      });
    }
  });

});

    