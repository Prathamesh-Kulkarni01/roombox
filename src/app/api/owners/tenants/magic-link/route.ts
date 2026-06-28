import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenantResolver';
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
        const { db: appDb } = await resolveTenant(request);

        // Fetch Guest Data to get PG name
        const guestDoc = await db.collection('users_data').doc(ownerId).collection('guests').doc(guestId).get();
        if (!guestDoc.exists) {
            return notFound('Guest not found.');
        }
        const guestData = guestDoc.data()!;
        const pgName = guestData.pgName || 'Roombox';

        // For sharded (enterprise) owners: store magic link in custom DB (privacy)
        // and write a PII-free routing pointer to the central DB.
        const isSharded = db !== appDb;
        const { magicLink, inviteCode } = await TenantService.generateMagicLink(
            isSharded ? db : appDb,   // Full data → custom DB for sharded, central for regular
            guestId,
            phone,
            ownerId,
            pgName,
            'tenant',
            guestData.pgId,
            isSharded ? appDb : undefined  // Pointer DB → only for sharded
        );

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
