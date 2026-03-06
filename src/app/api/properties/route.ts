/**
 * /api/properties - Shared API for property management
 * Used by both the Web App UI (via fetch) and the WhatsApp Bot
 * Supports BYODB via selectOwnerDataAdminDb
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { PropertyService } from '@/services/propertyService';

function unauthorized() {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function badRequest(msg: string) {
    return NextResponse.json({ error: msg }, { status: 400 });
}

// GET /api/properties?ownerId=xxx  — list all properties
export async function GET(req: NextRequest) {
    const ownerId = req.nextUrl.searchParams.get('ownerId');
    if (!ownerId) return badRequest('ownerId is required');

    try {
        const db = await selectOwnerDataAdminDb(ownerId);
        const buildings = await PropertyService.getBuildings(db, ownerId);
        const stats = await PropertyService.getBriefingStats(db, ownerId);
        return NextResponse.json({ success: true, buildings, stats });
    } catch (error: any) {
        console.error('GET /api/properties error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch properties' }, { status: 500 });
    }
}

// POST /api/properties — create a new property
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { ownerId, name, location, city, gender, autoSetup, floorCount = 1, roomsPerFloor = 4 } = body;

        if (!ownerId || !name || !location || !city || !gender) {
            return badRequest('ownerId, name, location, city, and gender are required');
        }

        const db = await selectOwnerDataAdminDb(ownerId);

        // Generate floors/rooms if autoSetup requested
        const initialFloors: any[] = [];
        if (autoSetup) {
            for (let f = 1; f <= floorCount; f++) {
                const floorId = `floor-${Date.now()}-${f}`;
                const rooms: any[] = [];
                for (let r = 1; r <= roomsPerFloor; r++) {
                    rooms.push({
                        id: `room-${Date.now()}-${f}-${r}`,
                        name: `${f}0${r}`,
                        floorId,
                        beds: [],
                        rent: 0,
                        deposit: 0,
                        amenities: [],
                    });
                }
                initialFloors.push({ id: floorId, name: `Floor ${f}`, rooms });
            }
        }

        const newPgId = `pg-${Date.now()}`;
        // Fix the pgId in generated floors/rooms
        initialFloors.forEach(f => {
            f.pgId = newPgId;
            f.rooms.forEach((r: any) => r.pgId = newPgId);
        });

        const newPg = {
            id: newPgId,
            ownerId,
            name,
            location,
            city,
            gender,
            images: [],
            rating: 0,
            occupancy: 0,
            totalBeds: 0,
            totalRooms: initialFloors.reduce((acc, f) => acc + f.rooms.length, 0),
            rules: [],
            contact: '',
            priceRange: { min: 0, max: 0 },
            amenities: ['wifi'],
            floors: initialFloors,
            status: 'active',
            createdAt: Date.now(),
        };

        await db.collection('users_data').doc(ownerId).collection('pgs').doc(newPgId).set(newPg);

        // Update owner summary in main app DB
        try {
            const appDb = await getAdminDb();
            const pgsSnap = await db.collection('users_data').doc(ownerId).collection('pgs').get();
            await appDb.doc(`users/${ownerId}`).update({
                'pgSummary.totalProperties': pgsSnap.size,
            });
        } catch (summaryErr) {
            console.warn('Could not update owner summary:', summaryErr);
        }

        return NextResponse.json({ success: true, pg: newPg }, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/properties error:', error);
        return NextResponse.json({ error: error.message || 'Failed to create property' }, { status: 500 });
    }
}

// DELETE /api/properties?ownerId=xxx&pgId=yyy — delete a property
export async function DELETE(req: NextRequest) {
    const ownerId = req.nextUrl.searchParams.get('ownerId');
    const pgId = req.nextUrl.searchParams.get('pgId');

    if (!ownerId || !pgId) return badRequest('ownerId and pgId are required');

    try {
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
        for (const subCol of ['guests', 'complaints', 'expenses']) {
            const snap = await db.collection('users_data').doc(ownerId).collection(subCol)
                .where('pgId', '==', pgId).get();
            snap.docs.forEach(d => batch.delete(d.ref));
        }

        await batch.commit();
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('DELETE /api/properties error:', error);
        return NextResponse.json({ error: error.message || 'Failed to delete property' }, { status: 500 });
    }
}
