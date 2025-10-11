

import { runReconciliationLogic } from "../../src/lib/reconciliation";
import type { Guest, LedgerEntry } from "../../src/lib/types";
import {
  addMinutes,
  addHours,
  addDays,
  addMonths,
  parseISO,
  isAfter,
  differenceInHours,
  differenceInDays,
} from "date-fns";

const createMockGuest = (overrides: Partial<Guest>): Guest => ({
  id: `guest-test`,
  name: "Test Guest",
  email: "guest@test.com",
  phone: "1234567890",
  pgId: "pg-1",
  pgName: "Test PG",
  bedId: "bed-1",
  rentStatus: "unpaid",
  rentAmount: 100,
  depositAmount: 0,
  moveInDate: "2024-08-01T09:00:00.000Z",
  // Due date is set for 3 minutes after move-in
  dueDate: "2024-08-01T09:03:00.000Z",
  isVacated: false,
  rentCycleUnit: "minutes",
  rentCycleValue: 3,
  billingAnchorDay: 1,
  // Ledger starts with the first rent debit
  ledger: [
     {
        id: "rent-initial",
        date: "2024-08-01T09:00:00.000Z",
        type: "debit",
        description: "First Rent Cycle",
        amount: 100,
     }
  ],
  kycStatus: "verified",
  noticePeriodDays: 30,
  ...overrides,
});

const calculateBalance = (ledger: LedgerEntry[]): number => {
  return ledger.reduce((balance, entry) => {
    return balance + (entry.type === "debit" ? entry.amount : -entry.amount);
  }, 0);
};

