import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { PropertyService } from '@/services/propertyService';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { badRequest, serverError, unauthorized } from '@/lib/api/apiError';

// GET /api/properties  — list all properties for authenticated owner
export async function GET(req: NextRequest) {
    const { ownerId, error } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(error);

    try {
        const db = await selectOwnerDataAdminDb(ownerId);
        const buildings = await PropertyService.getBuildings(db, ownerId);
        const stats = await PropertyService.getBriefingStats(db, ownerId);
        return NextResponse.json({ success: true, buildings, stats });
    } catch (error: any) {
        return serverError(error, 'GET /api/properties');
    }
}

// POST /api/properties — create a new property for authenticated owner
export async function POST(req: NextRequest) {
    const { ownerId, error } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(error);

    try {
        const body = await req.json();
        const { ...propertyData } = body;

        if (!propertyData.name || !propertyData.location) {
            return badRequest('name and location are required');
        }

        const db = await selectOwnerDataAdminDb(ownerId);
        const newPg = await PropertyService.createProperty(db, {
            ownerId,
            name: propertyData.name,
            location: propertyData.location,
            city: propertyData.city || 'N/A',
            gender: propertyData.gender || 'unisex',
            autoSetup: propertyData.autoSetup,
            floorCount: propertyData.floorCount,
            roomsPerFloor: propertyData.roomsPerFloor
        });

        // Update owner summary in main app DB
        try {
            const appDb = await getAdminDb();
            const pgsSnap = await db.collection('users_data').doc(ownerId).collection('pgs').get();
            await appDb.doc(`users/${ownerId}`).set({
                pgSummary: {
                    totalProperties: pgsSnap.size,
                    lastPropertyAdded: new Date().toISOString()
                }
            }, { merge: true });
        } catch (summaryErr) {
            console.warn('Could not update owner summary:', summaryErr);
        }

        return NextResponse.json({ success: true, pg: newPg }, { status: 201 });
    } catch (error: any) {
        return serverError(error, 'POST /api/properties');
    }
}

// DELETE /api/properties?pgId=yyy — delete a property for authenticated owner
export async function DELETE(req: NextRequest) {
    const { ownerId, error } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(error);

    try {
        const pgId = req.nextUrl.searchParams.get('pgId');
        if (!pgId) return badRequest('pgId is required');

        const db = await selectOwnerDataAdminDb(ownerId);

        // Check for active guests
        const activeGuestsSnap = await db.collection('users_data').doc(ownerId).collection('guests')
            .where('pgId', '==', pgId)
            .where('isVacated', '==', false)
            .limit(1)
            .get();

        if (!activeGuestsSnap.empty) {
            return NextResponse.json({ error: 'Cannot delete property with active tenants. Please vacate all tenants first.' }, { status: 409 });
        }

        const batch = db.batch();
        batch.delete(db.collection('users_data').doc(ownerId).collection('pgs').doc(pgId));

        // Delete related sub-collection documents
        for (const subCol of ['complaints', 'expenses']) {
            const snap = await db.collection('users_data').doc(ownerId).collection(subCol)
                .where('pgId', '==', pgId).get();
            snap.docs.forEach(d => batch.delete(d.ref));
        }

        await batch.commit();

        // Update owner summary
        try {
            const appDb = await getAdminDb();
            const pgsSnap = await db.collection('users_data').doc(ownerId).collection('pgs').get();
            await appDb.doc(`users/${ownerId}`).set({
                pgSummary: {
                    totalProperties: pgsSnap.size,
                    lastUpdated: new Date().toISOString()
                }
            }, { merge: true });
        } catch (summaryErr) {
            console.warn('Could not update owner summary after delete:', summaryErr);
        }

        return NextResponse.json({ success: true, message: 'Property deleted successfully' });
    } catch (error: any) {
        return serverError(error, 'DELETE /api/properties');
    }
}

// PATCH /api/properties — update a property
export async function PATCH(req: NextRequest) {
    const { ownerId, error } = await getVerifiedOwnerId(req);
    if (!ownerId) return unauthorized(error);

    try {
        const body = await req.json();
        const { pgId, updates } = body;

        if (!pgId || !updates) {
            return badRequest('pgId and updates are required');
        }

        const db = await selectOwnerDataAdminDb(ownerId);
        const pgRef = db.collection('users_data').doc(ownerId).collection('pgs').doc(pgId);

        // Perform the update
        await pgRef.update({
            ...updates,
            updatedAt: Date.now(),
        });

        const updatedPg = (await pgRef.get()).data();

        return NextResponse.json({ success: true, pg: updatedPg });
    } catch (error: any) {
        return serverError(error, 'PATCH /api/properties');
    }
}
