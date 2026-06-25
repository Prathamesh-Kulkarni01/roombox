import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, updateDoc, query, orderBy, serverTimestamp, where, runTransaction } from 'firebase/firestore';
import { RefundRecord, Guest, Expense } from '../types';

export const calculateMoveOutDues = async (ownerId: string, guestId: string): Promise<Partial<RefundRecord>> => {
  if (!ownerId || !guestId) throw new Error('Owner ID and Guest ID are required');

  const guestRef = doc(db!, `users/${ownerId}/guests`, guestId);
  const guestDoc = await getDocs(query(collection(db!, `users/${ownerId}/guests`), where('id', '==', guestId)));
  
  if (guestDoc.empty) throw new Error('Guest not found');
  
  const guest = guestDoc.docs[0].data() as Guest;
  
  // Look for security deposit in ledger (or we could use the symbolic values if using symbolic logic)
  // For this demo, let's assume `deposit` is tracked in the ledger as a debit that was paid via credits, 
  // or more simply, RoomBox often tracks `deposit` on the Guest level (though we'll calculate based on balance).
  // Real calculation: Unpaid rent = balance
  const unpaidRent = guest.balance || 0;
  
  // Find deposit: typically we sum 'Security Deposit' payments from ledger if it's detailed, 
  // but for simplicity we'll assume a standard deposit of 1 month's rent.
  // We'll set a placeholder originalDeposit which the UI can override.
  const originalDeposit = guest.symbolicDepositValue ? parseInt(guest.symbolicDepositValue.replace(/[^0-9]/g, '')) || 0 : (guest.rentPaidAmount || 0);

  return {
    guestId,
    guestName: guest.name,
    pgId: guest.pgId,
    originalDeposit: originalDeposit || 10000, // Fallback placeholder
    unpaidRentDeduction: unpaidRent > 0 ? unpaidRent : 0,
    damageDeduction: 0,
    finalRefundAmount: (originalDeposit || 10000) - (unpaidRent > 0 ? unpaidRent : 0)
  };
};

export const processMoveOutSettlement = async (ownerId: string, data: Omit<RefundRecord, 'id' | 'ownerId' | 'createdAt' | 'updatedAt' | 'status' | 'refundDate'>): Promise<string> => {
  if (!ownerId) throw new Error('Owner ID is required');

  const refundRef = doc(collection(db!, `users/${ownerId}/refund_records`));
  const newRefund: RefundRecord = {
    ...data,
    id: refundRef.id,
    ownerId,
    refundDate: new Date().toISOString(),
    status: 'completed',
  };

  await runTransaction(db!, async (transaction) => {
    // 1. Save Refund Record
    transaction.set(refundRef, {
      ...newRefund,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 2. Update Guest Status
    const guestRef = doc(db!, `users/${ownerId}/guests`, data.guestId);
    transaction.update(guestRef, {
      status: 'vacated',
      isVacated: true,
      exitDate: new Date().toISOString(),
      updatedAt: serverTimestamp()
    });

    // 3. Create Expense Record for the accounting dashboard
    if (data.finalRefundAmount > 0 && data.refundMethod !== 'waived') {
      const expenseRef = doc(collection(db!, `users/${ownerId}/expenses`));
      const expenseData: Expense = {
        id: expenseRef.id,
        ownerId,
        pgId: data.pgId,
        category: 'other',
        description: `Security Deposit Refund - ${data.guestName}`,
        amount: data.finalRefundAmount,
        date: new Date().toISOString(),
        paymentMode: data.refundMethod,
      };
      transaction.set(expenseRef, {
        ...expenseData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Note: Bed freeing is usually handled by listening to guest status changes, 
    // or by updating the room doc directly. For safety, we will leave the bed update 
    // to the main guest slice logic which typically watches 'isVacated', or we assume 
    // the system computes occupancy dynamically from active guests.
  });

  return refundRef.id;
};

export const fetchRefundRecords = async (ownerId: string, pgId: string): Promise<RefundRecord[]> => {
  if (!ownerId) return [];
  const refundsRef = collection(db!, `users/${ownerId}/refund_records`);
  const q = query(refundsRef, where('pgId', '==', pgId), orderBy('refundDate', 'desc'));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as RefundRecord));
};
