import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { getVerifiedOwnerId } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
    try {
        const { ownerId, error } = await getVerifiedOwnerId(req);
        if (!ownerId) {
            return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
        }

        
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

        // Fetch Analytics
        const analyticsSnap = await targetDb.collection('marketing_analytics')
            .where('ownerId', '==', ownerId)
            .get();

        // Fetch Leads
        const leadsSnap = await targetDb.collection('leads')
            .where('ownerId', '==', ownerId)
            .get();

        const stats: Record<string, { views: number; leads: number; sources: Record<string, number> }> = {};

        analyticsSnap.docs.forEach(doc => {
            const data = doc.data();
            const pgId = data.pgId;
            if (!stats[pgId]) stats[pgId] = { views: 0, leads: 0, sources: {} };
            
            stats[pgId].views++;
            
            const source = data.source || 'direct';
            stats[pgId].sources[source] = (stats[pgId].sources[source] || 0) + 1;
        });

        leadsSnap.docs.forEach(doc => {
            const data = doc.data();
            const pgId = data.pgId;
            if (pgId) {
                if (!stats[pgId]) stats[pgId] = { views: 0, leads: 0, sources: {} };
                stats[pgId].leads++;
            }
        });

        return NextResponse.json({ success: true, stats });
    } catch (err: any) {
        console.error('Stats fetch error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
