import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { nanoid } from 'nanoid';

export async function GET(req: NextRequest) {
    // Basic security check - only allow in dev or with a specific header
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
    }

    try {
        const db = await getAdminDb();
        const usersDataSnap = await db.collection('users_data').get();
        
        let totalUpdated = 0;
        let ownersProcessed = 0;

        for (const ownerDoc of usersDataSnap.docs) {
            const ownerId = ownerDoc.id;
            const guestsSnap = await db.collection('users_data').doc(ownerId).collection('guests').get();
            
            ownersProcessed++;
            
            for (const guestDoc of guestsSnap.docs) {
                const guestData = guestDoc.data();
                
                // If shortId is missing or old format (no dash and length < 6)
                const isOldFormat = !guestData.shortId || (!guestData.shortId.includes('-') && guestData.shortId.length <= 5);
                
                if (isOldFormat) {
                    const namePart = (guestData.name || 'GUEST').replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
                    const newShortId = `${namePart}-${nanoid(4).toUpperCase()}`;
                    
                    await guestDoc.ref.update({
                        shortId: newShortId,
                        schemaVersion: 2 // Assuming we tracking version
                    });
                    totalUpdated++;
                }
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: `Successfully updated ${totalUpdated} guests across ${ownersProcessed} owners.`,
            totalUpdated,
            ownersProcessed
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
