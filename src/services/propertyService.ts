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

export class PropertyService {
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
}
