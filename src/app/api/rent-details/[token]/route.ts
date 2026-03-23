
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import jwt from 'jsonwebtoken';
import type { Guest, LedgerEntry } from '@/lib/types';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> | { token: string } }) {
    // Next.js 15 requires awaiting params
    const resolvedParams = await Promise.resolve(params);
    const token = resolvedParams.token;
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        return NextResponse.json({ success: false, error: 'Server misconfiguration: JWT secret missing.' }, { status: 500 });
    }

    let decoded: { guestId: string; ownerId: string };
    try {
        decoded = jwt.verify(token, secret) as { guestId: string; ownerId: string };
    } catch (jwtError: any) {
        console.error('[rent-details] JWT verification failed:', jwtError.message);
        return NextResponse.json({ success: false, error: 'Invalid or expired payment link.' }, { status: 400 });
    }

    try {
        const { guestId, ownerId } = decoded;

        const adminDb = await getAdminDb();
        const guestDoc = await adminDb.collection('users_data').doc(ownerId).collection('guests').doc(guestId).get();

        if (!guestDoc.exists) {
            console.error(`[rent-details] Guest not found: ownerId=${ownerId}, guestId=${guestId}`);
            return NextResponse.json({ success: false, error: 'Rent details not found or link expired.' }, { status: 404 });
        }

        const guest = guestDoc.data() as Guest;

        // Safely handle missing ledger — older documents may not have one yet
        const ledger: LedgerEntry[] = guest.ledger || [];
        const debits = ledger.filter(e => e.type === 'debit');
        const credits = ledger.filter(e => e.type === 'credit');

        const totalDebits = debits.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalCredits = credits.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalDue = Math.max(0, totalDebits - totalCredits);

        // Fetch PG data from the correct 'pgs' collection
        const pgDoc = await adminDb.collection('users_data').doc(ownerId).collection('pgs').doc(guest.pgId).get();
        const pgData = pgDoc.exists ? pgDoc.data() : null;

        if (!pgData) {
            console.warn(`[rent-details] PG not found: ownerId=${ownerId}, pgId=${guest.pgId}`);
        }

        const responseDetails = {
            guest: {
                id: guest.id,
                name: guest.name,
                email: guest.email,
                phone: guest.phone,
                pgName: guest.pgName,
                dueDate: guest.dueDate,
                rentAmount: guest.rentAmount,
                totalDue,
                dueItems: debits,
                amountType: guest.amountType,
                symbolicBalance: guest.symbolicBalance,
            },
            property: pgData ? {
                paymentMode: pgData.paymentMode || 'CASH_ONLY',
                upiId: pgData.upiId || '',
                payeeName: pgData.payeeName || '',
                qrCodeImage: pgData.qrCodeImage || '',
                online_payment_enabled: pgData.online_payment_enabled !== false,
            } : null,
            ownerId,
        };

        return NextResponse.json({ success: true, details: responseDetails });

    } catch (error: any) {
        console.error('[rent-details] Unexpected error:', error?.message || error);
        return NextResponse.json({ success: false, error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
    }
}
