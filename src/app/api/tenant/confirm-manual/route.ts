
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
        const { utr, screenshotUrl, amount } = await req.json();

        if (!utr) {
            return badRequest('UTR / Transaction ID is required.');
        }

        const db = await selectOwnerDataAdminDb(ownerId);
        const guestRef = db.collection('users_data').doc(ownerId).collection('guests').doc(guestId);
        const guestDoc = await guestRef.get();
        
        if (!guestDoc.exists) {
            return badRequest('Guest records not found.');
        }
        
        const guest = guestDoc.data() as any;
        
        const paymentId = `manual_tenant_${nanoid(10)}`;
        const timestamp = new Date().toISOString();

        const newLedgerEntry: LedgerEntry = {
            id: nanoid(),
            date: timestamp,
            type: 'credit',
            description: `Manual Payment Confirmation (UTR: ${utr})`,
            amount: Number(amount) || 0,
            amountType: guest.amountType || 'numeric',
            symbolicValue: guest.amountType === 'symbolic' ? guest.symbolicRentValue : undefined,
            pgId: guest.pgId,
        };

        const newPayment: Payment = {
            id: paymentId,
            date: timestamp,
            amount: Number(amount) || 0,
            amountType: guest.amountType || 'numeric',
            symbolicValue: guest.amountType === 'symbolic' ? guest.symbolicRentValue : undefined,
            method: 'upi',
            forMonth: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
            verificationStatus: 'PENDING',
            utr: utr,
            screenshotUrl: screenshotUrl || undefined,
            schemaVersion: 3
        };

        const updatedLedger = [...(guest.ledger || []), newLedgerEntry];
        const updatedPayments = [...(guest.payments || []), newPayment];

        await guestRef.update({
            ledger: updatedLedger,
            payments: updatedPayments,
            lastPaymentDate: timestamp,
            schemaVersion: 3
        });

        return NextResponse.json({ success: true, paymentId });

    } catch (err) {
        return serverError(err, 'POST /api/tenant/confirm-manual');
    }
}
