/**
 * /api/staff — Shared API for staff management
 * Used by RTK Query (web UI) and WhatsApp bot.
 * Complex invite/email logic remains in Redux staffSlice thunks.
 */
import { NextRequest, NextResponse } from 'next/server';
import { selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { badRequest, serverError, unauthorized } from '@/lib/api/apiError';

// GET /api/staff?[pgId=xxx][&role=manager]
export async function GET(req: NextRequest) {
    const { ownerId, error } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(error);

    const pgId = req.nextUrl.searchParams.get('pgId') || undefined;
    const role = req.nextUrl.searchParams.get('role') || undefined;
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10);

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
        return serverError(error, 'GET /api/staff');
    }
}

// PATCH /api/staff — update a staff member
export async function PATCH(req: NextRequest) {
    const { ownerId, error } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(error);

    try {
        const body = await req.json();
        const { staffId, updates } = body;
        if (!staffId || !updates) return badRequest('staffId and updates are required');

        const db = await selectOwnerDataAdminDb(ownerId);
        const ref = db.collection('users_data').doc(ownerId).collection('staff').doc(staffId);
        await ref.set(updates, { merge: true });

        const updated = await ref.get();
        return NextResponse.json({ success: true, staff: { id: updated.id, ...updated.data() } });
    } catch (error: any) {
        return serverError(error, 'PATCH /api/staff');
    }
}

// DELETE /api/staff — remove a staff member
export async function DELETE(req: NextRequest) {
    const { ownerId, error } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(error);

    try {
        const body = await req.json();
        const { staffId } = body;
        if (!staffId) return badRequest('staffId is required');

        const db = await selectOwnerDataAdminDb(ownerId);
        await db.collection('users_data').doc(ownerId).collection('staff').doc(staffId).delete();

        return NextResponse.json({ success: true, staffId });
    } catch (error: any) {
        return serverError(error, 'DELETE /api/staff');
    }
}
