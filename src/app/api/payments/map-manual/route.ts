import { NextRequest, NextResponse } from 'next/server';
import { Transaction } from 'firebase-admin/firestore';
import { selectOwnerDataAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { nanoid } from 'nanoid';
import { PaymentSystemService } from '@/services/paymentSystemService';

export async function POST(req: NextRequest) {
    try {
        const token = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        
        const auth = await getAdminAuth();
        const decodedToken = await auth.verifyIdToken(token);
        const requestOwnerId = decodedToken.uid;
        
        const { guestId, amount, noteOrUtr, ownerId } = await req.json();

        // Enforce owner check
        if (requestOwnerId !== ownerId) {
            return NextResponse.json({ error: 'Unauthorized Owner Action' }, { status: 403 });
        }

        const db = await selectOwnerDataAdminDb(ownerId);
        let finalPaymentId = '';

        await db.runTransaction(async (txn) => {
            // Check UTR duplicate
            if (noteOrUtr && noteOrUtr.length >= 6) {
                // If it looks like a UTR
                const cleanUtr = noteOrUtr.toUpperCase().replace(/[^A-Z0-9]/g, '');
                const utrRef = db.collection('users_data').doc(ownerId).collection('utrs').doc(cleanUtr);
                const utrSnap = await txn.get(utrRef);
                if (utrSnap.exists) {
                    throw new Error(`This Reference [${cleanUtr}] is already mapped to another payment.`);
                }
            }

            const guestRef = db.collection('users_data').doc(ownerId).collection('guests').doc(guestId);
            const guestSnap = await txn.get(guestRef);
            if (!guestSnap.exists) throw new Error('Guest not found');

            const timestamp = new Date().toISOString();
            
            // Generate a manual payment intent
            const paymentId = `upi_manual_${nanoid(10)}`;
            finalPaymentId = paymentId;
            
            const guest = guestSnap.data() as any;
            
            const newPayment = {
                id: paymentId,
                amount: Number(amount) || 0,
                method: 'direct_upi',
                month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
                type: 'credit',
                status: 'INITIATED',
                utr: noteOrUtr,
                schemaVersion: 4,
                createdAt: timestamp,
                claimedAt: timestamp,
                date: timestamp // legacy
            };

            const updatedHistory = [...(guest.paymentHistory || []), newPayment];
            
            // Mark duplicate protection if valid UTR
            if (noteOrUtr && noteOrUtr.length >= 6) {
                const cleanUtr = noteOrUtr.toUpperCase().replace(/[^A-Z0-9]/g, '');
                const utrRef = db.collection('users_data').doc(ownerId).collection('utrs').doc(cleanUtr);
                txn.set(utrRef, {
                    paymentId,
                    guestId,
                    claimedAt: timestamp,
                    schemaVersion: 1
                });
            }

            txn.update(guestRef, {
                paymentHistory: updatedHistory,
                lastPaymentDate: timestamp
            });
        });

        // Instantly Verify it using PaymentSystemService
        await PaymentSystemService.verifyPaymentIntent(db, ownerId, guestId, finalPaymentId, amount);

        return NextResponse.json({ success: true, paymentId: finalPaymentId });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}
