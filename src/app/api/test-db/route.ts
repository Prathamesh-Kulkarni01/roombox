import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenantResolver';
import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';

export async function GET(req: Request) {
    try {
        const { db: appDb } = await resolveTenant(req);
        const usersSnap = await appDb.collection('users').where('subscription.enterpriseProject', '!=', null).limit(1).get();
        if (usersSnap.empty) {
            return NextResponse.json({ error: "No sharded owner found." }, { status: 400 });
        }
        
        const ownerId = usersSnap.docs[0].id;
        const db = await selectOwnerDataAdminDb(ownerId);
        
        let usersDataSuccess = false;
        let magicLinksSuccess = false;
        let errorMsg = '';

        try {
            await db.collection('users_data').doc(ownerId).collection('test').doc('test').set({ foo: 'bar' });
            usersDataSuccess = true;
        } catch (e: any) {
            errorMsg += 'users_data error: ' + e.message + '\n';
        }

        try {
            await db.collection('magic_links').doc('test-token').set({ foo: 'bar' });
            magicLinksSuccess = true;
        } catch (e: any) {
            errorMsg += 'magic_links error: ' + e.message + '\n';
        }

        return NextResponse.json({
            ownerId,
            usersDataSuccess,
            magicLinksSuccess,
            errorMsg
        });
        
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
