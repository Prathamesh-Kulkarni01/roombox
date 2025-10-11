
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import jwt from 'jsonwebtoken';
import type { Guest, LedgerEntry } from '@/lib/types';

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
    const { token } = params;
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        return NextResponse.json({ success: false, error: 'Server misconfiguration: JWT secret missing.' }, { status: 500 });
    }

    try {
        const decoded = jwt.verify(token, secret) as { guestId: string, ownerId: string };
        const { guestId, ownerId } = decoded;

        const adminDb = await getAdminDb();
        const guestDoc = await adminDb.collection('users_data').doc(ownerId).collection('guests').doc(guestId).get();
        
        if (!guestDoc.exists) {
            return NextResponse.json({ success: false, error: 'Rent details not found or link expired.' }, { status: 404 });
        }
        
        const guest = guestDoc.data() as Guest;
        
        const debits = guest.ledger.filter(e => e.type === 'debit');
        const credits = guest.ledger.filter(e => e.type === 'credit');
        
        const totalDebits = debits.reduce((sum, e) => sum + e.amount, 0);
        const totalCredits = credits.reduce((sum, e) => sum + e.amount, 0);
        
        const totalDue = totalDebits - totalCredits;

        if (totalDue <= 0) {
            return NextResponse.json({ success: false, error: 'There are no pending dues for this rent cycle.' }, { status: 400 });
        }

        const dueItems: LedgerEntry[] = [];
        let tempBalance = 0;
        const sortedLedger = guest.ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        for (const entry of sortedLedger) {
            tempBalance += (entry.type === 'debit' ? entry.amount : -entry.amount);
            if (entry.type === 'debit') {
                dueItems.push(entry);
            }
        }
        
        // This part is simplified; a real accounting system would be more complex.
        // We will just show all unpaid debits. A more robust solution might track which credits apply to which debits.
        const unpaidDebits = debits; // For now, show all debits as part of the due amount.

        const responseDetails = {
            guest: {
                id: guest.id,
                name: guest.name,
                email: guest.email,
                phone: guest.phone,
                pgName: guest.pgName,
                dueDate: guest.dueDate,
                rentAmount: guest.rentAmount,
                totalDue: totalDue,
                dueItems: unpaidDebits, // Send the itemized list of what is due
            },
            ownerId: ownerId,
        };
        
        return NextResponse.json({ success: true, details: responseDetails });

    } catch (error) {
        console.error('Error verifying rent token:', error);
        return NextResponse.json({ success: false, error: 'Invalid or expired payment link.' }, { status: 400 });
    }
}
