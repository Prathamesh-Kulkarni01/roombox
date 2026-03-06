/**
 * /api/staff — Shared API for staff management
 * Used by RTK Query (web UI) and WhatsApp bot.
 * Complex invite/email logic remains in Redux staffSlice thunks.
 */
import { NextRequest, NextResponse } from 'next/server';
import { selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';

function badRequest(msg: string) {
    return NextResponse.json({ error: msg }, { status: 400 });
}

// GET /api/staff?ownerId=xxx[&pgId=xxx][&role=manager]
export async function GET(req: NextRequest) {
    const ownerId = req.nextUrl.searchParams.get('ownerId');
    const pgId = req.nextUrl.searchParams.get('pgId') || undefined;
    const role = req.nextUrl.searchParams.get('role') || undefined;
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10);

    if (!ownerId) return badRequest('ownerId is required');

    try {
        const db = await selectOwnerDataAdminDb(ownerId);
        let query = db.collection('users_data').doc(ownerId).collection('staff')
            .limit(limit) as FirebaseFirestore.Query;

        if (pgId) query = query.where('pgId', '==', pgId);
        if (role) query = query.where('role', '==', role);

        const snapshot = await query.get();
        const staff = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        return NextResponse.json({ success: true, staff });
    } catch (error: any) {
        console.error('GET /api/staff error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch staff' }, { status: 500 });
    }
}

// PATCH /api/staff — update a staff member
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { ownerId, staffId, updates } = body;
        if (!ownerId || !staffId || !updates) return badRequest('ownerId, staffId, and updates are required');

        const db = await selectOwnerDataAdminDb(ownerId);
        const ref = db.collection('users_data').doc(ownerId).collection('staff').doc(staffId);
        await ref.set(updates, { merge: true });

        const updated = await ref.get();
        return NextResponse.json({ success: true, staff: { id: updated.id, ...updated.data() } });
    } catch (error: any) {
        console.error('PATCH /api/staff error:', error);
        return NextResponse.json({ error: error.message || 'Failed to update staff member' }, { status: 500 });
    }
}

// DELETE /api/staff — remove a staff member
export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { ownerId, staffId } = body;
        if (!ownerId || !staffId) return badRequest('ownerId and staffId are required');

        const db = await selectOwnerDataAdminDb(ownerId);
        await db.collection('users_data').doc(ownerId).collection('staff').doc(staffId).delete();

        return NextResponse.json({ success: true, staffId });
    } catch (error: any) {
        console.error('DELETE /api/staff error:', error);
        return NextResponse.json({ error: error.message || 'Failed to delete staff member' }, { status: 500 });
    }
}
