

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { User, Plan, PlanName, UserRole, Guest, Staff, Invite } from '../types';
import { plans } from '../mock-data';
import { auth, db, isFirebaseConfigured } from '../firebase';
import { doc, getDoc, setDoc, writeBatch, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { RootState } from '../store';
import { setLoading } from './appSlice';

interface UserState {
    currentUser: User | null;
    currentPlan: Plan | null;
}

const initialState: UserState = {
    currentUser: null,
    currentPlan: null,
};

// Async Thunks
export const initializeUser = createAsyncThunk<User, FirebaseUser, { dispatch: any }>(
    'user/initializeUser',
    async (firebaseUser, { dispatch, rejectWithValue }) => {
        if (!isFirebaseConfigured() || !db) {
            dispatch(setLoading(false));
            return rejectWithValue('Firebase not configured');
        }
        
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            return userDoc.data() as User;
        } else {
            const userEmail = firebaseUser.email;
            if (userEmail) {
                const inviteDocRef = doc(db, 'invites', userEmail);
                const inviteDoc = await getDoc(inviteDocRef);

                if (inviteDoc.exists()) {
                    const inviteData = inviteDoc.data() as Invite;
                    let newUser: User;

                    if (inviteData.role === 'tenant') {
                        const guestDetails = inviteData.details as Guest;
                        newUser = {
                            id: firebaseUser.uid,
                            name: firebaseUser.displayName || guestDetails.name || 'New Tenant',
                            email: firebaseUser.email,
                            role: 'tenant',
                            guestId: guestDetails.id,
                            ownerId: inviteData.ownerId,
                            pgId: guestDetails.pgId,
                            avatarUrl: firebaseUser.photoURL || `https://placehold.co/40x40.png?text=${((firebaseUser.displayName || guestDetails.name) || 'NT').slice(0, 2).toUpperCase()}`
                        };
                        const guestDocRef = doc(db, 'users_data', inviteData.ownerId, 'guests', guestDetails.id);
                        await setDoc(guestDocRef, { userId: firebaseUser.uid }, { merge: true });
                    } else { // Handle staff roles
                        const staffDetails = inviteData.details as Staff;
                         newUser = {
                            id: firebaseUser.uid,
                            name: firebaseUser.displayName || staffDetails.name || 'New Staff',
                            email: firebaseUser.email,
                            role: inviteData.role,
                            ownerId: inviteData.ownerId,
                            pgIds: [staffDetails.pgId],
                            avatarUrl: firebaseUser.photoURL || `https://placehold.co/40x40.png?text=${((firebaseUser.displayName || staffDetails.name) || 'NS').slice(0, 2).toUpperCase()}`
                        };
                         const staffDocRef = doc(db, 'users_data', inviteData.ownerId, 'staff', staffDetails.id);
                         await setDoc(staffDocRef, { userId: firebaseUser.uid }, { merge: true });
                    }

                    const batch = writeBatch(db);
                    batch.set(userDocRef, newUser);
                    batch.delete(inviteDocRef);
                    await batch.commit();
                    
                    return newUser;
                }
            }
            
            // Default to creating an owner account if no invite is found
            const newUser: User = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || 'New Owner',
                email: firebaseUser.email,
                role: 'owner',
                subscription: { planId: 'free', status: 'active' },
                avatarUrl: firebaseUser.photoURL || `https://placehold.co/40x40.png?text=${((firebaseUser.displayName) || 'NO').slice(0, 2).toUpperCase()}`
            };
            await setDoc(userDocRef, newUser);
            return newUser;
        }
    }
);

export const updateUserPlan = createAsyncThunk<User, PlanName, { state: RootState }>(
    'user/updateUserPlan',
    async (planId, { getState, rejectWithValue }) => {
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

        const userDocRef = doc(db, 'users', currentUser.id);
        await setDoc(userDocRef, updatedUser, { merge: true });

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

        const userDocRef = doc(db, 'users', currentUser.id);
        await setDoc(userDocRef, updatedUser, { merge: true });
        
        await auth.signOut(); // This will trigger the auth state listener to clear the state
        return updatedUser;
    }
);

export const logoutUser = createAsyncThunk(
    'user/logoutUser',
    async () => {
        if(isFirebaseConfigured() && auth) {
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
            state.currentPlan = action.payload ? plans[action.payload.subscription?.planId || 'free'] : null;
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
                state.currentPlan = plans[action.payload.subscription?.planId || 'free'];
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
