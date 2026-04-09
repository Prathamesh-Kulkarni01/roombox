import { Firestore } from 'firebase-admin/firestore';

export interface BuildingStats {
    totalBuildings: number;
    totalTenants: number;
    totalBeds: number;
    totalPendingRent: number;
    totalComplaintsPending: number;
    rentCollectedToday: number;
}

export interface Building {
    id: string;
    name: string;
    occupancy: number;
    totalBeds: number;
    totalRooms?: number;
    floors?: any[];
    upiId?: string;
    payeeName?: string;
    qrCodeImage?: string;
    paymentMode?: string;
    online_payment_enabled?: boolean;
    location?: string;
    city?: string;
    gender?: string;
    priceRange?: { min: number; max: number };
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
    bedsPerRoom?: number;
}

import { getPlanLimit } from '@/lib/permissions';
import { CURRENT_SCHEMA_VERSION, PerformerInfo } from '@/lib/types';
import { ActivityLogsService } from '@/lib/activity-logs-service';

export class PropertyService {
    /**
     * Checks if the owner has reached their property limit.
     */
    static async checkPgLimit(db: Firestore, ownerId: string, planId: string): Promise<void> {
        const limit = getPlanLimit(planId, 'pgs');
        if (limit === 'unlimited') return;

        const snap = await db.collection('users_data').doc(ownerId).collection('pgs').get();
        if (snap.size >= limit) {
            throw new Error(`Property limit reached (${limit}). Please upgrade your plan.`);
        }
    }

    /**
     * Checks if the owner has reached their floor limit for a property.
     */
    static checkFloorLimit(currentFloors: number, newFloors: number, planId: string): void {
        const limit = getPlanLimit(planId, 'floors');
        if (limit === 'unlimited') return;

        if (currentFloors + newFloors > limit) {
            throw new Error(`Floor limit reached (${limit}). Please upgrade your plan.`);
        }
    }

