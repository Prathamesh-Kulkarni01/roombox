/**
 * /api/guests — Shared API for guest/tenant reads
 * Used by RTK Query (web UI) and WhatsApp bot.
 * Mutation operations remain in Redux thunks (addGuest, updateGuest, KYC, etc.)
 */
import { NextRequest, NextResponse } from 'next/server';
import { selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';

function badRequest(msg: string) {
    return NextResponse.json({ error: msg }, { status: 400 });
}

// GET /api/guests?ownerId=xxx[&pgId=xxx][&vacated=false][&status=active]
export async function GET(req: NextRequest) {
    const ownerId = req.nextUrl.searchParams.get('ownerId');
    const pgId = req.nextUrl.searchParams.get('pgId') || undefined;
    const vacated = req.nextUrl.searchParams.get('vacated');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '200', 10);

    if (!ownerId) return badRequest('ownerId is required');

    try {
        const db = await selectOwnerDataAdminDb(ownerId);
        let query = db.collection('users_data').doc(ownerId).collection('guests').limit(limit) as FirebaseFirestore.Query;

        if (pgId) {
            query = query.where('pgId', '==', pgId);
        }
        // By default only return non-vacated guests unless explicitly asked
        if (vacated !== 'true') {
            query = query.where('isVacated', '==', false);
        }

        const snapshot = await query.get();
        const guests = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        return NextResponse.json({ success: true, guests });
    } catch (error: any) {
        console.error('GET /api/guests error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch guests' }, { status: 500 });
    }
}

// PATCH /api/guests — update a guest record (e.g. exit initiation)
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { ownerId, guestId, updates } = body;
        if (!ownerId || !guestId || !updates) return badRequest('ownerId, guestId, and updates are required');

        const db = await selectOwnerDataAdminDb(ownerId);
        const guestRef = db.collection('users_data').doc(ownerId).collection('guests').doc(guestId);
        await guestRef.set(updates, { merge: true });

        const updated = await guestRef.get();
        return NextResponse.json({ success: true, guest: { id: updated.id, ...updated.data() } });
    } catch (error: any) {
        console.error('PATCH /api/guests error:', error);
        return NextResponse.json({ error: error.message || 'Failed to update guest' }, { status: 500 });
    }
}

// DELETE /api/guests — vacate a guest
export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { ownerId, guestId } = body;
        if (!ownerId || !guestId) return badRequest('ownerId and guestId are required');

        const db = await selectOwnerDataAdminDb(ownerId);
        const guestRef = db.collection('users_data').doc(ownerId).collection('guests').doc(guestId);
        await guestRef.set({ isVacated: true, vacatedAt: new Date().toISOString() }, { merge: true });

        return NextResponse.json({ success: true, guestId });
    } catch (error: any) {
        console.error('DELETE /api/guests error:', error);
        return NextResponse.json({ error: error.message || 'Failed to vacate guest' }, { status: 500 });
    }
}
