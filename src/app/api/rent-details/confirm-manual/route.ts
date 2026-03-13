
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import type { LedgerEntry, Payment } from '@/lib/types';

export async function POST(req: NextRequest) {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        return NextResponse.json({ success: false, error: 'Server misconfiguration: JWT secret missing.' }, { status: 500 });
    }

    try {
        const { token, utr, screenshotUrl, amount } = await req.json();

        if (!token || !utr) {
            return NextResponse.json({ success: false, error: 'Token and UTR are required.' }, { status: 400 });
        }

        const decoded = jwt.verify(token, secret) as { guestId: string, ownerId: string };
        const { guestId, ownerId } = decoded;

        const adminDb = await getAdminDb();
        const guestRef = adminDb.collection('users_data').doc(ownerId).collection('guests').doc(guestId);
        const guestDoc = await guestRef.get();
        
        if (!guestDoc.exists) {
            return NextResponse.json({ success: false, error: 'Guest records not found.' }, { status: 404 });
        }
        
        const guest = guestDoc.data() as any;
        
        const paymentId = `manual_${nanoid(10)}`;
        const timestamp = new Date().toISOString();

        // Create a pending placement in the ledger (or a separate verification collection)
        // For now, we'll suggest adding it as a 'credit' with a special status in the ledger
        // so it shows up in the guest's passbook but marked as 'Pending'

        const newLedgerEntry: LedgerEntry = {
            id: nanoid(),
            date: timestamp,
            type: 'credit',
            description: `Manual Payment Confirmation (UTR: ${utr})`,
            amount: Number(amount) || 0,
            amountType: guest.amountType || 'numeric',
            symbolicValue: guest.amountType === 'symbolic' ? guest.symbolicRentValue : undefined,
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

        // Update the guest document
        // Note: In a production app, we might want to store pending payments in a separate collection
        // but for RoomBox, ledger is the source of truth for the passbook.
        
        const updatedLedger = [...(guest.ledger || []), newLedgerEntry];
        const updatedPayments = [...(guest.payments || []), newPayment];

        await guestRef.update({
            ledger: updatedLedger,
            payments: updatedPayments, // Assuming there's a payments array for detailed history
            lastPaymentDate: timestamp,
            schemaVersion: 3
        });

        return NextResponse.json({ success: true, paymentId });

    } catch (error) {
        console.error('Error confirming manual payment:', error);
        return NextResponse.json({ success: false, error: 'Invalid token or submission error.' }, { status: 400 });
    }
}
