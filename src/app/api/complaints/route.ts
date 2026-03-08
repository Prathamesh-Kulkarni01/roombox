/**
 * /api/complaints — Shared API for complaints
 * Used by RTK Query (web UI) and WhatsApp bot.
 * Complex create logic remains in Redux complaintsSlice thunks.
 */
import { NextRequest, NextResponse } from 'next/server';
import { selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { badRequest, serverError, unauthorized } from '@/lib/api/apiError';
import { TenantService } from '@/services/tenantService';

// GET /api/complaints?[pgId=xxx][&status=open]
export async function GET(req: NextRequest) {
    const { ownerId, error } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(error);

    const pgId = req.nextUrl.searchParams.get('pgId') || undefined;
    const status = req.nextUrl.searchParams.get('status') || undefined;
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '100', 10);

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
        return serverError(error, 'GET /api/complaints');
    }
}

// PATCH /api/complaints — update complaint status
export async function PATCH(req: NextRequest) {
    const { ownerId, error } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(error);

    try {
        const body = await req.json();
        const { complaintId, updates } = body;
        if (!complaintId || !updates) return badRequest('complaintId and updates are required');

        const db = await selectOwnerDataAdminDb(ownerId);
        const ref = db.collection('users_data').doc(ownerId).collection('complaints').doc(complaintId);
        await ref.set(updates, { merge: true });

        // Trigger WhatsApp notification if status changed
        if (updates.status) {
            await TenantService.notifyComplaintStatusChange(db, ownerId, complaintId, updates.status)
                .catch(err => console.error('Failed to notify tenant of complaint update:', err));
        }

        const updated = await ref.get();
        return NextResponse.json({ success: true, complaint: { id: updated.id, ...updated.data() } });
    } catch (error: any) {
        return serverError(error, 'PATCH /api/complaints');
    }
}

// POST /api/complaints — create a complaint
export async function POST(req: NextRequest) {
    const { ownerId, error } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(error);

    try {
        const body = await req.json();
        const { complaint } = body;
        if (!complaint) return badRequest('complaint is required');

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
        return serverError(error, 'POST /api/complaints');
    }
}
