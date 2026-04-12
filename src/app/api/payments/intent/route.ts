import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { PaymentSystemService } from '@/services/paymentSystemService';
import { generateUpiLink, generateRentSutraNote } from '@/lib/upi';
import jwt from 'jsonwebtoken';
import { format } from 'date-fns';

/**
 * POST /api/payments/intent
 * Body: { token, amount } (JWT token from payment link)
 *  OR  { guestId, amount, month, pgId, ownerId } (direct params)
 * Returns: { paymentId, upiLink, note }
 * 
 * Flow:
 * 1. Validates the JWT token (or direct params).
 * 2. Checks if the PG has DIRECT_UPI enabled.
 * 3. Ensures the guest has a shortId.
 * 4. Creates an INITIATED payment record.
 * 5. Generates a UPI link with the unique note.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        
        let guestId: string;
        let ownerId: string;
        let amount: number;
        let month: string;
        let pgId: string;

        if (body.token) {
            // Token-based auth (from public /pay/[token] page)
            const secret = process.env.JWT_SECRET;
            if (!secret) {
                return NextResponse.json({ error: 'Server misconfiguration: JWT secret missing.' }, { status: 500 });
            }
            const decoded = jwt.verify(body.token, secret) as { guestId: string; ownerId: string };
            guestId = decoded.guestId;
            ownerId = decoded.ownerId;
            amount = Number(body.amount);
            month = format(new Date(), 'MMM').toUpperCase();
            
            // Fetch guest to get pgId
            const db = await getAdminDb();
            const guestSnap = await db.collection('users_data').doc(ownerId).collection('guests').doc(guestId).get();
            if (!guestSnap.exists) {
                return NextResponse.json({ error: 'Guest not found.' }, { status: 404 });
            }
            pgId = guestSnap.data()!.pgId;
        } else {
            // Direct params (e.g., from owner dashboard testing)
            ({ guestId, amount, month, pgId, ownerId } = body);
            if (!guestId || !amount || !month || !pgId || !ownerId) {
                return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
            }
        }

        const db = await getAdminDb();
        const pgRef = db.collection('users_data').doc(ownerId).collection('pgs').doc(pgId);
        const pgSnap = await pgRef.get();
        
        if (!pgSnap.exists) {
            return NextResponse.json({ error: 'Property not found' }, { status: 404 });
        }

        const pgData = pgSnap.data();
        if (!pgData?.upiId || !pgData?.payeeName) {
            return NextResponse.json({ error: 'Property UPI not configured. Please ask your owner to set up UPI.' }, { status: 400 });
        }

        // Ensure shortId exists
        const shortId = await PaymentSystemService.ensureShortId(db, ownerId, guestId);

        // Fetch guest data for enriched note
        if (!body.token) {
            // Check auth for non-token requests
            const authHeader = req.headers.get('Authorization');
            if (!authHeader?.startsWith('Bearer ')) {
                return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
            }
            // For now, we trust the Bearer token as valid for this guestId
            // A more thorough check would verify the UID matches the guest's userId
        }
        
        const guestDoc = await db.collection('users_data').doc(ownerId).collection('guests').doc(guestId).get();
        const guestData = guestDoc.data();
        const guestName = guestData?.name;
        const roomId = guestData?.roomId;
        let roomName = guestData?.roomName; // Try to get cached roomName if it exists

        // If roomName is not in guestData, find it in pgData
        if (!roomName && roomId && pgData.floors) {
            for (const floor of pgData.floors) {
                const room = (floor.rooms || []).find((r: any) => r.id === roomId);
                if (room) {
                    roomName = room.name;
                    break;
                }
            }
        }

        // Create Payment Intent
        const paymentId = await PaymentSystemService.createPaymentIntent(db, ownerId, guestId, amount, month);

        // Generate Link
        const note = generateRentSutraNote(shortId, amount, month, guestName);
        const upiLink = generateUpiLink({
            pa: pgData.upiId,
            pn: pgData.payeeName,
            am: amount.toString(),
            cu: 'INR',
            tn: note
        });

        return NextResponse.json({
            success: true,
            paymentId: paymentId,
            upiLink,
            note,
            shortId
        });
    } catch (error: any) {
        console.error('Payment Intent Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
