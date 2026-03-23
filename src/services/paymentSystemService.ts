
import { Firestore } from 'firebase-admin/firestore';
import { nanoid } from 'nanoid';
import { CURRENT_SCHEMA_VERSION, type Guest, type Payment } from '@/lib/types';
import { runReconciliationLogic } from '@/lib/reconciliation';
import { getBalanceBreakdown } from '@/lib/ledger-utils';

/**
 * Service for handling Smart UPI Payment System logic.
 * Separate from TenantService to keep focus and avoid file size limits.
 */
export class PaymentSystemService {
    
    /**
     * Ensures a guest has a unique shortId for UPI notes.
     */
    static async ensureShortId(db: Firestore, ownerId: string, guestId: string): Promise<string> {
        const guestRef = db.collection('users_data').doc(ownerId).collection('guests').doc(guestId);
        const guestSnap = await guestRef.get();
        if (!guestSnap.exists) throw new Error('Guest not found');
        
        const guest = guestSnap.data() as Guest;
        if (guest.shortId) return guest.shortId;

        // Generate a 4-5 char unique ID
        const shortId = nanoid(5).toUpperCase();
        await guestRef.update({ shortId, schemaVersion: CURRENT_SCHEMA_VERSION });
        return shortId;
    }

    /**
     * Creates a payment intent record in the guest's history.
     */
    static async createPaymentIntent(db: Firestore, ownerId: string, guestId: string, amount: number, month: string): Promise<string> {
        const guestRef = db.collection('users_data').doc(ownerId).collection('guests').doc(guestId);
        const paymentId = `upi_${Date.now()}`;
        
        const intent: Payment = {
            id: paymentId,
            amount: amount,
            status: 'INITIATED',
            createdAt: new Date().toISOString(),
            month: month,
            paymentMode: 'DIRECT_UPI',
            notes: `Rent for ${month}`,
            type: 'credit'
        };

        await guestRef.update({
            paymentHistory: (await guestRef.get()).data()?.paymentHistory ? [...(await guestRef.get()).data()?.paymentHistory, intent] : [intent],
            schemaVersion: CURRENT_SCHEMA_VERSION
        });

        return paymentId;
    }

    /**
     * Verifies a payment intent and updates the ledger.
     */
    static async verifyPaymentIntent(db: Firestore, ownerId: string, guestId: string, paymentId: string, verifiedAmount?: number): Promise<void> {
        let finalGuest: Guest | null = null;
        let creditId: string | null = null;

        await db.runTransaction(async (txn) => {
            const guestRef = db.collection('users_data').doc(ownerId).collection('guests').doc(guestId);
            const guestSnap = await txn.get(guestRef);
            if (!guestSnap.exists) throw new Error('Guest not found');

            const guest = guestSnap.data() as Guest;
            const paymentHistory = guest.paymentHistory || [];
            const paymentIndex = paymentHistory.findIndex(p => p.id === paymentId);

            if (paymentIndex === -1) throw new Error('Payment intent not found');
            if (paymentHistory[paymentIndex].status === 'VERIFIED') return; // Already verified

            const payment = paymentHistory[paymentIndex];
            const finalAmount = verifiedAmount ?? payment.amount;
            creditId = `cre_${Date.now()}_${nanoid(4)}`;

            // Update status
            paymentHistory[paymentIndex] = {
                ...payment,
                status: 'VERIFIED',
                amount: finalAmount,
                verifiedAt: new Date().toISOString()
            };

            // Add to ledger
            const creditEntry = {
                id: creditId,
                amount: finalAmount,
                type: 'credit' as const,
                date: new Date().toISOString(),
                description: `Rent Paid (UPI) - ${payment.month}`,
                paymentMode: 'DIRECT_UPI',
                status: 'success'
            };

            const updatedGuest = {
                ...guest,
                paymentHistory,
                ledger: [...(guest.ledger || []), creditEntry]
            };

            // Run reconciliation
            const { guest: reconciledGuest } = runReconciliationLogic(updatedGuest as Guest, new Date());
            const breakdown = getBalanceBreakdown(reconciledGuest);

            finalGuest = {
                ...reconciledGuest,
                balance: breakdown.total,
                symbolicBalance: (breakdown.symbolic || null) as any,
                schemaVersion: CURRENT_SCHEMA_VERSION
            };

            txn.set(guestRef, finalGuest, { merge: true });
        });

        // Send WhatsApp Receipt Template (Non-blocking)
        if (finalGuest && creditId) {
            const guest = finalGuest as Guest;
            const amount = verifiedAmount ?? guest.paymentHistory?.find(p => p.id === paymentId)?.amount ?? 0;
            
            (async () => {
                try {
                    const phone = guest.phone;
                    if (!phone) return;

                    let formattedPhone = phone.replace(/\D/g, '');
                    if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;

                    const { sendWhatsAppTemplate } = await import('@/lib/whatsapp/send-message');
                    
                    const appUrl = (process.env.APP_URL || 'https://roombox.in');
                    const receiptUrl = `${appUrl}/ledger/${creditId}`;

                    // rent_receipt_simple_3: [name, amount, month, receiptUrl]
                    const payment = guest.paymentHistory?.find(p => p.id === paymentId);
                    const month = payment?.month || 'Current Month';

                    await sendWhatsAppTemplate(
                        formattedPhone,
                        'rent_receipt_simple_3',
                        ownerId,
                        'en_US',
                        [], // Header
                        [
                            { type: 'text', text: guest.name },
                            { type: 'text', text: amount.toString() },
                            { type: 'text', text: month },
                            { type: 'text', text: receiptUrl }
                        ]
                    );
                    
                    console.log(`[PaymentSystemService] WhatsApp receipt sent for ${guest.name} (${paymentId})`);
                } catch (e: any) {
                    console.error('[PaymentSystemService] Error sending WhatsApp receipt:', e.message);
                }
            })();
        }
    }
}
