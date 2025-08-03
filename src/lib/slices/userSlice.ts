

'use client'

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { User, Plan, PlanName, UserRole, Guest, Staff, Invite } from '../types';
import { plans } from '../mock-data';
import { auth, db, isFirebaseConfigured } from '../firebase';
import { doc, getDoc, setDoc, writeBatch, deleteDoc, collection, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { RootState } from '../store';
import { setLoading } from './appSlice';
import { fetchPermissions, updatePermissions } from './permissionsSlice';
import { isAfter } from 'date-fns';
import { planPermissionConfig } from '../permissions';
import { RolePermissions } from '../permissions';

interface UserState {
    currentUser: User | null;
    currentPlan: Plan | null;
}

const initialState: UserState = {
    currentUser: null,
    currentPlan: null,
};

// Async Thunks
export const initializeUser = createAsyncThunk<User, FirebaseUser, { dispatch: any; state: RootState }>(
    'user/initializeUser',
    async (firebaseUser, { dispatch, getState, rejectWithValue }) => {
        if (!isFirebaseConfigured() || !db) {
            dispatch(setLoading(false));
            return rejectWithValue('Firebase not configured');
        }
        
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        let userDoc = await getDoc(userDocRef);

        let userDataToReturn: User | null = null;
        
        const getPlanForUser = (user: User): Plan => {
            if (!user.subscription || user.subscription.status === 'inactive') {
                return plans.free;
            }
            
            const isActive = user.subscription.status === 'active';
            const isTrialing = user.subscription.status === 'trialing' && user.subscription.trialEndDate && isAfter(new Date(user.subscription.trialEndDate), new Date());
            
            if (isActive || isTrialing) {
                return plans[user.subscription.planId];
            }
            
            return plans.free;
        };


        if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            const ownerIdForPermissions = userData.role === 'owner' ? userData.id : userData.ownerId;
            let finalUserData = userData;

            if (userData.role !== 'owner' && userData.ownerId) {
                const ownerDocRef = doc(db, 'users', userData.ownerId);
                const ownerDoc = await getDoc(ownerDocRef);
                if(ownerDoc.exists()) {
                    const ownerData = ownerDoc.data() as User;
                    finalUserData.subscription = ownerData.subscription;
                }
            }
            
            const userPlan = getPlanForUser(finalUserData);
            
            if (ownerIdForPermissions) {
                dispatch(fetchPermissions({ ownerId: ownerIdForPermissions, plan: userPlan }));
            }
            
            userDataToReturn = finalUserData;

        } else {
            const userEmail = firebaseUser.email;
            if (userEmail) {
                const inviteDocRef = doc(db, 'invites', userEmail);
                const inviteDoc = await getDoc(inviteDocRef);

                if (inviteDoc.exists()) {
                    const inviteData = inviteDoc.data() as Invite;
                    let newUser: User;
                    const batch = writeBatch(db);

                    if (inviteData.role === 'tenant') {
                        const guestDetails = inviteData.details as Guest;
                        newUser = {
                            id: firebaseUser.uid,
                            name: firebaseUser.displayName || guestDetails.name || 'New Tenant',
                            email: firebaseUser.email ?? undefined,
                            role: 'tenant',
                            guestId: guestDetails.id,
                            guestHistoryIds: [],
                            ownerId: inviteData.ownerId,
                            pgId: guestDetails.pgId,
                            avatarUrl: firebaseUser.photoURL || `https://placehold.co/40x40.png?text=${((firebaseUser.displayName || guestDetails.name) || 'NT').slice(0, 2).toUpperCase()}`
                        };
                        const guestDocRef = doc(db, 'users_data', inviteData.ownerId, 'guests', guestDetails.id);
                        batch.update(guestDocRef, { userId: firebaseUser.uid });
                    } else { // Handle staff roles
                        const staffDetails = inviteData.details as Staff;
                         newUser = {
                            id: firebaseUser.uid,
                            name: firebaseUser.displayName || staffDetails.name || 'New Staff',
                            email: firebaseUser.email ?? undefined,
                            role: inviteData.role,
                            ownerId: inviteData.ownerId,
                            pgIds: [staffDetails.pgId],
                            avatarUrl: firebaseUser.photoURL || `https://placehold.co/40x40.png?text=${((firebaseUser.displayName || staffDetails.name) || 'NS').slice(0, 2).toUpperCase()}`,
                            guestId: null,
                        };
                         const staffDocRef = doc(db, 'users_data', inviteData.ownerId, 'staff', staffDetails.id);
                         batch.update(staffDocRef, { userId: firebaseUser.uid });
                    }
                    
                    batch.set(userDocRef, newUser);
                    batch.delete(inviteDocRef);
                    await batch.commit();
                    
                    userDataToReturn = newUser;
                    
                    const ownerDocRef = doc(db, 'users', inviteData.ownerId);
                    const ownerDoc = await getDoc(ownerDocRef);
                    if (ownerDoc.exists()) {
                        const ownerPlan = getPlanForUser(ownerDoc.data() as User);
                        dispatch(fetchPermissions({ ownerId: inviteData.ownerId, plan: ownerPlan }));
                    }

                }
            }
            
            if(!userDataToReturn) {
                 // Default to creating an owner account if no invite is found
                const trialEndDate = new Date();
                trialEndDate.setMonth(trialEndDate.getMonth() + 3);

                const newUser: User = {
                    id: firebaseUser.uid,
                    name: firebaseUser.displayName || 'New Owner',
                    email: firebaseUser.email ?? undefined,
                    role: 'owner',
                    subscription: { planId: 'pro', status: 'trialing', trialEndDate: trialEndDate.toISOString() },
                    avatarUrl: firebaseUser.photoURL || `https://placehold.co/40x40.png?text=${((firebaseUser.displayName) || 'NO').slice(0, 2).toUpperCase()}`
                };
                await setDoc(userDocRef, newUser);
                userDataToReturn = newUser;
                const ownerPlan = getPlanForUser(newUser);
                dispatch(fetchPermissions({ ownerId: newUser.id, plan: ownerPlan }));
            }
        }
        
        if (userDataToReturn) {
            return userDataToReturn;
        }

        return rejectWithValue('Could not initialize user');
    }
);

