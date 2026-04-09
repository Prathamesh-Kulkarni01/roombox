import { auth } from '@/lib/firebaseAdmin';
import { Firestore, FieldValue } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import { CURRENT_SCHEMA_VERSION, type Staff, type User } from '@/lib/types';

export class StaffService {
    /**
     * Generates a single-use magic link token for a staff member.
     */
    static async generateMagicLink(appDb: Firestore, staffId: string, phone: string, ownerId: string, role: string, pgName?: string): Promise<{ magicLink: string, inviteCode: string }> {
        const token = crypto.randomBytes(32).toString('hex');
        const inviteCode = Math.floor(100000 + Math.random() * 900000).toString();

        await appDb.collection('magic_links').doc(token).set({
            token,
            inviteCode,
            staffId,
            phone,
            ownerId,
            role,
            pgName: pgName || 'RentSutra',
            createdAt: Date.now(),
            expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days expiry for staff
            used: false
        });

        let appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://rentsutra.app').replace(/\/+$/, '');
        const magicLink = `${appUrl}/invite/${token}`;
        return { magicLink, inviteCode };
    }

    /**
     * Adds a new staff member to the owner's collection.
     */
    static async addStaff(db: Firestore, appDb: Firestore, staffData: any): Promise<Staff> {
        const { ownerId, phone, name, role, pgIds, pgNames, salary, permissions } = staffData;
        
        const staffId = `s-${Date.now()}`;
        const standardizedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '').slice(-10)}`;
        
        const newStaff: Staff = {
            id: staffId,
            ownerId,
            name,
            role,
            pgIds: pgIds || [],
            pgNames: pgNames || [],
            salary: Number(salary) || 0,
            phone: standardizedPhone,
            permissions: permissions || [],
            isActive: true,
            schemaVersion: CURRENT_SCHEMA_VERSION,
            userId: null
        };

        // For backward compatibility (lazy migration)
        if (pgIds?.length > 0) {
            newStaff.pgId = pgIds[0];
            newStaff.pgName = pgNames?.[0] || 'Property';
        }

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
                staffId, // Critical for finding the original staff record
                pgIds: pgIds || [], // Now multiple properties
                pgId: pgIds?.[0] || '', // Maintain single pgId for quick access/legacy
                status: 'active',
                permissions: permissions || [],
                createdAt: new Date().toISOString()
            };

            await userRef.set(userUpdate, { merge: true });
            
            // Sync custom claims immediately
            const claims = {
                role: userUpdate.role,
                ownerId: userUpdate.ownerId,
                staffId: userUpdate.staffId,
                permissions: userUpdate.permissions
            };
            try {
                await auth.setCustomUserClaims(uid, claims);
                console.log(`[StaffService] Set custom claims for new staff: ${uid}`);
            } catch (err) {
                console.error(`[StaffService] Failed to set custom claims for ${uid}:`, err);
            }
            
            // Link the staff record to the user ID
            await db.collection('users_data').doc(ownerId).collection('staff').doc(staffId).update({
                userId: uid
            });
            newStaff.userId = uid;
        }

        // 3. Send Welcome WhatsApp (Non-blocking)
        if (standardizedPhone && ownerId) {
            (async () => {
                try {
                    const { createAndSendNotification } = await import('@/lib/actions/notificationActions');
                    
                    const primaryPgName = pgNames?.[0] || 'RentSutra';
                    const { magicLink } = await StaffService.generateMagicLink(appDb, staffId, standardizedPhone, ownerId, role, primaryPgName);
                    
                    const dashboardUrl = magicLink;

                    // Fetch Owner Phone for "Host Contact" param
                    const ownerDoc = await db.collection('users').doc(ownerId).get();
                    let ownerPhone = ownerDoc.data()?.phone || 'Contact Support';
                    const ownerSnap = await db.collection('users_data').doc(ownerId).get();
                    if (ownerSnap.exists) {
                        const data = ownerSnap.data() as any;
                        if (data.phone) {
                            ownerPhone = data.phone.replace(/\D/g, '').slice(-10);
                            ownerPhone = `+91 ${ownerPhone}`; // Formatted for readable display in body text
                        }
                    }
                    
                    await createAndSendNotification({
                        ownerId,
                        notification: {
                            targetId: newStaff.userId || staffId,
                            type: 'staff-welcome',
                            title: 'Welcome to the Team!',
                            message: `Hi ${name}, you've been added as a ${role} to ${pgNames?.[0] || 'your property'}.`,
                            link: dashboardUrl
                        },
                        whatsappConfig: {
                            templateId: 'new_guest_welcome_utility_2',
                            bodyValues: [
                                { type: 'text', text: name }, // {{1}} - Name
                                { type: 'text', text: pgNames?.[0] || 'Property' }, // {{2}} - Building
                                { type: 'text', text: role.toUpperCase() }, // {{3}} - Role
                                { type: 'text', text: `₹${salary || 0}` }, // {{4}} - Salary/Rent
                                { type: 'text', text: ownerPhone }, // {{5}} - Host Contact
                                { type: 'text', text: dashboardUrl } // {{6}} - Action Link
                            ],
                            headerValues: [
                                { 
                                    type: 'image', 
                                    image: { 
                                        link: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?fm=jpg&w=800&q=80' 
                                    } 
                                }
                            ],
                            buttonValues: [],
                            languageCode: 'en_US'
                        }
                    });
                } catch (err) {
                    console.error('[StaffService] Welcome notification failed:', err);
                }
            })();
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
            if (updates.pgIds) {
                userUpdate.pgIds = updates.pgIds;
                userUpdate.pgId = updates.pgIds[0] || '';
            }
            if (updates.isActive !== undefined) userUpdate.status = updates.isActive ? 'active' : 'suspended';

            if (Object.keys(userUpdate).length > 0) {
                await appDb.collection('users').doc(userId).update(userUpdate);
                
                // Sync updated claims to Firebase Auth
                const userDoc = await appDb.collection('users').doc(userId).get();
                const fullUserData = userDoc.data() as User;
                
                const claims = {
                    role: fullUserData.role,
                    ownerId: fullUserData.ownerId,
                    staffId: fullUserData.staffId,
                    permissions: fullUserData.permissions || []
                };
                
                try {
                    await auth.setCustomUserClaims(userId, claims);
                    console.log(`[StaffService] Updated custom claims for: ${userId}`);
                } catch (err) {
                    console.error(`[StaffService] Failed to update custom claims for ${userId}:`, err);
                }
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
