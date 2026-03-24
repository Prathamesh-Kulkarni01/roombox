
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { nanoid } from 'nanoid';
import { badRequest, serverError, unauthorized } from '@/lib/api/apiError';
import type { LedgerEntry, Payment } from '@/lib/types';

export async function POST(req: NextRequest) {
    const { ownerId, guestId, error } = await getVerifiedOwnerId(req);
    
    if (!ownerId || !guestId) {
        return unauthorized(error || 'Unauthorized: Tenant session not found.');
    }

    try {
        const { utr, amount } = await req.json();

        if (!utr) {
            return badRequest('UTR / Transaction ID is required.');
        }

        // Extremely loose UTR validation to accept any real-world messy reference.
        if (utr !== 'NOT_PROVIDED' && utr.length < 4) {
             return badRequest('Invalid Reference: Must be at least 4 characters long.');
        }

        const db = await selectOwnerDataAdminDb(ownerId as string);
        
        let paymentId = '';

        await db.runTransaction(async (txn: any) => {
            // Only check duplicate if it's a real UTR
            if (utr !== 'NOT_PROVIDED') {
                const utrRef = db.collection('users_data').doc(ownerId as string).collection('utrs').doc(utr);
                const utrSnap = await txn.get(utrRef);
                if (utrSnap.exists) {
                    throw new Error('This transaction reference has already been tracked.');
                }
            }

            const guestRef = db.collection('users_data').doc(ownerId as string).collection('guests').doc(guestId as string);
            const guestSnap = await txn.get(guestRef);
            
            if (!guestSnap.exists) {
                throw new Error('Guest records not found.');
            }
            
            const guest = guestSnap.data() as any;
            
            paymentId = `upi_manual_${nanoid(10)}`;
            const timestamp = new Date().toISOString();

            // Match confidence for fully manual payments is inherently PARTIAL
            // because there's no system intent linking it; owner must verify amount.
            let confidence = 'PARTIAL';
            // Simple heuristic to check if amount matches exact rent due (total balance)
            if (guest.balance === Number(amount)) {
                confidence = 'HIGH';
            }

            const newPayment: Payment = {
                id: paymentId,
                amount: Number(amount) || 0,
                method: 'direct_upi', // aligns with intent architecture
                month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
                type: 'credit',
                status: 'CLAIMED_PAID',
                utr: utr !== 'NOT_PROVIDED' ? utr : undefined,
                schemaVersion: 4,
                matchConfidence: confidence as any,
                createdAt: timestamp,
                claimedAt: timestamp,
                date: timestamp
            };

            const updatedHistory = [...(guest.paymentHistory || []), newPayment];

            // Register UTR globally if provided
            if (utr !== 'NOT_PROVIDED') {
                const utrRef = db.collection('users_data').doc(ownerId as string).collection('utrs').doc(utr);
                txn.set(utrRef, {
                    paymentId,
                    guestId,
                    claimedAt: timestamp,
                    schemaVersion: 1
                });
            }

            // Update guest history (do not update ledger yet, wait for owner verification)
            txn.update(guestRef, {
                paymentHistory: updatedHistory,
                lastPaymentDate: timestamp,
                schemaVersion: 4
            });
        });

        return NextResponse.json({ success: true, paymentId });

    } catch (err: any) {
        if (err.message && err.message.includes('UTR has already been used')) {
            return badRequest(err.message);
        }
        return serverError(err, 'POST /api/tenant/confirm-manual');
    }
}
