

import { runReconciliationLogic } from '../../src/lib/reconciliation';
import type { Guest, AdditionalCharge } from '../../src/lib/types';
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

describe('Rent Reconciliation Logic', () => {

    context('Minute-based cycles', () => {
        it('should correctly process a single overdue minute-based cycle', () => {
            const guest = createMockGuest({});
            const now = addMinutes(new Date(guest.dueDate), 4); // 1 cycle overdue
            const result = runReconciliationLogic(guest, now);
            
            expect(result.cyclesProcessed).to.equal(1);
            expect(result.guest.balanceBroughtForward).to.equal(2); // 1 initial + 1 new
        });

        it('should correctly process multiple overdue minute-based cycles', () => {
            const guest = createMockGuest({});
            const now = addMinutes(new Date(guest.dueDate), 10); // 3 cycles overdue
            const result = runReconciliationLogic(guest, now);

            expect(result.cyclesProcessed).to.equal(3);
            expect(result.guest.balanceBroughtForward).to.equal(4); // 1 initial + 3 new
        });
        
        it('should handle a paid guest becoming overdue', () => {
            const guest = createMockGuest({ rentStatus: 'paid', balanceBroughtForward: 0 });
            const now = addMinutes(new Date(guest.dueDate), 4);
            const result = runReconciliationLogic(guest, now);

            expect(result.cyclesProcessed).to.equal(1);
            expect(result.guest.balanceBroughtForward).to.equal(1);
            expect(result.guest.rentStatus).to.equal('unpaid');
        });
        
        it('should correctly process multiple cycles for a previously paid guest', () => {
             const guest = createMockGuest({ rentStatus: 'paid', balanceBroughtForward: 0 });
             const now = addMinutes(new Date(guest.dueDate), 10); // 3 cycles overdue
             const result = runReconciliationLogic(guest, now);

             expect(result.cyclesProcessed).to.equal(3);
             expect(result.guest.balanceBroughtForward).to.equal(3);
             expect(result.guest.rentStatus).to.equal('unpaid');
        });
    });

    context('Hour-based cycles', () => {
        it('should process a single overdue hour-based cycle', () => {
            const guest = createMockGuest({ rentCycleUnit: 'hours', rentCycleValue: 2, balanceBroughtForward: 0 });
            const now = addHours(new Date(guest.dueDate), 3);
            const result = runReconciliationLogic(guest, now);
            
            const expectedCycles = 1;
            const expectedBalance = expectedCycles * guest.rentAmount;

            expect(result.cyclesProcessed).to.equal(expectedCycles);
            expect(result.guest.balanceBroughtForward).to.equal(expectedBalance);
        });
    });

    context('Day-based cycles', () => {
        it('should process multiple overdue day-based cycles', () => {
            const guest = createMockGuest({ rentCycleUnit: 'days', rentCycleValue: 5, balanceBroughtForward: 10 });
            const now = addDays(new Date(guest.dueDate), 12);
            const result = runReconciliationLogic(guest, now);

            const expectedCycles = 2;
            const expectedBalance = 10 + (expectedCycles * guest.rentAmount);

            expect(result.cyclesProcessed).to.equal(expectedCycles);
            expect(result.guest.balanceBroughtForward).to.equal(expectedBalance);
        });
    });
    
    context('Month-based cycles', () => {
        it('should handle end-of-month billing correctly', () => {
            // Test case: Billing on Jan 31st, check for Feb 28th
            const guest = createMockGuest({ 
                rentCycleUnit: 'months', 
                rentCycleValue: 1, 
                dueDate: '2025-01-31T00:00:00.000Z',
                billingAnchorDay: 31,
                balanceBroughtForward: 0
            });
            const now = new Date('2025-03-01T00:00:00.000Z');
            const result = runReconciliationLogic(guest, now);

            expect(result.cyclesProcessed).to.equal(1);
            expect(result.guest.dueDate).to.equal('2025-02-28T00:00:00.000Z');
        });

        it('should handle leap year end-of-month billing', () => {
             const guest = createMockGuest({ 
                rentCycleUnit: 'months', 
                rentCycleValue: 1, 
                dueDate: '2024-01-31T00:00:00.000Z',
                billingAnchorDay: 31,
                balanceBroughtForward: 0
            });
            const now = new Date('2024-03-01T00:00:00.000Z');
            const result = runReconciliationLogic(guest, now);

            expect(result.cyclesProcessed).to.equal(1);
            expect(result.guest.dueDate).to.equal('2024-02-29T00:00:00.000Z');
        });
    });
    
    context('Additional Charges Scenarios', () => {
        it('should roll over unpaid additional charges into the new balance', () => {
            const charges: AdditionalCharge[] = [{ id: 'ac1', description: 'Mess Fee', amount: 5 }];
            const guest = createMockGuest({ 
                balanceBroughtForward: 0, 
                additionalCharges: charges,
                rentPaidAmount: 0,
            });

            // 1 cycle is overdue
            const now = addMinutes(new Date(guest.dueDate), 4);
            const result = runReconciliationLogic(guest, now);

            // Previous cycle's bill: 0 (bbf) + 1 (rent) + 5 (charge) = 6. Nothing paid.
            // New balance brought forward should be 6.
            // New cycle's rent (1) is then added. Total bbf = 6 + 1 = 7
            expect(result.cyclesProcessed).to.equal(1);
            expect(result.guest.balanceBroughtForward).to.equal(7);
            expect(result.guest.additionalCharges).to.have.lengthOf(0);
        });

        it('should handle partial payments with additional charges correctly', () => {
             const charges: AdditionalCharge[] = [{ id: 'ac1', description: 'Electricity', amount: 3 }];
             const guest = createMockGuest({ 
                balanceBroughtForward: 2, // From even earlier
                additionalCharges: charges,
                rentPaidAmount: 4, // Paid part of the bill
                rentAmount: 10,
            });

            // 1 cycle overdue
            const now = addMinutes(new Date(guest.dueDate), 4);
            const result = runReconciliationLogic(guest, now);
            
            // Previous cycle's bill: 2 (bbf) + 10 (rent) + 3 (charge) = 15.
            // Paid 4, so 11 was left unpaid. This is the new bbf.
            // New cycle's rent (10) is added. Total bbf = 11 + 10 = 21
            expect(result.cyclesProcessed).to.equal(1);
            expect(result.guest.balanceBroughtForward).to.equal(21);
            expect(result.guest.rentPaidAmount).to.equal(0);
            expect(result.guest.additionalCharges).to.have.lengthOf(0);
        });
    });

    context('General Cases', () => {
        it('should not process if not overdue', () => {
            const guest = createMockGuest({});
            const now = new Date(guest.dueDate);
            const result = runReconciliationLogic(guest, now);
            expect(result.cyclesProcessed).to.equal(0);
        });

        it('should not process for vacated or on-notice guests', () => {
            const vacatedGuest = createMockGuest({ isVacated: true });
            const noticeGuest = createMockGuest({ exitDate: new Date().toISOString() });
            const now = addDays(new Date(), 5);

            expect(runReconciliationLogic(vacatedGuest, now).cyclesProcessed).to.equal(0);
            expect(runReconciliationLogic(noticeGuest, now).cyclesProcessed).to.equal(0);
        });
    });

    context('Iterative Reconciliation', () => {
        it('should correctly process cycles sequentially', () => {
            let guest = createMockGuest({ rentStatus: 'paid', balanceBroughtForward: 0 });
            
            // --- First reconciliation run ---
            // 2 cycles are overdue (3 * 2 = 6 minutes)
            let now1 = addMinutes(new Date(guest.dueDate), 7);
            let result1 = runReconciliationLogic(guest, now1);

            // After 1st run, guest becomes unpaid, 2 cycles are processed.
            expect(result1.cyclesProcessed).to.equal(2);
            expect(result1.guest.balanceBroughtForward).to.equal(2);
            expect(result1.guest.rentStatus).to.equal('unpaid');
            expect(parseISO(result1.guest.dueDate).getMinutes()).to.equal(parseISO(guest.dueDate).getMinutes() + (2 * 3));

            // --- Second reconciliation run ---
            // Take the updated guest from the first run.
            let updatedGuest = result1.guest;

            // Simulate another 3 cycles passing from the *new* due date. (3 * 3 = 9 minutes)
            let now2 = addMinutes(new Date(updatedGuest.dueDate), 10);
            let result2 = runReconciliationLogic(updatedGuest, now2);

            // Expect 3 more cycles to be processed.
            expect(result2.cyclesProcessed).to.equal(3);
            // New balance should be the previous balance (2) + rent for 3 new cycles.
            expect(result2.guest.balanceBroughtForward).to.equal(2 + 3);
            expect(result2.guest.rentStatus).to.equal('unpaid');
        });
    });
});
