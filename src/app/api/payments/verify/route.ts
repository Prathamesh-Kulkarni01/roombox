import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { PaymentSystemService } from '@/services/paymentSystemService';

/**
 * API for owners to verify a claimed UPI payment.
 * Updates status to VERIFIED and reconciles the ledger.
 */
export async function POST(req: NextRequest) {
    try {
        const { guestId, paymentId, verifiedAmount } = await req.json();

        if (!guestId || !paymentId) {
            return NextResponse.json({ success: false, error: 'guestId and paymentId are required.' }, { status: 400 });
        }

        const auth = await getAdminAuth();
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await auth.verifyIdToken(idToken);
        const ownerId = decodedToken.uid;

        const db = await getAdminDb();

        // 1. Verify payment using the service
        await PaymentSystemService.verifyPaymentIntent(db, ownerId, guestId, paymentId, verifiedAmount);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error in verify payment:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
