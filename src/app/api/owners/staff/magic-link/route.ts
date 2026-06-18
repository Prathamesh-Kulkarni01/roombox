import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { TenantService } from '@/services/tenantService';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { unauthorized, badRequest, notFound } from '@/lib/api/apiError';

export async function POST(request: NextRequest) {
    try {
        const { ownerId, error } = await getVerifiedOwnerId(request);
        if (!ownerId) return unauthorized(error);

        const body = await request.json();
        const { staffId, phone } = body;

        if (!staffId || !phone) {
            return badRequest('staffId and phone are required.');
        }

        const db = await selectOwnerDataAdminDb(ownerId);
        const appDb = await getAdminDb();

        // Fetch Staff Data
        const staffDoc = await db.collection('users_data').doc(ownerId).collection('staff').doc(staffId).get();
        if (!staffDoc.exists) {
            return notFound('Staff member not found.');
        }
        const staffData = staffDoc.data()!;
        const pgName = staffData.pgName || 'Roombox';

        // Generate Magic Link for STAFF role
        const { magicLink, inviteCode } = await TenantService.generateMagicLink(appDb, staffId, phone, ownerId, pgName, 'staff', staffData.pgId);

        return NextResponse.json({
            success: true,
            magicLink,
            inviteCode
        });

    } catch (error: any) {
        console.error('Error generating staff magic link:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
