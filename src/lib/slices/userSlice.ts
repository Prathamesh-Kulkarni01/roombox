
'use client'

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { User, Plan, PlanName, UserRole, Guest, Staff, Invite, PremiumFeatures, PaymentMethod } from '../types';
import { plans } from '../mock-data';
import { auth, db, isFirebaseConfigured } from '../firebase';
import { doc, getDoc, setDoc, writeBatch, deleteDoc, collection, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { RootState } from '../store';
import { setLoading } from './appSlice';
import { fetchPermissions, updatePermissions } from './permissionsSlice';
import { isAfter } from 'date-fns';
import { planPermissionConfig, type RolePermissions } from '../permissions';
import { togglePremiumFeature as togglePremiumFeatureAction } from '../actions/userActions';


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
            
            const basePlanId = (isActive || isTrialing) ? 'pro' : 'free';
            let finalPlan = { ...plans[basePlanId] };

            if (isActive || isTrialing) {
                 finalPlan = { ...plans.pro }; // A subscribed user always has Pro capabilities
            }
            
            return finalPlan;
        };


        if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            
            // This case handles users who have signed up but not yet selected a role.
            if (userData.role === 'unassigned') {
                return userData;
            }

            const ownerIdForPermissions = userData.role === 'owner' ? userData.id : userData.ownerId;
            let finalUserData = userData;

            if (userData.role !== 'owner' && userData.role !== 'admin' && userData.ownerId) {
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
            let createdFromInvite = false;

            if (userEmail) {
                const inviteDocRef = doc(db, 'invites', userEmail);
                const inviteDoc = await getDoc(inviteDocRef);

                if (inviteDoc.exists()) {
                    createdFromInvite = true;
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
                            status: 'active',
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
                            status: 'active',
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
            
            if(!createdFromInvite) {
                 // It's a brand new user, not from an invite. Create an 'unassigned' user.
                const newUser: User = {
                    id: firebaseUser.uid,
                    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'New User',
                    email: firebaseUser.email ?? undefined,
                    phone: firebaseUser.phoneNumber || undefined,
                    role: 'unassigned',
                    status: 'pending_approval',
                    avatarUrl: firebaseUser.photoURL || `https://placehold.co/40x40.png?text=${((firebaseUser.displayName || 'NU') || 'NU').slice(0, 2).toUpperCase()}`,
                    guestId: null,
                    createdAt: new Date().toISOString(),
                };
                await setDoc(userDocRef, newUser);
                userDataToReturn = newUser;
            }
        }
        
        if (userDataToReturn) {
            return userDataToReturn;
        }

        return rejectWithValue('Could not initialize user');
    }
);

export const finalizeUserRole = createAsyncThunk<User, 'owner' | 'tenant', { state: RootState }>(
    'user/finalizeUserRole',
    async (role, { getState, rejectWithValue }) => {
        const { currentUser } = (getState() as RootState).user;
        if (!currentUser || currentUser.role !== 'unassigned') {
            return rejectWithValue('User is not eligible for role finalization.');
        }

        if (role === 'owner') {
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 15);

            const updatedUser: User = {
                ...currentUser,
                role: 'owner',
                status: 'pending_approval',
                subscription: {
                    planId: 'pro',
                    status: 'trialing',
                    trialEndDate: trialEndDate.toISOString(),
                    premiumFeatures: {
                        website: { enabled: true },
                        kyc: { enabled: true },
                        whatsapp: { enabled: true }
                    }
                }
            };
            
            const userDocRef = doc(db, 'users', currentUser.id);
            await setDoc(userDocRef, updatedUser, { merge: true });
            return updatedUser;
        }
        
        // If role is 'tenant', we don't change anything in the DB.
        // The user is guided to get an invite link.
        // We return the current user state to keep them on the 'unassigned' page.
        return currentUser;
    }
);


export const togglePremiumFeature = createAsyncThunk(
    'user/togglePremiumFeature',
    async ({ feature, enabled }: { feature: keyof PremiumFeatures, enabled: boolean }, { getState, rejectWithValue }) => {
        const { currentUser } = (getState() as RootState).user;
        if (!currentUser) return rejectWithValue('User not found.');

        try {
            const result = await togglePremiumFeatureAction({ userId: currentUser.id, feature, enabled });
            if (result.success && result.updatedUser) {
                return { feature, enabled, updatedUser: result.updatedUser as User };
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
             return rejectWithValue(error.message);
        }
    }
);


export const disassociateAndCreateOwnerAccount = createAsyncThunk<User, void, { state: RootState }>(
    'user/disassociateAndCreateOwnerAccount',
    async (_, { getState, rejectWithValue }) => {
        const { currentUser } = (getState() as RootState).user;
        if (!currentUser || !isFirebaseConfigured() || !db) return rejectWithValue('User or Firebase not available');
        
        const { guestId, ownerId, ...restOfUser } = currentUser;
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 15);
        const updatedUser: User = { 
            ...restOfUser, 
            role: 'owner', 
            status: 'pending_approval',
            subscription: { 
                planId: 'pro',
                status: 'trialing',
                trialEndDate: trialEndDate.toISOString(),
                premiumFeatures: {
                    website: { enabled: true },
                    kyc: { enabled: true },
                    whatsapp: { enabled: true }
                }
            } 
        };

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
            if (action.payload) {
                const sub = action.payload.subscription;
                 if (!sub || sub.status === 'inactive') {
                    state.currentPlan = plans.free;
                    return;
                }
                const isActive = sub.status === 'active';
                const isTrialing = sub.status === 'trialing' && sub.trialEndDate && isAfter(new Date(sub.trialEndDate), new Date());
                const basePlanId = (isActive || isTrialing) ? 'pro' : 'free';
                state.currentPlan = { ...plans[basePlanId] };
            } else {
                 state.currentPlan = null;
            }
        },
        updateUserPlan: (state, action: PayloadAction<PlanName>) => {
            if (state.currentUser) {
                state.currentPlan = plans[action.payload];
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
                    const basePlanId = (isActive || isTrialing) ? 'pro' : 'free';
                    state.currentPlan = { ...plans[basePlanId] };
                } else {
                    state.currentPlan = plans.free;
                }
            })
            .addCase(initializeUser.rejected, (state, action) => {
                console.error("Initialize user rejected:", action.payload);
                state.currentUser = null;
                state.currentPlan = null;
            })
            .addCase(togglePremiumFeature.fulfilled, (state, action) => {
                state.currentUser = action.payload.updatedUser;
            })
            .addCase(logoutUser.fulfilled, (state) => {
                state.currentUser = null;
                state.currentPlan = null;
            })
            .addCase(disassociateAndCreateOwnerAccount.fulfilled, (state) => {
                state.currentUser = null;
                state.currentPlan = null;
            })
            .addCase(finalizeUserRole.fulfilled, (state, action) => {
                state.currentUser = action.payload;
                if(action.payload.role === 'owner') {
                    state.currentPlan = plans.pro; // Trial plan is a variant of pro
                }
            });
    },
});

export const { setCurrentUser, updateUserPlan } = userSlice.actions;
export default userSlice.reducer;