export const updateUserPlan = createAsyncThunk<User, PlanName, { state: RootState; dispatch: any }>(
    'user/updateUserPlan',
    async (planId, { getState, rejectWithValue, dispatch }) => {
        const state = getState();
        const { currentUser, currentPlan: oldPlan } = state.user;

        if (!currentUser || !oldPlan || !isFirebaseConfigured()) {
            return rejectWithValue('User, old plan, or Firebase not available');
        }

        const newPlan = plans[planId];
        if (!newPlan) {
            return rejectWithValue('Invalid plan ID');
        }

        if (oldPlan.id === newPlan.id) {
            return currentUser; // No change needed
        }
        
        const isUpgrading = !oldPlan.hasCloudSync && newPlan.hasCloudSync;
        
        if (isUpgrading) {
            // Push local data to cloud
            try {
                const { pgs } = state.pgs;
                const { guests } = state.guests;
                const { complaints } = state.complaints;
                const { expenses } = state.expenses;
                const { staff } = state.staff;
                const { notifications } = state.notifications;
                const { chargeTemplates } = state.chargeTemplates;
                if (!db) throw new Error('Firestore is not initialized.');
                const batch = writeBatch(db);
                const userId = currentUser.id;

                pgs.forEach(pg => batch.set(doc(db, 'users_data', userId, 'pgs', pg.id), pg));
                guests.forEach(guest => {
                    batch.set(doc(db, 'users_data', userId, 'guests', guest.id), guest);
                    if (guest.email && !guest.userId) {
                        const inviteDocRef = doc(db, 'invites', guest.email);
                        const invite: Invite = { email: guest.email, ownerId: userId, role: 'tenant', details: guest };
                        batch.set(inviteDocRef, invite);
                    }
                });
                complaints.forEach(complaint => batch.set(doc(db, 'users_data', userId, 'complaints', complaint.id), complaint));
                expenses.forEach(expense => batch.set(doc(db, 'users_data', userId, 'expenses', expense.id), expense));
                staff.forEach(staffMember => batch.set(doc(db, 'users_data', userId, 'staff', staffMember.id), staffMember));
                notifications.forEach(notification => batch.set(doc(db, 'users_data', userId, 'notifications', notification.id), notification));
                chargeTemplates.forEach(template => batch.set(doc(db, 'users_data', userId, 'chargeTemplates', template.id), template));
                
                await batch.commit();
            } catch (error) {
                console.error("Failed to sync local data to cloud on upgrade:", error);
                return rejectWithValue('Failed to sync data on upgrade.');
            }
        } 
        
        const updatedUser: User = {
            ...currentUser,
            subscription: { ...(currentUser.subscription || { status: 'active' }), planId },
        };

        if (!db) throw new Error('Firestore is not initialized.');
        const userDocRef = doc(db, 'users', currentUser.id);
        await setDoc(userDocRef, updatedUser, { merge: true });

        // --- Permissions cleanup after plan change ---
        // Fetch current permissions
        const ownerId = currentUser.id;
        const docRef = doc(db, 'users_data', ownerId, 'permissions', 'staff_roles_v2');
        let cleanedPermissions: RolePermissions = {
            owner: {},
            manager: {},
            cook: {},
            cleaner: {},
            security: {},
            other: {},
            tenant: {},
        };
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const perms = docSnap.data() as RolePermissions;
                const allowedFeatures = Object.keys(planPermissionConfig[newPlan.id]);
                // Clean up permissions for each role
                for (const role of Object.keys(perms) as Array<keyof RolePermissions>) {
                    const rolePerms = perms[role] || {};
                    cleanedPermissions[role] = {};
                    for (const feature of allowedFeatures) {
                        if (rolePerms[feature]) {
                            cleanedPermissions[role][feature] = rolePerms[feature];
                        }
                    }
                }
                // Save cleaned permissions
                await setDoc(docRef, cleanedPermissions);
                // Also update Redux state
                dispatch(updatePermissions(cleanedPermissions));
            }
        } catch (e) {
            console.error('Failed to clean up permissions after plan change', e);
        }
        // --- End permissions cleanup ---

        return updatedUser;
    }
);

