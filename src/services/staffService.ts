import { auth } from '@/lib/firebaseAdmin';
import { Firestore, FieldValue } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import { CURRENT_SCHEMA_VERSION, type Staff, type User, type PerformerInfo } from '@/lib/types';
import { ActivityLogsService } from '@/lib/activity-logs-service';

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

        let appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://rentsutra.vercel.app').replace(/\/+$/, '');
        const magicLink = `${appUrl}/invite/${token}`;
        return { magicLink, inviteCode };
    }

    /**
     * Adds a new staff member to the owner's collection.
     */
    static async addStaff(db: Firestore, appDb: Firestore, staffData: any, performer: PerformerInfo): Promise<Staff> {
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
            userId: null,
            createdAt: new Date().toISOString(),
            createdBy: performer,
            updatedAt: new Date().toISOString(),
            updatedBy: performer
        };

        // For backward compatibility (lazy migration)
        if (pgIds?.length > 0) {
            newStaff.pgId = pgIds[0];
            newStaff.pgName = pgNames?.[0] || 'Property';
        }

        // 1. Save to owner's staff collection
        await db.collection('users_data').doc(ownerId).collection('staff').doc(staffId).set(newStaff);

        await ActivityLogsService.logActivity({
            ownerId,
            activityType: 'STAFF_ADDED',
            module: 'staff',
            details: `Added staff: ${name} as ${role}`,
            targetId: staffId,
            targetType: 'staff',
            status: 'success',
            performedBy: performer,
            metadata: { role, pgIds }
        });

        // 2. Create/Update skeleton user in appDb (users collection)
        if (appDb) {
            let uid = `staff-${standardizedPhone.replace(/\D/g, '').slice(-10)}`;
            const cleanPhoneTen = standardizedPhone.replace(/\D/g, '').slice(-10);
            const internalEmail = `${cleanPhoneTen}@roombox.app`;

            // Robust UID Discovery: Check Firebase Auth before deciding on the final UID
            try {
                let authUser = null;
                try {
                    authUser = await auth.getUserByPhoneNumber(standardizedPhone);
                } catch (e) {
                    try {
                        authUser = await auth.getUserByEmail(internalEmail);
                    } catch (e2) {}
                }

                if (authUser && authUser.uid !== uid) {
                    console.log(`[StaffService] Found existing Auth user ${authUser.uid} for phone ${standardizedPhone}. Using it instead of ${uid}`);
                    uid = authUser.uid;
                }
            } catch (authDiscoveryErr) {
                console.warn('[StaffService] Auth discovery failed, falling back to deterministic UID');
            }

            const userRef = appDb.collection('users').doc(uid);
            
            const staffProfile = {
                staffId,
                ownerId,
                role: role,
                pgIds: pgIds || []
            };

            const existingUserSnap = await userRef.get();
            const existingUserData = existingUserSnap.exists ? existingUserSnap.get('role') : null;

            const userUpdate: any = {
                id: uid,
                name,
                phone: standardizedPhone,
                ownerId,
                staffId,
                pgIds: pgIds || [], 
                pgId: pgIds?.[0] || '', 
                status: 'active',
                permissions: permissions || [],
                updatedAt: new Date().toISOString(),
                activeStaffProfiles: FieldValue.arrayUnion(staffProfile)
            };

            // Role Priority: Do not overwrite if user is already an 'owner'
            if (existingUserData !== 'owner') {
                userUpdate.role = role;
            }

            // Only set createdAt if it doesn't exist
            if (!existingUserSnap.exists) {
                userUpdate.createdAt = new Date().toISOString();
            }

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
                console.log(`[StaffService] Set custom claims for staff: ${uid}`);
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
    static async updateStaff(db: Firestore, appDb: Firestore, ownerId: string, staffId: string, updates: any, performer: PerformerInfo): Promise<void> {
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

        const now = new Date().toISOString();
        updates.updatedAt = now;
        updates.updatedBy = performer;
        
        const changedFields = ActivityLogsService.getChangedFields(currentStaff, updates);
        await staffRef.update(updates);

        if (changedFields.length > 0) {
            await ActivityLogsService.logActivity({
                ownerId,
                activityType: 'STAFF_UPDATED',
                module: 'staff',
                details: `Updated staff: ${currentStaff.name} (${changedFields.join(', ')})`,
                targetId: staffId,
                targetType: 'staff',
                status: 'success',
                performedBy: performer,
                changes: {
                    before: currentStaff,
                    after: { ...currentStaff, ...updates },
                    changedFields
                }
            });
        }

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
                // Multi-Profile Sync: If this staff is the 'Primary' session, root update is enough.
                // However, we should also update their entry in the activeStaffProfiles array.
                const userDoc = await appDb.collection('users').doc(userId).get();
                const currentProfiles = (userDoc.data()?.activeStaffProfiles || []) as any[];
                
                const updatedProfiles = currentProfiles.map(p => {
                    if (p.staffId === staffId && p.ownerId === ownerId) {
                        return {
                            ...p,
                            role: updates.role || p.role,
                            pgIds: updates.pgIds || p.pgIds || []
                        };
                    }
                    return p;
                });

                if (JSON.stringify(updatedProfiles) !== JSON.stringify(currentProfiles)) {
                    userUpdate.activeStaffProfiles = updatedProfiles;
                }

                await appDb.collection('users').doc(userId).update(userUpdate);
                
                // Sync updated claims to Firebase Auth
                const fullUserData = (await appDb.collection('users').doc(userId).get()).data() as User;
                
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
    static async deleteStaff(db: Firestore, appDb: Firestore, ownerId: string, staffId: string, performer: PerformerInfo): Promise<void> {
        const staffRef = db.collection('users_data').doc(ownerId).collection('staff').doc(staffId);
        const staffSnap = await staffRef.get();
        if (!staffSnap.exists) throw new Error('Staff member not found');
        
        const staff = staffSnap.data() as Staff;
        
        // 1. Delete from staff collection
        await staffRef.delete();

        await ActivityLogsService.logActivity({
            ownerId,
            activityType: 'STAFF_DELETED',
            module: 'staff',
            details: `Deleted staff: ${staff.name}`,
            targetId: staffId,
            targetType: 'staff',
            status: 'success',
            performedBy: performer,
            metadata: { prevRole: staff.role }
        });

        // 2. We don't necessarily delete the user from 'users' to avoid breaking their history,
        // but we suspend them or remove as staff
        // Multi-Property Aware Deletion: Remove from activeStaffProfiles and promote next session if primary was deleted.
        if (staff.userId && appDb) {
            try {
                const userRef = appDb.doc(`users/${staff.userId}`);
                const userDoc = await userRef.get();
                const userData = userDoc.exists ? userDoc.data() : null;

                if (userData) {
                    const profileToRemove = {
                        staffId,
                        ownerId,
                        role: staff.role,
                        pgIds: staff.pgIds || []
                    };

                    const updates: any = {
                        activeStaffProfiles: FieldValue.arrayRemove(profileToRemove),
                        updatedAt: Date.now()
                    };

                    // If the deleted staff info was the 'Primary' session, promote another one
                    if (userData.staffId === staffId) {
                        const remainingProfiles = (userData.activeStaffProfiles || [])
                            .filter((p: any) => p.staffId !== staffId);
                        
                        if (remainingProfiles.length > 0) {
                            const next = remainingProfiles[0];
                            updates.staffId = next.staffId;
                            updates.role = next.role;
                            updates.ownerId = next.ownerId;
                            updates.pgIds = next.pgIds || [];
                            updates.pgId = next.pgIds?.[0] || '';
                            console.log(`[StaffService.deleteStaff] Promoting next active staff profile: ${next.staffId}`);
                        } else {
                            // No more active staff roles - only suspend if they don't have active tenancies either
                            if (!(userData.activeTenancies && userData.activeTenancies.length > 0)) {
                                updates.status = 'suspended';
                                updates.role = 'unassigned';
                                updates.staffId = null;
                            } else {
                                // Keep active as a tenant
                                updates.staffId = null;
                                updates.role = 'tenant';
                            }
                        }
                    }

                    await userRef.update(updates);
                }
            } catch (e) {
                console.warn('[StaffService.deleteStaff] Could not update user multi-session data:', e);
            }
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
