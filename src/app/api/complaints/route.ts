/**
 * /api/complaints — Shared API for complaints
 * Used by RTK Query (web UI) and WhatsApp bot.
 * Complex create logic remains in Redux complaintsSlice thunks.
 */
import { NextRequest, NextResponse } from 'next/server';
import { selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';

function badRequest(msg: string) {
    return NextResponse.json({ error: msg }, { status: 400 });
}

// GET /api/complaints?ownerId=xxx[&pgId=xxx][&status=open]
export async function GET(req: NextRequest) {
    const ownerId = req.nextUrl.searchParams.get('ownerId');
    const pgId = req.nextUrl.searchParams.get('pgId') || undefined;
    const status = req.nextUrl.searchParams.get('status') || undefined;
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '100', 10);

    if (!ownerId) return badRequest('ownerId is required');

    try {
        const db = await selectOwnerDataAdminDb(ownerId);
        let query = db.collection('users_data').doc(ownerId).collection('complaints')
            .orderBy('date', 'desc')
            .limit(limit) as FirebaseFirestore.Query;

        if (pgId) query = query.where('pgId', '==', pgId);
        if (status) query = query.where('status', '==', status);

        const snapshot = await query.get();
        const complaints = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        return NextResponse.json({ success: true, complaints });
    } catch (error: any) {
        console.error('GET /api/complaints error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch complaints' }, { status: 500 });
    }
}

// PATCH /api/complaints — update complaint status
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { ownerId, complaintId, updates } = body;
        if (!ownerId || !complaintId || !updates) return badRequest('ownerId, complaintId, and updates are required');

        const db = await selectOwnerDataAdminDb(ownerId);
        const ref = db.collection('users_data').doc(ownerId).collection('complaints').doc(complaintId);
        await ref.set(updates, { merge: true });

        const updated = await ref.get();
        return NextResponse.json({ success: true, complaint: { id: updated.id, ...updated.data() } });
    } catch (error: any) {
        console.error('PATCH /api/complaints error:', error);
        return NextResponse.json({ error: error.message || 'Failed to update complaint' }, { status: 500 });
    }
}

// POST /api/complaints — create a complaint (used by WhatsApp bot)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { ownerId, complaint } = body;
        if (!ownerId || !complaint) return badRequest('ownerId and complaint are required');

        const db = await selectOwnerDataAdminDb(ownerId);
        const id = `cmp-${Date.now()}`;
        const newComplaint = {
            ...complaint,
            id,
            date: new Date().toISOString(),
            status: 'open',
        };
        await db.collection('users_data').doc(ownerId).collection('complaints').doc(id).set(newComplaint);

        return NextResponse.json({ success: true, complaint: newComplaint }, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/complaints error:', error);
        return NextResponse.json({ error: error.message || 'Failed to create complaint' }, { status: 500 });
    }
}
