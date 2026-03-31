
import { NextResponse } from 'next/server';
import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { TenantService } from '@/services/tenantService';
import { getVerifiedOwnerId } from '@/lib/auth-server';

export async function POST(request: Request) {
    try {
        const { ownerId, error } = await getVerifiedOwnerId(request);
        if (!ownerId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { staffId, phone } = body;

        if (!staffId || !phone) {
            return NextResponse.json({ success: false, error: 'staffId and phone are required.' }, { status: 400 });
        }

        const db = await selectOwnerDataAdminDb(ownerId);
        const appDb = await getAdminDb();

        // Fetch Staff Data
        const staffDoc = await db.collection('users_data').doc(ownerId).collection('staff').doc(staffId).get();
        if (!staffDoc.exists) {
            return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 });
        }
        const staffData = staffDoc.data()!;
        const pgName = staffData.pgName || 'RentSutra';

        // Generate Magic Link for STAFF role
        const magicLink = await TenantService.generateMagicLink(appDb, staffId, phone, ownerId, pgName, 'staff');

        return NextResponse.json({
            success: true,
            magicLink
        });

    } catch (error: any) {
        console.error('Error generating staff magic link:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