    /**
     * Creates a new property with standardized logic.
     * Handles floor/room generation if requested.
     */
    static async createProperty(db: Firestore, input: CreatePropertyInput & { planId?: string }, performer: PerformerInfo): Promise<any> {
        const { ownerId, name, location, city, gender, autoSetup, floorCount = 0, roomsPerFloor = 0, bedsPerRoom = 1, planId = 'free' } = input;

        // 1. Check PG Limit
        await PropertyService.checkPgLimit(db, ownerId, planId);

        // 2. Check Floor Limit if auto-setup is requested
        if (autoSetup || floorCount > 0) {
            PropertyService.checkFloorLimit(0, floorCount, planId);
        }

        const newPgId = `pg-${Date.now()}`;
        const initialFloors: any[] = [];

        if (autoSetup || floorCount > 0) {
            for (let f = 1; f <= floorCount; f++) {
                const floorId = `floor-${Date.now()}-${f}`;
                const rooms: any[] = [];
                for (let r = 1; r <= (roomsPerFloor || 4); r++) {
                    const roomId = `room-${Date.now()}-${f}-${r}`;
                    const roomNum = (f * 100) + r;
                    const beds: any[] = [];
                    for (let b = 1; b <= (bedsPerRoom || 1); b++) {
                        beds.push({ id: `bed-${roomId}-${b}`, name: `${b}`, guestId: null });
                    }

                    rooms.push({
                        id: roomId,
                        name: `${roomNum}`,
                        pgId: newPgId,
                        floorId,
                        beds,
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
            totalBeds: floorCount * roomsPerFloor * bedsPerRoom || 0,
            totalRooms: initialFloors.reduce((acc, f) => acc + f.rooms.length, 0),
            rules: [],
            contact: '',
            priceRange: { min: 0, max: 0 },
            amenities: ['wifi'],
            floors: initialFloors,
            isActive: true,
            createdAt: new Date().toISOString(),
            createdBy: performer,
            updatedAt: new Date().toISOString(),
            updatedBy: performer,
            schemaVersion: CURRENT_SCHEMA_VERSION,
        };

        await db.collection('users_data').doc(ownerId).collection('pgs').doc(newPgId).set(newPg);

        await ActivityLogsService.logActivity({
            ownerId,
            activityType: 'PROPERTY_CREATED',
            module: 'properties',
            details: `Created property: ${name} (${city})`,
            targetId: newPgId,
            targetType: 'property',
            status: 'success',
            performedBy: performer,
            metadata: { autoSetup, floorCount, roomsPerFloor }
        });

        return newPg;
    }

    /**
     * Updates an existing property.
     */
    static async updateProperty(db: Firestore, ownerId: string, pgId: string, updates: any, performer: PerformerInfo): Promise<void> {
        console.log(`[PropertyService.updateProperty] Updating ${pgId} by ${performer.name}`);
        const pgRef = db.collection('users_data').doc(ownerId).collection('pgs').doc(pgId);
        const snap = await pgRef.get();
        if (!snap.exists) throw new Error('Property not found');
        const oldData = snap.data()!;

        const now = new Date().toISOString();
        const fullUpdates = {
            ...updates,
            updatedAt: now,
            updatedBy: performer
        };

        const changedFields = ActivityLogsService.getChangedFields(oldData, fullUpdates);
        await pgRef.update(fullUpdates);

        if (changedFields.length > 0) {
            await ActivityLogsService.logActivity({
                ownerId,
                activityType: 'PROPERTY_UPDATED',
                module: 'properties',
                details: `Updated property ${oldData.name}: ${changedFields.join(', ')}`,
                targetId: pgId,
                targetType: 'property',
                status: 'success',
                performedBy: performer,
                changes: {
                    before: oldData,
                    after: { ...oldData, ...fullUpdates },
                    changedFields
                }
            });
        }
    }

    /**
     * Deletes a property and its related data.
     */
    static async deleteProperty(db: Firestore, ownerId: string, pgId: string, performer: PerformerInfo): Promise<void> {
        console.log(`[PropertyService.deleteProperty] Deleting ${pgId} by ${performer.name}`);
        const pgRef = db.collection('users_data').doc(ownerId).collection('pgs').doc(pgId);
        const snap = await pgRef.get();
        if (!snap.exists) throw new Error('Property not found');
        const pgData = snap.data()!;

        // 1. Check for active guests
        const guestsSnap = await db.collection('users_data').doc(ownerId).collection('guests')
            .where('pgId', '==', pgId)
            .where('isVacated', '==', false)
            .limit(1)
            .get();
        
        if (!guestsSnap.empty) throw new Error('Cannot delete property with active tenants');

        const batch = db.batch();
        batch.delete(pgRef);

        // Delete related sub-collection documents
        for (const subCol of ['complaints', 'expenses']) {
            const snap = await db.collection('users_data').doc(ownerId).collection(subCol)
                .where('pgId', '==', pgId).get();
            snap.docs.forEach(d => batch.delete(d.ref));
        }

        await batch.commit();

        await ActivityLogsService.logActivity({
            ownerId,
            activityType: 'PROPERTY_DELETED',
            module: 'properties',
            details: `Deleted property: ${pgData.name}`,
            targetId: pgId,
            targetType: 'property',
            status: 'danger',
            performedBy: performer,
            metadata: { name: pgData.name }
        });
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

            const complaintsSnap = await db.collection('users_data').doc(ownerId).collection('complaints')
                .where('status', 'in', ['open', 'in-progress'])
                .get();

            let totalBeds = 0;
            pgsSnap.forEach(doc => {
                const data = doc.data();
                totalBeds += data.totalBeds || 0;
            });

            let totalPendingRent = 0;
            let rentCollectedToday = 0;
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);

            guestsSnap.forEach(doc => {
                const guest = doc.data() as any;
                const balance = guest.balance || 0;
                if (balance > 0) totalPendingRent += balance;

                // Sum credits (payments) recorded today in the ledger
                const ledger = guest.ledger || [];
                ledger.forEach((entry: any) => {
                    if (entry.type === 'credit' && entry.date) {
                        const entryDate = new Date(entry.date);
                        if (entryDate >= startOfToday) {
                            rentCollectedToday += entry.amount || 0;
                        }
                    }
                });
            });

            return {
                totalBuildings: pgsSnap.size,
                totalTenants: guestsSnap.size,
                totalBeds,
                totalPendingRent,
                totalComplaintsPending: complaintsSnap.size,
                rentCollectedToday
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
                    // Spread all data first so no stored field is lost
                    ...data,
                    // Then enforce defaults for critical fields
                    id: docSnap.id,
                    name: data.name || 'Unnamed Property',
                    occupancy: data.occupancy || 0,
                    totalBeds: data.totalBeds || 0,
                    totalRooms: data.totalRooms || 0,
                    floors: data.floors || [],
                    // Payment fields
                    upiId: data.upiId || '',
                    payeeName: data.payeeName || '',
                    qrCodeImage: data.qrCodeImage || '',
                    paymentMode: data.paymentMode || 'CASH_ONLY',
                    online_payment_enabled: data.online_payment_enabled || false,
                    // Property details
                    location: data.location || '',
                    city: data.city || '',
                    gender: data.gender || '',
                    priceRange: data.priceRange || { min: 0, max: 0 },
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
            planId?: string;
        },
        performer: PerformerInfo
    ): Promise<{ floorsCreated: number; roomsCreated: number; bedsCreated: number }> {
        const { floors, roomsPerFloor, bedsPerRoom, startFloorNumber = 1, planId = 'free' } = opts;

        const pgRef = db.collection('users_data').doc(ownerId).collection('pgs').doc(pgId);
        const pgSnap = await pgRef.get();
        if (!pgSnap.exists) throw new Error(`PG ${pgId} not found`);

        const pgData = pgSnap.data()!;
        const existingFloors: any[] = pgData.floors || [];

        // 1. Check Floor Limit
        PropertyService.checkFloorLimit(existingFloors.length, floors, planId);

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
            updatedAt: new Date().toISOString(),
            updatedBy: performer
        });

        await ActivityLogsService.logActivity({
            ownerId,
            activityType: 'ROOM_CREATED', // Closest match for bulk setup
            module: 'properties',
            details: `Bulk setup: added ${floors} floors, ${totalRooms - (pgData.totalRooms || 0)} rooms to ${pgData.name}`,
            targetId: pgId,
            targetType: 'property',
            status: 'success',
            performedBy: performer,
            metadata: { floorsAdded: floors, roomsPerFloor, bedsPerRoom }
        });

        return {
            floorsCreated: newFloors.length,
            roomsCreated: newFloors.reduce((a, f) => a + f.rooms.length, 0),
            bedsCreated: newFloors.reduce((a, f) => a + f.rooms.reduce((ra: number, rm: any) => ra + rm.beds.length, 0), 0),
        };
    }
}
