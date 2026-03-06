import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { PropertyService } from '@/services/propertyService';
import { TenantService } from '@/services/tenantService';

export async function GET(req: NextRequest) {
    console.log("--- Testing Shared Services via API ---");
    try {
        const db = await getAdminDb();

        // Find a real owner
        const usersSnap = await db.collection('users').where('role', '==', 'owner').limit(1).get();
        if (usersSnap.empty) {
            return NextResponse.json({ error: "No owners found" });
        }

        const ownerId = usersSnap.docs[0].id;
        const ownerName = usersSnap.docs[0].data().name;

        const stats = await PropertyService.getBriefingStats(db, ownerId);
        const buildings = await PropertyService.getBuildings(db, ownerId);
        const summary = await TenantService.getMonthlyRentSummary(db, ownerId);
        const tenants = await TenantService.getActiveTenants(db, ownerId, 5);

        return NextResponse.json({
            owner: { id: ownerId, name: ownerName },
            stats,
            buildings,
            summary,
            tenants
        });
    } catch (error: any) {
        console.error("Service Test Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
