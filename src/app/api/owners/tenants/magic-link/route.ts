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
        const { guestId, phone } = body;

        if (!guestId || !phone) {
            return badRequest('guestId and phone are required.');
        }

        const db = await selectOwnerDataAdminDb(ownerId);
        const appDb = await getAdminDb();

        // Fetch Guest Data to get PG name
        const guestDoc = await db.collection('users_data').doc(ownerId).collection('guests').doc(guestId).get();
        if (!guestDoc.exists) {
            return notFound('Guest not found.');
        }
        const guestData = guestDoc.data()!;
        const pgName = guestData.pgName || 'Roombox';

        // Generate Magic Link
        const { magicLink, inviteCode } = await TenantService.generateMagicLink(appDb, guestId, phone, ownerId, pgName);

        return NextResponse.json({
            success: true,
            magicLink,
            inviteCode
        });

    } catch (error: any) {
        console.error('Error generating manual magic link:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
