'use server'

import { getAdminDb, selectOwnerDataAdminDb } from '../firebaseAdmin'
import type { Guest, FinancialEvent, FinancialEventType } from '../types'
import { FieldValue } from 'firebase-admin/firestore'

/**
 * Records an immutable financial event and safely updates the tenant's computed balance.
 * Positive amounts = tenant owes money (charge)
 * Negative amounts = tenant paid money (credit)
 */
export async function recordFinancialEvent(data: {
  guestId: string;
  pgId: string;
  ownerId: string;
  type: FinancialEventType;
  amount: number;
  description: string;
  metadata?: any;
  performedBy: string;
  date?: string;
}): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    const adminDb = await selectOwnerDataAdminDb(data.ownerId);
    
    // Guest document reference
    const guestRef = adminDb.collection('users_data').doc(data.ownerId).collection('guests').doc(data.guestId);
    
    const result = await adminDb.runTransaction(async (transaction) => {
      const guestDoc = await transaction.get(guestRef);
      if (!guestDoc.exists) throw new Error('Guest not found');
      
      const guestData = guestDoc.data() as Guest;
      
      // Calculate new balance
      const currentBalance = guestData.balance ?? 0;
      let newBalance = currentBalance;
      let currentWallet = guestData.walletBalance ?? 0;
      let newWallet = currentWallet;
      
      // If it's a deposit received/refunded, it affects Escrow Wallet, NOT rent balance.
      if (data.type === 'deposit_received') {
        newWallet += Math.abs(data.amount);
      } else if (data.type === 'deposit_refunded') {
        newWallet -= Math.abs(data.amount);
      } else {
        // Standard rent or payment
        newBalance = currentBalance + data.amount;
      }
      
      // Create reference for the immutable event
      const eventRef = guestRef.collection('financial_events').doc();
      const eventDate = data.date || new Date().toISOString();

      // Legacy Ledger Entry (Backward Compatibility for Cron & Balance Calcs)
      const ledgerEntry = {
        id: eventRef.id,
        date: eventDate,
        type: data.amount < 0 ? 'credit' : 'debit',
        amount: Math.abs(data.amount),
        description: data.description
      };
      
      const updatedLedger = [...(guestData.ledger || []), ledgerEntry];

      // 1. Update Computed balances on Guest
      transaction.update(guestRef, {
        balance: newBalance,
        walletBalance: newWallet,
        ledger: updatedLedger,
        // Update rentStatus dynamically based on new balance
        rentStatus: newBalance <= 0 ? 'paid' : (newBalance < (guestData.rentAmount || 0) ? 'partial' : 'unpaid')
      });
      
      // 2. Insert Immutable Event
      const event: FinancialEvent = {
        id: eventRef.id,
        guestId: data.guestId,
        pgId: data.pgId,
        ownerId: data.ownerId,
        type: data.type,
        amount: data.amount,
        description: data.description,
        date: eventDate,
        createdAt: new Date().toISOString(),
        createdBy: data.performedBy,
        metadata: data.metadata || null,
        schemaVersion: 1
      };
      
      transaction.set(eventRef, event);
      
      return { newBalance, newWallet };
    });
    
    return { success: true, newBalance: result.newBalance };
  } catch (error: any) {
    console.error('Error recording financial event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Gets all financial events for a guest.
 */
export async function getFinancialEvents(ownerId: string, guestId: string): Promise<{ success: boolean; events?: FinancialEvent[]; error?: string }> {
  try {
    const adminDb = await selectOwnerDataAdminDb(ownerId);
    const snapshot = await adminDb
      .collection('users_data')
      .doc(ownerId)
      .collection('guests')
      .doc(guestId)
      .collection('financial_events')
      .orderBy('date', 'desc')
      .orderBy('createdAt', 'desc')
      .get();
      
    const events = snapshot.docs.map(doc => doc.data() as FinancialEvent);
    return { success: true, events };
  } catch (error: any) {
    console.error('Error fetching financial events:', error);
    return { success: false, error: error.message };
  }
}
