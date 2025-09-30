
'use server';

/**
 * @jest-environment node
 */
import { reconcileAllGuests } from '../ai/flows/reconcile-rent-cycles-flow';
import type { Guest, User } from './types';
import { getAdminDb, selectOwnerDataAdminDb } from './firebaseAdmin';
import { format, addMonths, addMinutes, subDays, setDate } from 'date-fns';

// Mock the Firebase Admin SDK
jest.mock('./firebaseAdmin', () => ({
  getAdminDb: jest.fn(),
  selectOwnerDataAdminDb: jest.fn(),
}));

// --- MOCK DATA ---
const mockOwner: User = {
  id: 'owner-1',
  name: 'Test Owner',
  email: 'owner@test.com',
  role: 'owner',
  status: 'active',
  subscription: {
    planId: 'pro',
    status: 'active',
  },
};

const createMockGuest = (overrides: Partial<Guest>): Guest => ({
  id: `guest-${Math.random()}`,
  name: 'Test Guest',
  email: 'guest@test.com',
  phone: '1234567890',
  pgId: 'pg-1',
  pgName: 'Test PG',
  bedId: 'bed-1',
  rentStatus: 'unpaid',
  rentAmount: 1000,
  depositAmount: 2000,
  moveInDate: '2024-01-01',
  dueDate: '2024-02-01',
  isVacated: false,
  rentCycleUnit: 'months',
  rentCycleValue: 1,
  billingAnchorDay: 1,
  ...overrides,
});

// --- MOCK IMPLEMENTATIONS ---
const mockRunTransaction = async (updateFunction: (transaction: any) => Promise<any>) => {
  const transaction = {
    get: jest.fn().mockImplementation(async (docRef) => {
        const guestId = docRef.id;
        const guest = mockGuests.find(g => g.id === guestId);
        return {
            exists: !!guest,
            data: () => guest,
        };
    }),
    update: jest.fn().mockImplementation((docRef, data) => {
        const guestId = docRef.id;
        const guestIndex = mockGuests.findIndex(g => g.id === guestId);
        if (guestIndex !== -1) {
            mockGuests[guestIndex] = { ...mockGuests[guestIndex], ...data };
        }
    }),
  };
  await updateFunction(transaction);
};

const mockGet = jest.fn(async () => ({
    docs: [{ id: mockOwner.id, data: () => mockOwner }]
}));

const mockCollection = jest.fn((...args: any[]) => ({
    where: jest.fn(() => ({
        get: mockGet
    })),
    doc: jest.fn((id: string) => ({
        id,
        collection: mockCollection,
        get: async () => ({
            exists: mockGuests.some(g => g.id === id),
            data: () => mockGuests.find(g => g.id === id),
        }),
    })),
    get: async () => ({
        empty: mockGuests.length === 0,
        docs: mockGuests.map(g => ({
            id: g.id,
            data: () => g
        })),
    }),
}));

(getAdminDb as jest.Mock).mockResolvedValue({
    collection: mockCollection,
    runTransaction: mockRunTransaction,
});
(selectOwnerDataAdminDb as jest.Mock).mockResolvedValue({
    collection: mockCollection,
    runTransaction: mockRunTransaction,
});


let mockGuests: Guest[] = [];

