
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import jwt from 'jsonwebtoken';
import type { Guest } from '@/lib/types';

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
        
        const balanceBf = guest.balanceBroughtForward || 0;
        const currentMonthRent = guest.rentAmount || 0;
        const chargesDue = (guest.additionalCharges || []).reduce((sum, charge) => sum + charge.amount, 0);
        const totalPaid = guest.rentPaidAmount || 0;
        const totalDue = (balanceBf + currentMonthRent + chargesDue) - totalPaid;

        if (totalDue <= 0) {
            return NextResponse.json({ success: false, error: 'There are no pending dues for this rent cycle.' }, { status: 400 });
        }

        const responseDetails = {
            guest: {
                id: guest.id,
                name: guest.name,
                email: guest.email,
                phone: guest.phone,
                pgName: guest.pgName,
                dueDate: guest.dueDate,
                rentAmount: currentMonthRent,
                additionalCharges: guest.additionalCharges || [],
                balanceBroughtForward: balanceBf,
                totalDue: totalDue,
            },
            ownerId: ownerId,
        };
        
        return NextResponse.json({ success: true, details: responseDetails });

    } catch (error) {
        console.error('Error verifying rent token:', error);
        return NextResponse.json({ success: false, error: 'Invalid or expired payment link.' }, { status: 400 });
    }
}
