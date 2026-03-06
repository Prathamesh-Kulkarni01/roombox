import { Firestore } from 'firebase-admin/firestore';

export interface Tenant {
    id: string;
    name: string;
    pgName?: string;
    rentAmount: number;
    balance: number;
    paymentStatus: string;
}

export interface RentSummary {
    expected: number;
    collected: number;
    pending: number;
}

export class TenantService {
    /**
     * Fetches the current month's rent summary for an owner.
     */
    static async getMonthlyRentSummary(db: Firestore, ownerId: string): Promise<RentSummary> {
        try {
            const guestsSnap = await db.collection('users_data').doc(ownerId).collection('guests')
                .where('isVacated', '==', false)
                .get();

            let expected = 0;
            let collected = 0;

            guestsSnap.forEach(docSnap => {
                const guestData = docSnap.data();
                expected += (guestData.rentAmount || 0);
                collected += (guestData.paidAmount || 0); // Simplified for now
            });

            return {
                expected,
                collected,
                pending: expected - collected,
            };
        } catch (error) {
            console.error('Error fetching monthly rent summary:', error);
            throw error;
        }
    }

    /**
     * Retrieves a list of active tenants with optional filtering by payment status.
     */
    static async getActiveTenants(db: Firestore, ownerId: string, limit: number = 10, paymentStatus?: string): Promise<Tenant[]> {
        try {
            let query = db.collection('users_data').doc(ownerId).collection('guests')
                .where('isVacated', '==', false);

            if (paymentStatus) {
                query = query.where('paymentStatus', '==', paymentStatus);
            }

            const guestsSnap = await query.limit(limit).get();

            const tenants: Tenant[] = [];
            guestsSnap.forEach(docSnap => {
                const data = docSnap.data();
                tenants.push({
                    id: docSnap.id,
                    name: data.name || 'Unnamed Tenant',
                    pgName: data.pgName,
                    rentAmount: data.rentAmount || 0,
                    balance: data.balance || 0,
                    paymentStatus: data.paymentStatus || 'pending',
                });
            });

            return tenants;
        } catch (error) {
            console.error('Error fetching active tenants:', error);
            throw error;
        }
    }
}
