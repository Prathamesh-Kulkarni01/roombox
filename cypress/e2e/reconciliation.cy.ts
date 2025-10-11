
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
  rentAmount: 100, // Use a non-trivial amount
  depositAmount: 0,
  moveInDate: "2024-08-01T09:00:00.000Z",
  dueDate: "2024-08-01T10:00:00.000Z",
  isVacated: false,
  rentCycleUnit: "minutes",
  rentCycleValue: 3,
  billingAnchorDay: 1,
  ledger: [], // Start with an empty ledger
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
    it("should correctly process a single overdue minute-based cycle for a new guest", () => {
      // Simulate a guest whose first rent is already in the ledger
      const initialLedger: LedgerEntry[] = [
        {
          id: "rent-initial",
          date: "2024-08-01T09:00:00.000Z",
          type: "debit",
          description: "First Rent Cycle",
          amount: 100,
        },
      ];
      const guest = createMockGuest({ ledger: initialLedger }); // Balance is 100
      const now = addMinutes(new Date(guest.dueDate), 4); // 1 cycle overdue (3 min cycle + 1 min buffer)
      const result = runReconciliationLogic(guest, now);

      expect(result.cyclesProcessed).to.equal(1);
      expect(
        result.guest.ledger.filter((e) => e.type === "debit").length
      ).to.equal(2); // Initial rent + 1 new rent
      expect(calculateBalance(result.guest.ledger)).to.equal(200);
    });
    
    it("should correctly process a single overdue minute-based cycle", () => {
      const guest = createMockGuest({});
      const now = addMinutes(new Date(guest.dueDate), 4); // 1 cycle overdue
      const result = runReconciliationLogic(guest, now);

      expect(result.cyclesProcessed).to.equal(1);
      expect(
        result.guest.ledger.filter((e) => e.type === "debit").length
      ).to.equal(1);
      expect(calculateBalance(result.guest.ledger)).to.equal(100); // 1 new rent debit
    });

    it("should correctly process multiple overdue minute-based cycles", () => {
      const guest = createMockGuest({});
      const now = addMinutes(new Date(guest.dueDate), 10); // 3 cycles overdue
      const result = runReconciliationLogic(guest, now);

      expect(result.cyclesProcessed).to.equal(3);
      expect(
        result.guest.ledger.filter(
          (e) => e.type === "debit" && e.description.includes("Rent")
        ).length
      ).to.equal(3);
      expect(calculateBalance(result.guest.ledger)).to.equal(300); // 3 new rent debits
    });

    it("should handle a paid guest becoming overdue", () => {
      const initialLedger: LedgerEntry[] = [
        {
          id: "rent-1",
          date: "2024-07-01T10:00:00.000Z",
          type: "debit",
          description: "Rent",
          amount: 100,
        },
        {
          id: "pay-1",
          date: "2024-07-01T11:00:00.000Z",
          type: "credit",
          description: "Payment",
          amount: 100,
        },
      ];
      const guest = createMockGuest({
        rentStatus: "paid",
        ledger: initialLedger,
      });
      const now = addMinutes(new Date(guest.dueDate), 4);
      const result = runReconciliationLogic(guest, now);

      expect(result.cyclesProcessed).to.equal(1);
      expect(result.guest.ledger.length).to.equal(3); // 2 initial + 1 new
      expect(calculateBalance(result.guest.ledger)).to.equal(100);
      expect(result.guest.rentStatus).to.equal("unpaid");
    });

    it("should correctly process multiple cycles for a previously paid guest", () => {
      const guest = createMockGuest({ rentStatus: "paid", ledger: [] });
      const now = addMinutes(new Date(guest.dueDate), 10); // 3 cycles overdue
      const result = runReconciliationLogic(guest, now);

      expect(result.cyclesProcessed).to.equal(3);
      expect(calculateBalance(result.guest.ledger)).to.equal(300);
      expect(result.guest.rentStatus).to.equal("unpaid");
    });
  });

  context("General Cases", () => {
    it("should not process if not overdue", () => {
      const guest = createMockGuest({});
      const now = new Date(guest.dueDate);
      const result = runReconciliationLogic(guest, now);
      expect(result.cyclesProcessed).to.equal(0);
    });

    it("should not process for vacated or on-notice guests", () => {
      const vacatedGuest = createMockGuest({ isVacated: true });
      const noticeGuest = createMockGuest({
        exitDate: new Date().toISOString(),
      });
      const now = addDays(new Date(), 5);

      expect(
        runReconciliationLogic(vacatedGuest, now).cyclesProcessed
      ).to.equal(0);
      expect(runReconciliationLogic(noticeGuest, now).cyclesProcessed).to.equal(
        0
      );
    });
  });

  context("Additional Charges & Partial Payments", () => {
    it("should not clear additional charges on reconciliation", () => {
      const initialLedger: LedgerEntry[] = [
        {
          id: "ac1",
          date: "2024-07-30T10:00:00.000Z",
          type: "debit",
          description: "Electricity",
          amount: 50,
        },
      ];
      const guest = createMockGuest({ ledger: initialLedger });
      const now = addMinutes(new Date(guest.dueDate), 4); // 1 cycle overdue

      const result = runReconciliationLogic(guest, now);

      expect(result.cyclesProcessed).to.equal(1);
      // Balance = 50 (initial charge) + 100 (new rent) = 150
      expect(calculateBalance(result.guest.ledger)).to.equal(150);
      // The electricity charge should still be in the ledger
      expect(result.guest.ledger.some((e) => e.id === "ac1")).to.be.true;
    });

    it("should handle partial payments correctly without affecting ledger history", () => {
      const initialLedger: LedgerEntry[] = [
        {
          id: "rent-1",
          date: "2024-07-01T10:00:00.000Z",
          type: "debit",
          description: "Rent",
          amount: 100,
        },
        {
          id: "ac1",
          date: "2024-07-15T10:00:00.000Z",
          type: "debit",
          description: "Damages",
          amount: 30,
        },
        {
          id: "pay-1",
          date: "2024-07-20T10:00:00.000Z",
          type: "credit",
          description: "Partial Payment",
          amount: 80,
        },
      ];
      const guest = createMockGuest({
        ledger: initialLedger,
        rentStatus: "partial",
      }); // Initial balance is 100+30-80 = 50
      const now = addMinutes(new Date(guest.dueDate), 4); // 1 cycle overdue
      const result = runReconciliationLogic(guest, now);

      expect(result.cyclesProcessed).to.equal(1);
      expect(result.guest.ledger.length).to.equal(4); // 3 initial + 1 new rent
      // New balance = 50 (previous) + 100 (new rent) = 150
      expect(calculateBalance(result.guest.ledger)).to.equal(150);
      expect(result.guest.rentStatus).to.equal("unpaid");
    });
  });

  context("Iterative Reconciliation", () => {
    it("should correctly process cycles sequentially", () => {
      let guest = createMockGuest({ rentStatus: "paid", ledger: [] });

      // --- First reconciliation run ---
      // 2 cycles are overdue (3 * 2 = 6 minutes)
      let now1 = addMinutes(new Date(guest.dueDate), 7);
      let result1 = runReconciliationLogic(guest, now1);

      expect(result1.cyclesProcessed).to.equal(2);
      expect(calculateBalance(result1.guest.ledger)).to.equal(200);
      expect(result1.guest.rentStatus).to.equal("unpaid");
      expect(parseISO(result1.guest.dueDate).getMinutes()).to.equal(
        parseISO(guest.dueDate).getMinutes() + 2 * 3
      );

      // --- Second reconciliation run ---
      // Take the updated guest from the first run.
      let updatedGuest = result1.guest;

      // Simulate another 3 cycles passing from the *new* due date. (3 * 3 = 9 minutes)
      let now2 = addMinutes(new Date(updatedGuest.dueDate), 10);
      let result2 = runReconciliationLogic(updatedGuest, now2);

      expect(result2.cyclesProcessed).to.equal(3);
      // New balance should be the previous balance (200) + rent for 3 new cycles (300).
      expect(calculateBalance(result2.guest.ledger)).to.equal(500);
      expect(result2.guest.rentStatus).to.equal("unpaid");
    });

    it("should correctly handle a complex scenario of payments and charges", () => {
        let guest = createMockGuest({
          rentAmount: 1,
          rentCycleValue: 3,
          rentStatus: "paid",
          ledger: [], // Start with a completely clean slate
          dueDate: new Date().toISOString()
        });

        // --- First reconciliation run (2 cycles overdue) ---
        let now1 = addMinutes(parseISO(guest.dueDate), 7); // 7 mins past initial due
        let result1 = runReconciliationLogic(guest, now1);
  
        expect(result1.cyclesProcessed).to.equal(2);
        expect(calculateBalance(result1.guest.ledger)).to.equal(2);
        guest = result1.guest;
  
        // --- User pays full amount ---
        guest = {
          ...guest,
          ledger: [
            ...guest.ledger,
            {
              id: "pay-1",
              date: new Date().toISOString(),
              type: "credit",
              description: "Payment",
              amount: 2,
            },
          ],
        };
        expect(calculateBalance(guest.ledger)).to.equal(0);
  
        // --- Third cycle due (1 cycle after updated dueDate) ---
        let now2 = addMinutes(parseISO(guest.dueDate), guest.rentCycleValue + 1);
        let result2 = runReconciliationLogic(guest, now2);
  
        expect(result2.cyclesProcessed).to.equal(1);
        expect(calculateBalance(result2.guest.ledger)).to.equal(1);
        guest = result2.guest;
  
        // --- Add additional charge ---
        guest = {
          ...guest,
          ledger: [
            ...guest.ledger,
            {
              id: "ac1",
              date: new Date().toISOString(),
              type: "debit",
              description: "Electricity",
              amount: 2,
            },
          ],
        };
        expect(calculateBalance(guest.ledger)).to.equal(3); // 1 (rent) + 2 (charge)
  
        // --- Fourth cycle due ---
        let now3 = addMinutes(parseISO(guest.dueDate), guest.rentCycleValue + 1);
        let result3 = runReconciliationLogic(guest, now3);
  
        expect(result3.cyclesProcessed).to.equal(1);
        expect(calculateBalance(result3.guest.ledger)).to.equal(4); // 3 (previous balance) + 1 (new rent)
      });
      context('Minute-based complex cycles', () => {

    it('should handle multiple cycles with partial payments and extra charges', () => {
      let guest = createMockGuest({ rentAmount: 1, rentCycleValue: 3, rentStatus: 'paid' });

      // First run: 3 cycles overdue
      let now1 = addMinutes(parseISO(guest.dueDate), 10);
      let result1 = runReconciliationLogic(guest, now1);
      expect(result1.cyclesProcessed).to.equal(3);
      expect(calculateBalance(result1.guest.ledger)).to.equal(3);
      guest = result1.guest;

      // Partial payment: pay 2 units
      guest = {
        ...guest,
        ledger: [...guest.ledger, { id: 'pay-1', date: new Date().toISOString(), type: 'credit', description: 'Partial Payment', amount: 2 }],
      };
      expect(calculateBalance(guest.ledger)).to.equal(1);

      // Next cycle overdue: 1 cycle
      let now2 = addMinutes(parseISO(guest.dueDate), guest.rentCycleValue + 1);
      let result2 = runReconciliationLogic(guest, now2);
      expect(result2.cyclesProcessed).to.equal(1);
      expect(calculateBalance(result2.guest.ledger)).to.equal(2);
      guest = result2.guest;

      // Add extra charge
      guest = {
        ...guest,
        ledger: [...guest.ledger, { id: 'ac1', date: new Date().toISOString(), type: 'debit', description: 'Electricity', amount: 3 }],
      };
      expect(calculateBalance(guest.ledger)).to.equal(5);

      // Next two cycles overdue
      let now3 = addMinutes(parseISO(guest.dueDate), guest.rentCycleValue * 2 + 1);
      let result3 = runReconciliationLogic(guest, now3);
      expect(result3.cyclesProcessed).to.equal(2);
      expect(calculateBalance(result3.guest.ledger)).to.equal(7);
    });

    it('should handle paid → partial → unpaid transitions', () => {
      let guest = createMockGuest({ rentAmount: 5, rentCycleValue: 3, rentStatus: 'paid' });

      // First overdue cycle
      let now1 = addMinutes(parseISO(guest.dueDate), 4);
      let result1 = runReconciliationLogic(guest, now1);
      expect(result1.cyclesProcessed).to.equal(1);
      expect(calculateBalance(result1.guest.ledger)).to.equal(5);
      expect(result1.guest.rentStatus).to.equal('unpaid');
      guest = result1.guest;

      // Partial payment
      guest = {
        ...guest,
        ledger: [...guest.ledger, { id: 'pay-1', date: new Date().toISOString(), type: 'credit', description: 'Partial Payment', amount: 3 }],
      };
      expect(calculateBalance(guest.ledger)).to.equal(2);

      // Next overdue cycle
      let now2 = addMinutes(parseISO(guest.dueDate), guest.rentCycleValue + 1);
      let result2 = runReconciliationLogic(guest, now2);
      expect(result2.cyclesProcessed).to.equal(1);
      expect(calculateBalance(result2.guest.ledger)).to.equal(7);
      expect(result2.guest.rentStatus).to.equal('unpaid');
    });

  });

  context('Month-based complex cycles', () => {

    it('should handle multiple month-based cycles with payments and charges', () => {
      let guest = createMockGuest({ rentAmount: 1000, rentCycleUnit: 'months', rentCycleValue: 1, rentStatus: 'paid', dueDate: '2024-06-01T10:00:00.000Z' });

      // 2 months overdue
      let now1 = addMonths(parseISO(guest.dueDate), 2);
      let result1 = runReconciliationLogic(guest, now1);
      expect(result1.cyclesProcessed).to.equal(2);
      expect(calculateBalance(result1.guest.ledger)).to.equal(2000);
      guest = result1.guest;

      // Partial payment
      guest = {
        ...guest,
        ledger: [...guest.ledger, { id: 'pay-1', date: new Date().toISOString(), type: 'credit', description: 'Partial Payment', amount: 1200 }],
      };
      expect(calculateBalance(guest.ledger)).to.equal(800);
      expect(guest.rentStatus).to.equal('unpaid');

      // Additional charges
      guest = {
        ...guest,
        ledger: [...guest.ledger, { id: 'ac1', date: new Date().toISOString(), type: 'debit', description: 'Water', amount: 200 }],
      };
      expect(calculateBalance(guest.ledger)).to.equal(1000);

      // Another month overdue
      let now2 = addMonths(parseISO(guest.dueDate), 1);
      let result2 = runReconciliationLogic(guest, now2);
      expect(result2.cyclesProcessed).to.equal(1);
      expect(calculateBalance(result2.guest.ledger)).to.equal(2000);
    });

     it('should correctly process a guest moving from paid → unpaid → paid', () => {
      let guest = createMockGuest({
        rentCycleUnit: 'months',
        rentCycleValue: 1,
        rentAmount: 500,
        rentStatus: 'paid',
        ledger: []
      });

      // --- Step 1: 2 months overdue ---
      const now1 = addMonths(parseISO(guest.dueDate), 2);
      let result1 = runReconciliationLogic(guest, now1);
      guest = result1.guest;

      expect(result1.cyclesProcessed).to.equal(2);
      expect(calculateBalance(guest.ledger)).to.equal(1000);
      expect(guest.rentStatus).to.equal('unpaid');

      // --- Step 2: Pay full overdue amount ---
      guest = {
        ...guest,
        ledger: [...guest.ledger, {
          id: 'pay-1',
          date: new Date().toISOString(),
          type: 'credit',
          description: 'Payment',
          amount: 1000
        }]
      };
      // Run reconciliation to update status
      let afterPayment = runReconciliationLogic(guest, new Date());
      guest = afterPayment.guest;

      expect(calculateBalance(guest.ledger)).to.equal(0);
      expect(guest.rentStatus).to.equal('paid');

      // --- Step 3: 1 month overdue after payment ---
      const now2 = addMonths(parseISO(guest.dueDate), 1);
      let result2 = runReconciliationLogic(guest, now2);
      guest = result2.guest;

      expect(result2.cyclesProcessed).to.equal(1);
      expect(calculateBalance(guest.ledger)).to.equal(500);
      expect(guest.rentStatus).to.equal('unpaid');

      // --- Step 4: Partial payment ---
      guest = {
        ...guest,
        ledger: [...guest.ledger, {
          id: 'pay-2',
          date: new Date().toISOString(),
          type: 'credit',
          description: 'Partial Payment',
          amount: 200
        }]
      };
      guest = runReconciliationLogic(guest, new Date()).guest;

      expect(calculateBalance(guest.ledger)).to.equal(300);
      expect(guest.rentStatus).to.equal('partial');

      // --- Step 5: Pay remaining ---
      guest = {
        ...guest,
        ledger: [...guest.ledger, {
          id: 'pay-3',
          date: new Date().toISOString(),
          type: 'credit',
          description: 'Remaining Payment',
          amount: 300
        }]
      };
      guest = runReconciliationLogic(guest, new Date()).guest;

      expect(calculateBalance(guest.ledger)).to.equal(0);
      expect(guest.rentStatus).to.equal('paid');
    });

  });

  context('Additional Charges & Partial Payments', () => {

    it('should handle partial payments and additional charges', () => {
      const initialLedger: LedgerEntry[] = [
        { id: 'rent-1', date: '2024-07-01T10:00:00.000Z', type: 'debit', description: 'Rent', amount: 100 },
        { id: 'ac1', date: '2024-07-15T10:00:00.000Z', type: 'debit', description: 'Electricity', amount: 50 },
        { id: 'pay-1', date: '2024-07-20T10:00:00.000Z', type: 'credit', description: 'Partial Payment', amount: 80 },
      ];

      const guest = createMockGuest({ ledger: initialLedger, rentStatus: 'partial', rentCycleUnit: 'minutes', rentCycleValue: 3 });
      const now = addMinutes(parseISO(guest.dueDate), 4); // 1 cycle overdue

      const result = runReconciliationLogic(guest, now);

      expect(result.cyclesProcessed).to.equal(1);
      expect(result.guest.ledger.length).to.equal(4); // 3 initial + 1 rent
      expect(calculateBalance(result.guest.ledger)).to.equal(150);
      expect(result.guest.rentStatus).to.equal('unpaid'); 
    });

  });
  });
});
