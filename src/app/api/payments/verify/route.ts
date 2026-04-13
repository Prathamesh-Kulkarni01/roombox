import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { PaymentSystemService } from '@/services/paymentSystemService';
import { enforcePermission } from '@/lib/rbac-middleware';

/**
 * API for owners/staff to verify a claimed UPI payment.
 * Updates status to VERIFIED and reconciles the ledger.
 */
export async function POST(req: NextRequest) {
    try {
        const result = await enforcePermission(req, 'finances', 'edit', 'POST /api/payments/verify', true);
        if (!result.authorized) return result.response;
        const { ownerId } = result;

        const { guestId, paymentId, verifiedAmount } = await req.json();


        const db = await getAdminDb();

        // 1. Verify payment using the service
        await PaymentSystemService.verifyPaymentIntent(db, ownerId, guestId, paymentId, verifiedAmount);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error in verify payment:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