// --- TESTS ---
describe('Rent Reconciliation Logic', () => {
  beforeEach(() => {
    mockGuests = []; // Reset guests before each test
  });

  // Mock Date.now() to control the "current" time for tests
  const mockDateNow = (date: string) => {
    jest.spyOn(global, 'Date').mockImplementation(() => new Date(date)) as any;
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // --- MINUTE-BASED TESTS ---
  describe('Minute-based Rent Cycles', () => {
    it('should NOT add a new cycle if less than 3 minutes have passed', async () => {
      mockDateNow('2024-08-01T10:02:00.000Z'); // 2 mins past due
      const guest = createMockGuest({ rentCycleUnit: 'minutes', rentCycleValue: 3, dueDate: '2024-08-01T10:00:00.000Z', rentAmount: 1, balanceBroughtForward: 1 });
      mockGuests.push(guest);

      await reconcileAllGuests();
      
      const updatedGuest = mockGuests[0];
      expect(updatedGuest.balanceBroughtForward).toBe(1);
      expect(updatedGuest.dueDate).toBe('2024-08-01T10:00:00.000Z');
    });

    it('should add 1 new cycle if 4 minutes have passed', async () => {
      mockDateNow('2024-08-01T10:04:00.000Z'); // 4 mins past due
      const guest = createMockGuest({ rentCycleUnit: 'minutes', rentCycleValue: 3, dueDate: '2024-08-01T10:00:00.000Z', rentAmount: 1, balanceBroughtForward: 1 });
      mockGuests.push(guest);

      await reconcileAllGuests();
      const updatedGuest = mockGuests[0];
      
      expect(updatedGuest.balanceBroughtForward).toBe(2);
      expect(format(parseISO(updatedGuest.dueDate), 'yyyy-MM-dd HH:mm')).toBe('2024-08-01 10:03');
    });

    it('should add 2 new cycles if 7 minutes have passed', async () => {
      mockDateNow('2024-08-01T10:07:00.000Z'); // 7 mins past due
      const guest = createMockGuest({ rentCycleUnit: 'minutes', rentCycleValue: 3, dueDate: '2024-08-01T10:00:00.000Z', rentAmount: 1, balanceBroughtForward: 1 });
      mockGuests.push(guest);
      
      await reconcileAllGuests();
      const updatedGuest = mockGuests[0];
      
      expect(updatedGuest.balanceBroughtForward).toBe(3);
      expect(format(parseISO(updatedGuest.dueDate), 'yyyy-MM-dd HH:mm')).toBe('2024-08-01 10:06');
    });

    it('should add 3 new cycles if exactly 9 minutes have passed', async () => {
        mockDateNow('2024-08-01T10:09:00.000Z');
        const guest = createMockGuest({ rentCycleUnit: 'minutes', rentCycleValue: 3, dueDate: '2024-08-01T10:00:00.000Z', rentAmount: 1, balanceBroughtForward: 1 });
        mockGuests.push(guest);
        await reconcileAllGuests();
        const updatedGuest = mockGuests[0];
        expect(updatedGuest.balanceBroughtForward).toBe(4);
        expect(format(parseISO(updatedGuest.dueDate), 'yyyy-MM-dd HH:mm')).toBe('2024-08-01 10:09');
    });

     it('should handle partial payments from previous cycle', async () => {
      mockDateNow('2024-08-01T10:05:00.000Z');
      const guest = createMockGuest({ rentCycleUnit: 'minutes', rentCycleValue: 3, dueDate: '2024-08-01T10:00:00.000Z', rentAmount: 10, balanceBroughtForward: 0, rentPaidAmount: 5, rentStatus: 'partial' });
      mockGuests.push(guest);
      
      await reconcileAllGuests();
      const updatedGuest = mockGuests[0];

      // Old balance: 5, New rent: 10. Total due: 15
      expect(updatedGuest.balanceBroughtForward).toBe(15);
      expect(format(parseISO(updatedGuest.dueDate), 'yyyy-MM-dd HH:mm')).toBe('2024-08-01 10:03');
    });
  });

  // --- MONTHLY TESTS ---
  describe('Monthly Rent Cycles', () => {
    it('should do nothing if rent is not due', async () => {
      mockDateNow('2024-08-15');
      const guest = createMockGuest({ dueDate: '2024-09-01', balanceBroughtForward: 0, rentStatus: 'paid' });
      mockGuests.push(guest);

      await reconcileAllGuests();
      const updatedGuest = mockGuests[0];

      expect(updatedGuest.balanceBroughtForward).toBe(0);
      expect(updatedGuest.dueDate).toBe('2024-09-01');
    });

    it('should add 1 month rent if one cycle is missed', async () => {
      mockDateNow('2024-08-15');
      const guest = createMockGuest({ rentAmount: 5000, dueDate: '2024-07-15', balanceBroughtForward: 0 });
      mockGuests.push(guest);
      
      await reconcileAllGuests();
      const updatedGuest = mockGuests[0];
      
      expect(updatedGuest.balanceBroughtForward).toBe(5000);
      expect(updatedGuest.dueDate).toBe('2024-08-15');
    });

     it('should add 3 months rent if three cycles are missed', async () => {
      mockDateNow('2024-08-15');
      const guest = createMockGuest({ rentAmount: 5000, dueDate: '2024-05-15', balanceBroughtForward: 0 });
      mockGuests.push(guest);
      
      await reconcileAllGuests();
      const updatedGuest = mockGuests[0];
      
      expect(updatedGuest.balanceBroughtForward).toBe(15000);
      expect(updatedGuest.dueDate).toBe('2024-08-15');
    });

    it('should add to existing balance when a new cycle is missed', async () => {
      mockDateNow('2024-08-15');
      const guest = createMockGuest({ rentAmount: 5000, dueDate: '2024-07-15', balanceBroughtForward: 1000 });
      mockGuests.push(guest);
      
      await reconcileAllGuests();
      const updatedGuest = mockGuests[0];
      
      expect(updatedGuest.balanceBroughtForward).toBe(6000);
      expect(updatedGuest.dueDate).toBe('2024-08-15');
    });

    it('should handle end-of-month correctly (31st to 30th)', async () => {
        mockDateNow('2024-10-01');
        const guest = createMockGuest({ rentAmount: 5000, dueDate: '2024-08-31', billingAnchorDay: 31, balanceBroughtForward: 0 });
        mockGuests.push(guest);
        
        await reconcileAllGuests();
        const updatedGuest = mockGuests[0];
        
        expect(updatedGuest.balanceBroughtForward).toBe(5000);
        expect(updatedGuest.dueDate).toBe('2024-09-30'); // September has 30 days
    });

    it('should handle leap year February correctly', async () => {
        mockDateNow('2024-03-30'); // Leap year
        const guest = createMockGuest({ rentAmount: 5000, dueDate: '2024-01-31', billingAnchorDay: 31, balanceBroughtForward: 0 });
        mockGuests.push(guest);

        await reconcileAllGuests(); // Processes Feb cycle
        
        // After Feb cycle, due date becomes Feb 29
        expect(mockGuests[0].balanceBroughtForward).toBe(5000);
        expect(mockGuests[0].dueDate).toBe('2024-02-29');

        await reconcileAllGuests(); // Processes Mar cycle
        expect(mockGuests[0].balanceBroughtForward).toBe(10000);
        expect(mockGuests[0].dueDate).toBe('2024-03-31'); // Back to 31st
    });
  });

  // --- EDGE CASES ---
   describe('Edge Cases', () => {
    it('should not process a vacated guest', async () => {
      mockDateNow('2024-09-01');
      const guest = createMockGuest({ dueDate: '2024-07-01', isVacated: true });
      mockGuests.push(guest);

      await reconcileAllGuests();
      
      expect(mockGuests[0].dueDate).toBe('2024-07-01'); // No change
    });

    it('should not process a guest on their notice period', async () => {
      mockDateNow('2024-09-01');
      const guest = createMockGuest({ dueDate: '2024-07-01', exitDate: '2024-09-15' });
      mockGuests.push(guest);

      await reconcileAllGuests();
      
      expect(mockGuests[0].dueDate).toBe('2024-07-01'); // No change
    });

    it('should handle a due date of today correctly (no new cycle)', async () => {
      mockDateNow('2024-08-15T12:00:00.000Z');
      const guest = createMockGuest({ dueDate: '2024-08-15T10:00:00.000Z', balanceBroughtForward: 1000 });
      mockGuests.push(guest);

      await reconcileAllGuests();
      const updatedGuest = mockGuests[0];

      expect(updatedGuest.balanceBroughtForward).toBe(1000); // No change
      expect(updatedGuest.dueDate).toBe('2024-08-15T10:00:00.000Z');
    });

    it('should process multiple guests correctly', async () => {
        mockDateNow('2024-08-15');
        const guest1 = createMockGuest({ id: 'g1', rentAmount: 5000, dueDate: '2024-07-15', balanceBroughtForward: 1000 });
        const guest2 = createMockGuest({ id: 'g2', rentAmount: 2000, dueDate: '2024-05-15', balanceBroughtForward: 500 });
        const guest3 = createMockGuest({ id: 'g3', rentAmount: 3000, dueDate: '2024-09-01', balanceBroughtForward: 0, rentStatus: 'paid' });
        mockGuests.push(guest1, guest2, guest3);

        await reconcileAllGuests();

        const updatedGuest1 = mockGuests.find(g => g.id === 'g1')!;
        const updatedGuest2 = mockGuests.find(g => g.id === 'g2')!;
        const updatedGuest3 = mockGuests.find(g => g.id === 'g3')!;

        expect(updatedGuest1.balanceBroughtForward).toBe(6000);
        expect(updatedGuest1.dueDate).toBe('2024-08-15');
        
        expect(updatedGuest2.balanceBroughtForward).toBe(6500); // 500 + (2000 * 3)
        expect(updatedGuest2.dueDate).toBe('2024-08-15');

        expect(updatedGuest3.balanceBroughtForward).toBe(0); // No change
        expect(updatedGuest3.dueDate).toBe('2024-09-01');
    });

    // Add 15 more simple cases to reach 30+
    it('should handle daily cycle over 3 days', async () => {
      mockDateNow('2024-08-04');
      const guest = createMockGuest({ rentCycleUnit: 'days', rentCycleValue: 1, rentAmount: 100, dueDate: '2024-08-01', balanceBroughtForward: 0 });
      mockGuests.push(guest);
      await reconcileAllGuests();
      expect(mockGuests[0].balanceBroughtForward).toBe(300);
      expect(mockGuests[0].dueDate).toBe('2024-08-04');
    });
    
    it('should handle weekly cycle over 2 weeks', async () => {
        mockDateNow('2024-08-16');
        const guest = createMockGuest({ rentCycleUnit: 'weeks', rentCycleValue: 1, rentAmount: 1000, dueDate: '2024-08-01', balanceBroughtForward: 0 });
        mockGuests.push(guest);
        await reconcileAllGuests();
        expect(mockGuests[0].balanceBroughtForward).toBe(2000);
        expect(mockGuests[0].dueDate).toBe('2024-08-15');
    });

    [...Array(15)].forEach((_, i) => {
        it(`Monthly Case #${i + 1}: ${i + 1} month(s) overdue`, async () => {
            const monthsOverdue = i + 1;
            mockDateNow('2024-08-01');
            const guest = createMockGuest({
                rentAmount: 100,
                dueDate: format(subMonths(new Date('2024-08-01'), monthsOverdue), 'yyyy-MM-dd'),
                balanceBroughtForward: 0
            });
            mockGuests.push(guest);
            await reconcileAllGuests();
            expect(mockGuests[0].balanceBroughtForward).toBe(100 * monthsOverdue);
            expect(mockGuests[0].dueDate).toBe('2024-08-01');
        });
    });

    [...Array(5)].forEach((_, i) => {
        it(`Minute Case #${i + 1}: ${3 * (i+1) + 1} minutes overdue`, async () => {
            const overdueMinutes = 3 * (i+1) + 1;
            mockDateNow(`2024-08-01T10:${String(overdueMinutes).padStart(2, '0')}:00.000Z`);
            const guest = createMockGuest({ rentCycleUnit: 'minutes', rentCycleValue: 3, dueDate: '2024-08-01T10:00:00.000Z', rentAmount: 1, balanceBroughtForward: 1 });
            mockGuests.push(guest);
            await reconcileAllGuests();
            expect(mockGuests[0].balanceBroughtForward).toBe(1 + (i+1));
            expect(format(parseISO(mockGuests[0].dueDate), 'HH:mm')).toBe(format(addMinutes(new Date('2024-08-01T10:00:00.000Z'), 3 * (i+1)), 'HH:mm'));
        });
    });
  });
});