export const disassociateAndCreateOwnerAccount = createAsyncThunk<User, void, { state: RootState }>(
    'user/disassociateAndCreateOwnerAccount',
    async (_, { getState, rejectWithValue }) => {
        const { currentUser } = (getState() as RootState).user;
        if (!currentUser || !isFirebaseConfigured() || !db) return rejectWithValue('User or Firebase not available');
        
        const { guestId, ownerId, ...restOfUser } = currentUser;
        const updatedUser: User = { ...restOfUser, role: 'owner', subscription: { planId: 'free', status: 'active' } };

        if (!db) throw new Error('Firestore is not initialized.');
        const userDocRef = doc(db, 'users', currentUser.id);
        await setDoc(userDocRef, updatedUser, { merge: true });
        
        await auth.signOut(); // This will trigger the auth state listener to clear the state
        return updatedUser;
    }
);

export const logoutUser = createAsyncThunk(
    'user/logoutUser',
    async (_, { getState }) => {
        const { currentUser } = (getState() as RootState).user;
        if(isFirebaseConfigured() && auth) {
            if (currentUser && currentUser.fcmToken) {
                // Clear the FCM token on logout
                if (!db) throw new Error('Firestore is not initialized.');
                const userDocRef = doc(db, 'users', currentUser.id);
                await setDoc(userDocRef, { fcmToken: null }, { merge: true });
            }
            await auth.signOut();
        }
        return null;
    }
)

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setCurrentUser: (state, action: PayloadAction<User | null>) => {
            state.currentUser = action.payload;
            if (action.payload?.subscription) {
                const sub = action.payload.subscription;
                 const isActive = sub.status === 'active';
                const isTrialing = sub.status === 'trialing' && sub.trialEndDate && isAfter(new Date(sub.trialEndDate), new Date());
                state.currentPlan = (isActive || isTrialing) ? plans[sub.planId] : plans.free;
            } else {
                 state.currentPlan = action.payload ? plans.free : null;
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(initializeUser.pending, (state) => {
                state.currentUser = null;
                state.currentPlan = null;
            })
            .addCase(initializeUser.fulfilled, (state, action) => {
                state.currentUser = action.payload;
                if (action.payload?.subscription) {
                    const sub = action.payload.subscription;
                    const isActive = sub.status === 'active';
                    const isTrialing = sub.status === 'trialing' && sub.trialEndDate && isAfter(new Date(sub.trialEndDate), new Date());
                    state.currentPlan = (isActive || isTrialing) ? plans[sub.planId] : plans.free;
                } else {
                    state.currentPlan = plans.free;
                }
            })
            .addCase(initializeUser.rejected, (state, action) => {
                console.error("Initialize user rejected:", action.payload);
                state.currentUser = null;
                state.currentPlan = null;
            })
            .addCase(updateUserPlan.fulfilled, (state, action) => {
                state.currentUser = action.payload;
                state.currentPlan = plans[action.payload.subscription?.planId || 'free'];
            })
            .addCase(logoutUser.fulfilled, (state) => {
                state.currentUser = null;
                state.currentPlan = null;
            })
            .addCase(disassociateAndCreateOwnerAccount.fulfilled, (state) => {
                state.currentUser = null;
                state.currentPlan = null;
            });
    },
});

export const { setCurrentUser } = userSlice.actions;
export default userSlice.reducer;
