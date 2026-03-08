import { NextResponse } from 'next/server';
import { getVerifiedOwnerId } from '@/lib/auth-server';
import { selectOwnerDataAdminDb } from '@/lib/firebaseAdmin';
import { PropertyService } from '@/services/propertyService';

/**
 * POST /api/properties/bulk-setup
 *
 * Bulk-creates floors, rooms, and beds for an existing PG.
 *
 * Body:
 *   pgId         — ID of the target property
 *   floors       — Number of floors to create
 *   roomsPerFloor — Rooms per floor
 *   bedsPerRoom  — Beds per room
 *   startFloorNumber? — Floor numbering start (default: 1)
 */
export async function POST(req: Request) {
    try {
        const { ownerId, error } = await getVerifiedOwnerId(req as any);
        if (error || !ownerId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { pgId, floors, roomsPerFloor, bedsPerRoom, startFloorNumber } = body;

        // ── Validation ─────────────────────────────────────────────────────────
        if (!pgId) {
            return NextResponse.json({ error: 'pgId is required' }, { status: 400 });
        }

        const floorCount = Number(floors);
        const roomsCount = Number(roomsPerFloor);
        const bedsCount = Number(bedsPerRoom);

        if (!floorCount || floorCount < 1 || floorCount > 20) {
            return NextResponse.json({ error: 'floors must be between 1 and 20' }, { status: 400 });
        }
        if (!roomsCount || roomsCount < 1 || roomsCount > 50) {
            return NextResponse.json({ error: 'roomsPerFloor must be between 1 and 50' }, { status: 400 });
        }
        if (!bedsCount || bedsCount < 1 || bedsCount > 20) {
            return NextResponse.json({ error: 'bedsPerRoom must be between 1 and 20' }, { status: 400 });
        }

        const db = await selectOwnerDataAdminDb(ownerId);

        const result = await PropertyService.bulkSetupFloors(db, ownerId, pgId, {
            floors: floorCount,
            roomsPerFloor: roomsCount,
            bedsPerRoom: bedsCount,
            startFloorNumber: startFloorNumber ? Number(startFloorNumber) : 1,
        });

        return NextResponse.json({
            success: true,
            message: `Created ${result.floorsCreated} floors, ${result.roomsCreated} rooms, and ${result.bedsCreated} beds.`,
            ...result,
        });

    } catch (error: any) {
        console.error('[BulkSetup] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
