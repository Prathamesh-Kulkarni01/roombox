
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { ActivityLogsService } from '@/lib/activity-logs-service';
import jwt from 'jsonwebtoken';

/**
 * API to claim a payment intent as paid by the tenant.
 * Updates status from INITIATED or created to CLAIMED_PAID.
 */
export async function POST(req: NextRequest) {
    try {
        const { token, paymentId, utr } = await req.json();

        if (!token || !paymentId || !utr) {
            return NextResponse.json({ success: false, error: 'Token, Payment ID, and UTR are required.' }, { status: 400 });
        }

        // Decode JWT token to get ownerId and guestId
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return NextResponse.json({ success: false, error: 'Server misconfiguration: JWT secret missing.' }, { status: 500 });
        }

        let ownerId: string;
        let guestId: string;

        try {
            const decoded = jwt.verify(token, secret) as { guestId: string; ownerId: string };
            ownerId = decoded.ownerId;
            guestId = decoded.guestId;
        } catch (jwtError) {
            // Fallback: try public_tokens collection
            const db = await getAdminDb();
            const tokensSnap = await db.collection('public_tokens').doc(token).get();
            if (!tokensSnap.exists) {
                return NextResponse.json({ success: false, error: 'Invalid or expired token.' }, { status: 404 });
            }
            const tokenData = tokensSnap.data()!;
            ownerId = tokenData.ownerId;
            guestId = tokenData.guestId;
        }

        const db = await getAdminDb();

        // Use a transaction to update status
        await db.runTransaction(async (txn: any) => {
            const guestRef = db.collection('users_data').doc(ownerId).collection('guests').doc(guestId);
            const guestSnap = await txn.get(guestRef);
            if (!guestSnap.exists) throw new Error('Guest not found');
            
            const guest = guestSnap.data()!;
            const paymentHistory = guest.paymentHistory || [];
            const paymentIndex = paymentHistory.findIndex((p: any) => p.id === paymentId);
            
            if (paymentIndex === -1) throw new Error('Payment intent not found');
            
            // Only update if not already verified or claimed
            if (paymentHistory[paymentIndex].status === 'VERIFIED') {
                return; // Already done
            }

            paymentHistory[paymentIndex] = {
                ...paymentHistory[paymentIndex],
                status: 'CLAIMED_PAID',
                utr: utr,
                claimedAt: new Date().toISOString()
            };

            txn.set(guestRef, { paymentHistory }, { merge: true });
        });

        await ActivityLogsService.logActivity({
            ownerId,
            activityType: 'PAYMENT_CLAIMED',
            details: `Tenant ${guestId} claimed payment ${paymentId} with UTR ${utr}`,
            targetId: paymentId,
            targetType: 'payment',
            status: 'success'
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error in claim payment:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
