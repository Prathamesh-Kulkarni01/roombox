
import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { CURRENT_SCHEMA_VERSION, type Staff, type User } from '@/lib/types';

export class StaffService {
    /**
     * Adds a new staff member to the owner's collection.
     */
    static async addStaff(db: Firestore, appDb: Firestore, staffData: any): Promise<Staff> {
        const { ownerId, phone, name, role, pgId, pgName, salary, permissions } = staffData;
        
        const staffId = `s-${Date.now()}`;
        const standardizedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '').slice(-10)}`;
        
        const newStaff: Staff = {
            id: staffId,
            ownerId,
            name,
            role,
            pgId,
            pgName,
            salary: Number(salary) || 0,
            phone: standardizedPhone,
            permissions: permissions || [],
            isActive: true,
            schemaVersion: CURRENT_SCHEMA_VERSION,
            userId: null
        };

        // 1. Save to owner's staff collection
        await db.collection('users_data').doc(ownerId).collection('staff').doc(staffId).set(newStaff);

        // 2. Create/Update skeleton user in appDb (users collection)
        if (appDb) {
            const uid = `staff-${standardizedPhone.replace(/\D/g, '').slice(-10)}`;
            const userRef = appDb.collection('users').doc(uid);
            
            const userUpdate: Partial<User> = {
                id: uid,
                name,
                phone: standardizedPhone,
                role: role, // e.g. 'manager', 'cook'
                ownerId,
                status: 'active',
                permissions: permissions || [],
                createdAt: new Date().toISOString()
            };

            await userRef.set(userUpdate, { merge: true });
            
            // Link the staff record to the user ID
            await db.collection('users_data').doc(ownerId).collection('staff').doc(staffId).update({
                userId: uid
            });
            newStaff.userId = uid;
        }

        return newStaff;
    }

    /**
     * Updates an existing staff member.
     */
    static async updateStaff(db: Firestore, appDb: Firestore, ownerId: string, staffId: string, updates: any): Promise<void> {
        const staffRef = db.collection('users_data').doc(ownerId).collection('staff').doc(staffId);
        const staffSnap = await staffRef.get();
        if (!staffSnap.exists) throw new Error('Staff member not found');
        
        const currentStaff = staffSnap.data() as Staff;
        
        // Ensure numeric salary
        if (updates.salary !== undefined) {
            updates.salary = Number(updates.salary) || 0;
        }

        // Standardize phone if it's being updated
        if (updates.phone) {
            updates.phone = updates.phone.startsWith('+') ? updates.phone : `+91${updates.phone.replace(/\D/g, '').slice(-10)}`;
        }

        await staffRef.update(updates);

        // If userId exists, sync permissions/role to the user document
        const userId = currentStaff.userId;
        if (userId && appDb) {
            const userUpdate: any = {};
            if (updates.permissions) userUpdate.permissions = updates.permissions;
            if (updates.role) userUpdate.role = updates.role;
            if (updates.name) userUpdate.name = updates.name;
            if (updates.isActive !== undefined) userUpdate.status = updates.isActive ? 'active' : 'suspended';

            if (Object.keys(userUpdate).length > 0) {
                await appDb.collection('users').doc(userId).update(userUpdate);
            }
        }
    }

    /**
     * Deletes a staff member record.
     */
    static async deleteStaff(db: Firestore, appDb: Firestore, ownerId: string, staffId: string): Promise<void> {
        const staffRef = db.collection('users_data').doc(ownerId).collection('staff').doc(staffId);
        const staffSnap = await staffRef.get();
        if (!staffSnap.exists) throw new Error('Staff member not found');
        
        const staff = staffSnap.data() as Staff;
        
        // 1. Delete from staff collection
        await staffRef.delete();

        // 2. We don't necessarily delete the user from 'users' to avoid breaking their history,
        // but we suspend them or remove as staff
        if (staff.userId && appDb) {
            await appDb.collection('users').doc(staff.userId).update({
                status: 'suspended',
                role: 'unassigned'
            });
        }
    }

    /**
     * Gets all staff for an owner.
     */
    static async getStaffList(db: Firestore, ownerId: string): Promise<Staff[]> {
        const snap = await db.collection('users_data').doc(ownerId).collection('staff').get();
        return snap.docs.map(doc => doc.data() as Staff);
    }
}