describe("Rent Reconciliation Logic (Ledger-based)", () => {
  context("Minute-based cycles", () => {
    it("should correctly process a single overdue minute-based cycle", () => {
      const guest = createMockGuest({}); // Balance is 100
      // 'now' is 1 minute past the first due date.
      const now = addMinutes(new Date(guest.dueDate), 1); 
      const result = runReconciliationLogic(guest, now);

      expect(result.cyclesProcessed).to.equal(1);
      // Ledger should have initial rent + 1 new rent debit
      expect(result.guest.ledger.filter((e) => e.type === "debit").length).to.equal(2); 
      expect(calculateBalance(result.guest.ledger)).to.equal(200);
    });

    it("should correctly process multiple overdue minute-based cycles", () => {
      const guest = createMockGuest({});
      // `now` is 7 minutes past the first due date (3 mins). 
      // This means the cycle due at 3mins and 6mins have passed. 2 cycles.
      const now = addMinutes(new Date(guest.dueDate), 4);
      const result = runReconciliationLogic(guest, now);

      expect(result.cyclesProcessed).to.equal(2);
      // Initial rent + 2 new rent debits
      expect(result.guest.ledger.filter((e) => e.type === "debit").length).to.equal(3);
      expect(calculateBalance(result.guest.ledger)).to.equal(300);
    });

    it("should handle a paid guest becoming overdue", () => {
      const initialLedger: LedgerEntry[] = [
        { id: "rent-1", date: "2024-07-01T10:00:00.000Z", type: "debit", description: "Rent", amount: 100 },
        { id: "pay-1", date: "2024-07-01T11:00:00.000Z", type: "credit", description: "Payment", amount: 100 },
      ];
      const guest = createMockGuest({
        rentStatus: "paid",
        ledger: initialLedger,
        dueDate: "2024-08-01T09:03:00.000Z"
      });
      
      const now = addMinutes(new Date(guest.dueDate), 1);
      const result = runReconciliationLogic(guest, now);

      expect(result.cyclesProcessed).to.equal(1);
      expect(result.guest.ledger.length).to.equal(3); // 2 initial + 1 new
      expect(calculateBalance(result.guest.ledger)).to.equal(100);
      expect(result.guest.rentStatus).to.equal("unpaid");
    });
  });

  context("General Cases", () => {
    it("should not process if not overdue", () => {
      const guest = createMockGuest({});
      const now = new Date(guest.dueDate); // Exactly at due date, not after.
      const result = runReconciliationLogic(guest, now);
      expect(result.cyclesProcessed).to.equal(0);
    });

    it("should not process for vacated or on-notice guests", () => {
      const vacatedGuest = createMockGuest({ isVacated: true });
      const noticeGuest = createMockGuest({ exitDate: new Date().toISOString() });
      const now = addDays(new Date(), 5);

      expect(runReconciliationLogic(vacatedGuest, now).cyclesProcessed).to.equal(0);
      expect(runReconciliationLogic(noticeGuest, now).cyclesProcessed).to.equal(0);
    });
  });

  context("Additional Charges & Partial Payments", () => {
    it("should not clear additional charges on reconciliation", () => {
      const initialLedger: LedgerEntry[] = [
        { id: "rent-initial", date: "2024-08-01T09:00:00.000Z", type: "debit", description: "First Rent Cycle", amount: 100 },
        { id: "ac1", date: "2024-08-01T09:01:00.000Z", type: "debit", description: "Electricity", amount: 50 },
      ];
      const guest = createMockGuest({ ledger: initialLedger });
      const now = addMinutes(new Date(guest.dueDate), 1); // 1 rent cycle overdue

      const result = runReconciliationLogic(guest, now);

      expect(result.cyclesProcessed).to.equal(1);
      // Balance = 100 (initial rent) + 50 (charge) + 100 (new rent) = 250
      expect(calculateBalance(result.guest.ledger)).to.equal(250);
      expect(result.guest.ledger.some((e) => e.id === "ac1")).to.be.true;
    });
  });

  context("Iterative Reconciliation and Complex Scenarios", () => {
    it("should correctly process cycles sequentially after payments", () => {
      let guest = createMockGuest({
        rentAmount: 1,
        rentCycleValue: 3,
        dueDate: "2024-08-01T09:03:00.000Z",
        ledger: [ { id: 'rent-initial', date: '2024-08-01T09:00:00.000Z', type: 'debit', amount: 1, description: 'Initial Rent' } ]
      });

      // --- First reconciliation run (2 cycles overdue) ---
      // dueDate is at 3 min. now is at 7 min. Cycles at 3 and 6 are overdue.
      let now1 = addMinutes(parseISO(guest.dueDate), 4);
      let result1 = runReconciliationLogic(guest, now1);

      expect(result1.cyclesProcessed).to.equal(2);
      expect(calculateBalance(result1.guest.ledger)).to.equal(3); // 1 (initial) + 2 (new)
      guest = result1.guest;

      // --- User pays full amount ---
      guest.ledger.push({ id: 'pay-1', date: new Date().toISOString(), type: 'credit', description: 'Payment', amount: 3 });
      expect(calculateBalance(guest.ledger)).to.equal(0);
      // Run reconciliation to update status based on new payment, but `now` is not past the new due date, so no new cycles
      guest = runReconciliationLogic(guest, now1).guest;
      expect(guest.rentStatus).to.equal('paid');
      
      // --- Third cycle becomes due ---
      // new dueDate is at 9 min. `now` is at 10 min.
      let now2 = addMinutes(parseISO(guest.dueDate), 1);
      let result2 = runReconciliationLogic(guest, now2);
      
      expect(result2.cyclesProcessed).to.equal(1);
      expect(calculateBalance(result2.guest.ledger)).to.equal(1); // 0 (previous balance) + 1 (new rent)
      guest = result2.guest;

      // --- Add additional charge ---
      guest.ledger.push({ id: 'ac1', date: new Date().toISOString(), type: 'debit', description: 'Electricity', amount: 2 });
      expect(calculateBalance(guest.ledger)).to.equal(3); // 1 (rent) + 2 (charge)

      // --- Fourth cycle becomes due ---
      // new dueDate is at 12 min. `now` is at 13 min.
      let now3 = addMinutes(parseISO(guest.dueDate), 1);
      let result3 = runReconciliationLogic(guest, now3);

      expect(result3.cyclesProcessed).to.equal(1);
      expect(calculateBalance(result3.guest.ledger)).to.equal(4); // 3 (previous balance) + 1 (new rent)
    });
  });
});
