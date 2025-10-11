

import { runReconciliationLogic } from '../../src/lib/reconciliation';
import type { Guest, LedgerEntry } from '../../src/lib/types';
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
  rentAmount: 100, // Use a non-trivial amount
  depositAmount: 0,
  moveInDate: '2024-08-01T09:00:00.000Z',
  dueDate: '2024-08-01T10:00:00.000Z',
  isVacated: false,
  rentCycleUnit: 'minutes',
  rentCycleValue: 3,
  billingAnchorDay: 1,
  ledger: [], // Start with an empty ledger
  kycStatus: 'verified',
  noticePeriodDays: 30,
  ...overrides,
});

const calculateBalance = (ledger: LedgerEntry[]): number => {
    return ledger.reduce((balance, entry) => {
        return balance + (entry.type === 'debit' ? entry.amount : -entry.amount);
    }, 0);
}

describe('Rent Reconciliation Logic (Ledger-based)', () => {

    context('Minute-based cycles', () => {
        it('should correctly process a single overdue minute-based cycle', () => {
            const guest = createMockGuest({});
            const now = addMinutes(new Date(guest.dueDate), 4); // 1 cycle overdue
            const result = runReconciliationLogic(guest, now);
            
            expect(result.cyclesProcessed).to.equal(1);
            expect(result.guest.ledger.filter(e => e.type === 'debit').length).to.equal(1);
            expect(calculateBalance(result.guest.ledger)).to.equal(100); // 1 new rent debit
        });

        it('should correctly process multiple overdue minute-based cycles', () => {
            const guest = createMockGuest({});
            const now = addMinutes(new Date(guest.dueDate), 10); // 3 cycles overdue
            const result = runReconciliationLogic(guest, now);

            expect(result.cyclesProcessed).to.equal(3);
            expect(result.guest.ledger.filter(e => e.type === 'debit' && e.description.includes('Rent')).length).to.equal(3);
            expect(calculateBalance(result.guest.ledger)).to.equal(300); // 3 new rent debits
        });
        
        it('should handle a paid guest becoming overdue', () => {
            const initialLedger: LedgerEntry[] = [
                { id: 'rent-1', date: '2024-07-01T10:00:00.000Z', type: 'debit', description: 'Rent', amount: 100 },
                { id: 'pay-1', date: '2024-07-01T11:00:00.000Z', type: 'credit', description: 'Payment', amount: 100 },
            ];
            const guest = createMockGuest({ rentStatus: 'paid', ledger: initialLedger });
            const now = addMinutes(new Date(guest.dueDate), 4);
            const result = runReconciliationLogic(guest, now);

            expect(result.cyclesProcessed).to.equal(1);
            expect(result.guest.ledger.length).to.equal(3); // 2 initial + 1 new
            expect(calculateBalance(result.guest.ledger)).to.equal(100);
            expect(result.guest.rentStatus).to.equal('unpaid');
        });
        
        it('should correctly process multiple cycles for a previously paid guest', () => {
             const guest = createMockGuest({ rentStatus: 'paid', ledger: [] });
             const now = addMinutes(new Date(guest.dueDate), 10); // 3 cycles overdue
             const result = runReconciliationLogic(guest, now);

             expect(result.cyclesProcessed).to.equal(3);
             expect(calculateBalance(result.guest.ledger)).to.equal(300);
             expect(result.guest.rentStatus).to.equal('unpaid');
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

    context('Additional Charges & Partial Payments', () => {
        it('should not clear additional charges on reconciliation', () => {
            const initialLedger: LedgerEntry[] = [
                 { id: 'ac1', date: '2024-07-30T10:00:00.000Z', type: 'debit', description: 'Electricity', amount: 50 },
            ];
            const guest = createMockGuest({ ledger: initialLedger });
            const now = addMinutes(new Date(guest.dueDate), 4); // 1 cycle overdue

            const result = runReconciliationLogic(guest, now);

            expect(result.cyclesProcessed).to.equal(1);
            // Balance = 50 (initial charge) + 100 (new rent) = 150
            expect(calculateBalance(result.guest.ledger)).to.equal(150);
            // The electricity charge should still be in the ledger
            expect(result.guest.ledger.some(e => e.id === 'ac1')).to.be.true;
        });

        it('should handle partial payments correctly without affecting ledger history', () => {
            const initialLedger: LedgerEntry[] = [
                 { id: 'rent-1', date: '2024-07-01T10:00:00.000Z', type: 'debit', description: 'Rent', amount: 100 },
                 { id: 'ac1', date: '2024-07-15T10:00:00.000Z', type: 'debit', description: 'Damages', amount: 30 },
                 { id: 'pay-1', date: '2024-07-20T10:00:00.000Z', type: 'credit', description: 'Partial Payment', amount: 80 },
            ];
             const guest = createMockGuest({ ledger: initialLedger, rentStatus: 'partial' }); // Initial balance is 100+30-80 = 50
             const now = addMinutes(new Date(guest.dueDate), 4); // 1 cycle overdue
             const result = runReconciliationLogic(guest, now);

             expect(result.cyclesProcessed).to.equal(1);
             expect(result.guest.ledger.length).to.equal(4); // 3 initial + 1 new rent
             // New balance = 50 (previous) + 100 (new rent) = 150
             expect(calculateBalance(result.guest.ledger)).to.equal(150);
             expect(result.guest.rentStatus).to.equal('unpaid');
        });
    });

    context('Iterative Reconciliation', () => {
        it('should correctly process cycles sequentially', () => {
            let guest = createMockGuest({ rentStatus: 'paid', ledger: [] });
            
            // --- First reconciliation run ---
            // 2 cycles are overdue (3 * 2 = 6 minutes)
            let now1 = addMinutes(new Date(guest.dueDate), 7);
            let result1 = runReconciliationLogic(guest, now1);

            expect(result1.cyclesProcessed).to.equal(2);
            expect(calculateBalance(result1.guest.ledger)).to.equal(200);
            expect(result1.guest.rentStatus).to.equal('unpaid');
            expect(parseISO(result1.guest.dueDate).getMinutes()).to.equal(parseISO(guest.dueDate).getMinutes() + (2 * 3));

            // --- Second reconciliation run ---
            // Take the updated guest from the first run.
            let updatedGuest = result1.guest;

            // Simulate another 3 cycles passing from the *new* due date. (3 * 3 = 9 minutes)
            let now2 = addMinutes(new Date(updatedGuest.dueDate), 10);
            let result2 = runReconciliationLogic(updatedGuest, now2);

            expect(result2.cyclesProcessed).to.equal(3);
            // New balance should be the previous balance (200) + rent for 3 new cycles (300).
            expect(calculateBalance(result2.guest.ledger)).to.equal(500);
            expect(result2.guest.rentStatus).to.equal('unpaid');
        });
    });
});
