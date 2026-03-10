import { NextResponse } from 'next/server';
import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { TenantService } from '@/services/tenantService';
import { getVerifiedOwnerId } from '@/lib/auth-server';

export async function POST(request: Request) {
    try {
        const { ownerId, error } = await getVerifiedOwnerId(request);
        if (!ownerId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { guestId, phone } = body;

        if (!guestId || !phone) {
            return NextResponse.json({ success: false, error: 'guestId and phone are required.' }, { status: 400 });
        }

        const db = await selectOwnerDataAdminDb(ownerId);
        const appDb = await getAdminDb();

        // Fetch Guest Data to get PG name
        const guestDoc = await db.collection('users_data').doc(ownerId).collection('guests').doc(guestId).get();
        if (!guestDoc.exists) {
            return NextResponse.json({ success: false, error: 'Guest not found.' }, { status: 404 });
        }
        const guestData = guestDoc.data()!;
        const pgName = guestData.pgName || 'RentSutra';

        // Generate Magic Link
        const magicLink = await TenantService.generateMagicLink(appDb, guestId, phone, ownerId, pgName);

        return NextResponse.json({
            success: true,
            magicLink
        });

    } catch (error: any) {
        console.error('Error generating manual magic link:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
