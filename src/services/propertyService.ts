import { Firestore } from 'firebase-admin/firestore';

export interface BuildingStats {
    totalBuildings: number;
    totalTenants: number;
}

export interface Building {
    id: string;
    name: string;
    occupancy: number;
    totalBeds: number;
}

export interface CreatePropertyInput {
    ownerId: string;
    name: string;
    location: string;
    city: string;
    gender: 'boys' | 'girls' | 'unisex';
    autoSetup?: boolean;
    floorCount?: number;
    roomsPerFloor?: number;
}

export class PropertyService {
    /**
     * Creates a new property with standardized logic.
     * Handles floor/room generation if requested.
     */
    static async createProperty(db: Firestore, input: CreatePropertyInput): Promise<any> {
        const { ownerId, name, location, city, gender, autoSetup, floorCount = 0, roomsPerFloor = 0 } = input;

        const newPgId = `pg-${Date.now()}`;
        const initialFloors: any[] = [];

        if (autoSetup || floorCount > 0) {
            for (let f = 1; f <= floorCount; f++) {
                const floorId = `floor-${Date.now()}-${f}`;
                const rooms: any[] = [];
                for (let r = 1; r <= (roomsPerFloor || 4); r++) {
                    const roomId = `room-${Date.now()}-${f}-${r}`;
                    const roomNum = (f * 100) + r;
                    rooms.push({
                        id: roomId,
                        name: `${roomNum}`,
                        pgId: newPgId,
                        floorId,
                        beds: [{ id: `bed-${roomId}-1`, name: '1', guestId: null }],
                        rent: 0,
                        deposit: 0,
                        available: true,
                        amenities: [],
                    });
                }
                initialFloors.push({
                    id: floorId,
                    name: `Floor ${f}`,
                    pgId: newPgId,
                    rooms
                });
            }
        }

        const newPg = {
            id: newPgId,
            ownerId,
            name,
            location,
            city: city || 'Unknown',
            gender: gender || 'unisex',
            images: [],
            rating: 0,
            occupancy: 0,
            totalBeds: floorCount * roomsPerFloor || 0,
            totalRooms: initialFloors.reduce((acc, f) => acc + f.rooms.length, 0),
            rules: [],
            contact: '',
            priceRange: { min: 0, max: 0 },
            amenities: ['wifi'],
            floors: initialFloors,
            status: 'active',
            isActive: true,
            createdAt: Date.now(),
            createdDate: new Date().toISOString(),
        };

        await db.collection('users_data').doc(ownerId).collection('pgs').doc(newPgId).set(newPg);
        return newPg;
    }

    /**
     * Fetches the summary stats (briefing) for an owner.
     */
    static async getBriefingStats(db: Firestore, ownerId: string): Promise<BuildingStats> {
        try {
            const pgsSnap = await db.collection('users_data').doc(ownerId).collection('pgs').get();
            const guestsSnap = await db.collection('users_data').doc(ownerId).collection('guests')
                .where('isVacated', '==', false)
                .get();

            return {
                totalBuildings: pgsSnap.size,
                totalTenants: guestsSnap.size,
            };
        } catch (error) {
            console.error('Error fetching briefing stats:', error);
            throw error;
        }
    }

    /**
     * Retrieves a list of buildings (PGs) for a specific owner.
     */
    static async getBuildings(db: Firestore, ownerId: string): Promise<Building[]> {
        try {
            const pgsSnap = await db.collection('users_data').doc(ownerId).collection('pgs').get();

            const pgs: Building[] = [];
            pgsSnap.forEach(docSnap => {
                const data = docSnap.data();
                pgs.push({
                    id: docSnap.id,
                    name: data.name || 'Unnamed Property',
                    occupancy: data.occupancy || 0,
                    totalBeds: data.totalBeds || 0,
                });
            });

            return pgs;
        } catch (error) {
            console.error('Error fetching buildings:', error);
            throw error;
        }
    }

    /**
     * Adds floors, rooms, and beds to an EXISTING PG in bulk.
     * Uses an atomic update so the document is never left in a partial state.
     *
     * @param db       Owner-scoped Firestore instance
     * @param ownerId  Owner UID
     * @param pgId     ID of the target PG document
     * @param opts     Bulk setup configuration
     */
    static async bulkSetupFloors(
        db: Firestore,
        ownerId: string,
        pgId: string,
        opts: {
            floors: number;
            roomsPerFloor: number;
            bedsPerRoom: number;
            startFloorNumber?: number; // Default 1 — allows appending to existing floors
        }
    ): Promise<{ floorsCreated: number; roomsCreated: number; bedsCreated: number }> {
        const { floors, roomsPerFloor, bedsPerRoom, startFloorNumber = 1 } = opts;

        const pgRef = db.collection('users_data').doc(ownerId).collection('pgs').doc(pgId);
        const pgSnap = await pgRef.get();
        if (!pgSnap.exists) throw new Error(`PG ${pgId} not found`);

        const pgData = pgSnap.data()!;
        const existingFloors: any[] = pgData.floors || [];

        const newFloors: any[] = [];
        const ts = Date.now();

        for (let f = 0; f < floors; f++) {
            const floorNumber = startFloorNumber + f;
            const floorId = `floor-${ts}-${floorNumber}`;
            const rooms: any[] = [];

            for (let r = 1; r <= roomsPerFloor; r++) {
                const roomId = `room-${ts}-${floorNumber}-${r}`;
                const roomNum = (floorNumber * 100) + r;
                const beds: any[] = [];

                for (let b = 1; b <= bedsPerRoom; b++) {
                    beds.push({ id: `bed-${roomId}-${b}`, name: `${b}`, guestId: null });
                }

                rooms.push({
                    id: roomId,
                    name: `${roomNum}`,
                    pgId,
                    floorId,
                    beds,
                    rent: 0,
                    deposit: 0,
                    available: true,
                    amenities: [],
                });
            }

            newFloors.push({ id: floorId, name: `Floor ${floorNumber}`, pgId, rooms });
        }

        const allFloors = [...existingFloors, ...newFloors];
        const totalBeds = allFloors.reduce(
            (acc, fl) => acc + fl.rooms.reduce((ra: number, rm: any) => ra + rm.beds.length, 0), 0
        );
        const totalRooms = allFloors.reduce((acc, fl) => acc + fl.rooms.length, 0);

        await pgRef.update({
            floors: allFloors,
            totalRooms,
            totalBeds,
        });

        return {
            floorsCreated: newFloors.length,
            roomsCreated: newFloors.reduce((a, f) => a + f.rooms.length, 0),
            bedsCreated: newFloors.reduce((a, f) => a + f.rooms.reduce((ra: number, rm: any) => ra + rm.beds.length, 0), 0),
        };
    }
}
