import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
    try {
        const { pgId, ownerId, source = 'direct' } = await req.json();

        if (!pgId || !ownerId) {
            return NextResponse.json({ error: 'Missing pgId or ownerId' }, { status: 400 });
        }

        // Get IP to generate a basic session hash (avoid excessive unique counting)
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const sessionHash = Buffer.from(`${ip}-${dateStr}`).toString('base64');

        // Target correct DB (we track marketing per owner)
        // Check if enterprise or central
        const centralDb = await getAdminDb();
        const ownerDoc = await centralDb.collection('users').doc(ownerId).get();
        let targetDb = centralDb;

        if (ownerDoc.exists) {
            const ownerData = ownerDoc.data();
            const { isEnterpriseIsolated } = await import('@/lib/enterprise/isolation');
            if (isEnterpriseIsolated(ownerData as Record<string, unknown>)) {
                targetDb = await selectOwnerDataAdminDb(ownerId);
            }
        }

        // Use a composite ID to prevent multiple views from the same IP on the same day from inflating stats wildly
        const viewId = `${pgId}_${source}_${sessionHash}`;
        
        await targetDb.collection('marketing_analytics').doc(viewId).set({
            pgId,
            ownerId,
            source,
            timestamp: Date.now(),
            date: dateStr,
            type: 'page_view'
        }, { merge: true }); // Merge true ensures we just update timestamp if it already exists

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Track View Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
