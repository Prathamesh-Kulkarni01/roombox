/**
 * /api/staff — Shared API for staff management
 * Used by RTK Query (web UI) and WhatsApp bot.
 * Complex invite/email logic remains in Redux staffSlice thunks.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { badRequest, serverError, unauthorized } from '@/lib/api/apiError';
import { enforcePermission } from '@/lib/rbac-middleware';
import { StaffService } from '@/services/staffService';

// GET /api/staff?[pgId=xxx][&role=manager]
export async function GET(req: NextRequest) {
    const result = await enforcePermission(req, 'staff', 'view', 'GET /api/staff');
    if (!result.authorized) return result.response;
    const { ownerId } = result;

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
    const result = await enforcePermission(req, 'staff', 'edit', 'PATCH /api/staff', true);
    if (!result.authorized) return result.response;
    const { ownerId, userId, name } = result;
    const performer = { userId, name: name || 'Unknown User' };

    try {
        const body = await req.json();
        const { staffId, updates } = body;
        if (!staffId || !updates) return badRequest('staffId and updates are required');

        const db = await selectOwnerDataAdminDb(ownerId);
        const appDb = await getAdminDb();
        await StaffService.updateStaff(db, appDb, ownerId, staffId, updates, performer);

        const updated = await db.collection('users_data').doc(ownerId).collection('staff').doc(staffId).get();
        return NextResponse.json({ success: true, staff: { id: updated.id, ...updated.data() } });
    } catch (error: any) {
        return serverError(error, 'PATCH /api/staff');
    }
}

// DELETE /api/staff — remove a staff member
export async function DELETE(req: NextRequest) {
    const result = await enforcePermission(req, 'staff', 'delete', 'DELETE /api/staff', true);
    if (!result.authorized) return result.response;
    const { ownerId, userId, name } = result;
    const performer = { userId, name: name || 'Unknown User' };

    try {
        const body = await req.json();
        const { staffId } = body;
        if (!staffId) return badRequest('staffId is required');

        const db = await selectOwnerDataAdminDb(ownerId);
        const appDb = await getAdminDb();
        await StaffService.deleteStaff(db, appDb, ownerId, staffId, performer);

        return NextResponse.json({ success: true, staffId });
    } catch (error: any) {
        return serverError(error, 'DELETE /api/staff');
    }
}
