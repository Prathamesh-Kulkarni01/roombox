
'use client'

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { User, Plan, PlanName, UserRole, Guest, Staff, Invite, PremiumFeatures, PaymentMethod, BusinessKycDetails } from '../types';
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
import { sanitizeObjectForFirebase } from '../utils';


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
        try {
            if (!isFirebaseConfigured() || !db) {
                dispatch(setLoading(false));
                return rejectWithValue('Firebase not configured');
            }
            
            const userDocRef = doc(db!, 'users', firebaseUser.uid);
            let userDoc = await getDoc(userDocRef);

            const getPlanForUser = (user: User): Plan => {
                 if (!user.subscription || user.subscription.status === 'inactive') {
                    return plans.free;
                }
                
                const isActive = user.subscription.status === 'active';
                const isTrialing = user.subscription.status === 'trialing' && user.subscription.trialEndDate && isAfter(new Date(user.subscription.trialEndDate), new Date());
                
                if (isActive || isTrialing) {
                    return { ...plans.pro };
                }
                
                return plans.free;
            };

            if (!userDoc.exists()) {
                // --- This is a brand new user ---
                // Create their document immediately with an 'unassigned' role.
                const baseUser = {
                    id: firebaseUser.uid,
                    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'New User',
                    role: 'unassigned',
                    status: 'pending_approval',
                    avatarUrl: firebaseUser.photoURL || `https://placehold.co/40x40.png?text=${((firebaseUser.displayName || 'NU') || 'NU').slice(0, 2).toUpperCase()}`,
                    guestId: null as null,
                    createdAt: new Date().toISOString(),
                } as Partial<User>;

                if (firebaseUser.email) {
                    baseUser.email = firebaseUser.email;
                }
                if (firebaseUser.phoneNumber) {
                    baseUser.phone = firebaseUser.phoneNumber;
                }

                const newUser = baseUser as User;

                await setDoc(userDocRef, newUser);
                userDoc = await getDoc(userDocRef); // Re-fetch the newly created doc to ensure consistency.
            }

            let userData = userDoc.data() as User;

            // --- Handle Invites for New or Existing Users ---
            // This check runs for users who have just been created ('unassigned') or existing users who might have received an invite.
            if (userData.role === 'unassigned' && userData.email) {
                const inviteDocRef = doc(db!, 'invites', userData.email);
                const inviteDoc = await getDoc(inviteDocRef);

                if (inviteDoc.exists()) {
                    const inviteData = inviteDoc.data() as Invite;
                    const batch = writeBatch(db!);
                    
                    let roleUpdate: Partial<User> = {
                        role: inviteData.role,
                        ownerId: inviteData.ownerId,
                    };

                    if (inviteData.role === 'tenant') {
                        const guestDetails = inviteData.details as Guest;
                        roleUpdate.guestId = guestDetails.id;
                        roleUpdate.pgId = guestDetails.pgId;
                        
                        const guestDocRef = doc(db!, 'users_data', inviteData.ownerId, 'guests', guestDetails.id);
                        batch.update(guestDocRef, { userId: firebaseUser.uid });
                    } else { // Staff roles
                        const staffDetails = inviteData.details as Staff;
                        roleUpdate.pgIds = [staffDetails.pgId];
                        const staffDocRef = doc(db!, 'users_data', inviteData.ownerId, 'staff', staffDetails.id);
                        batch.update(staffDocRef, { userId: firebaseUser.uid });
                    }

                    batch.update(userDocRef, roleUpdate);
                    batch.delete(inviteDocRef);
                    await batch.commit();

                    // Re-fetch user data to get the new role
                    userDoc = await getDoc(userDocRef);
                    userData = userDoc.data() as User;
                }
            }
            
            // --- Fetch correct plan and permissions based on final role ---
            let ownerIdForPermissions = userData.role === 'owner' ? userData.id : userData.ownerId;
            let finalUserData = userData;

            if (userData.role !== 'owner' && userData.role !== 'admin' && ownerIdForPermissions) {
                const ownerDocRef = doc(db!, 'users', ownerIdForPermissions);
                const ownerDoc = await getDoc(ownerDocRef);
                if(ownerDoc.exists()) {
                    finalUserData.subscription = ownerDoc.data().subscription;
                }
            }
            
            const userPlan = getPlanForUser(finalUserData);
            
            if (ownerIdForPermissions) {
                dispatch(fetchPermissions({ ownerId: ownerIdForPermissions, plan: userPlan }));
            }

            return finalUserData;
        } catch (error: any) {
            console.error('[initializeUser] failed:', error);
            return rejectWithValue(error?.message || 'initializeUser failed with unknown error');
        }
    }
);

export const updateUserKycDetails = createAsyncThunk<User, BusinessKycDetails, { state: RootState }>(
    'user/updateKycDetails',
    async (kycData, { getState, rejectWithValue }) => {
        const { currentUser } = (getState() as RootState).user;
        if (!currentUser) return rejectWithValue('User not found.');

        const userDocRef = doc(db!, 'users', currentUser.id);
        
        const kycUpdate = {
            'subscription.kycDetails': sanitizeObjectForFirebase(kycData),
        };

        await updateDoc(userDocRef, kycUpdate);
        
        const updatedDoc = await getDoc(userDocRef);
        return updatedDoc.data() as User;
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
            
            const userDocRef = doc(db!, 'users', currentUser.id);
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
            }
            const errMsg = (result as any)?.error || 'Failed to toggle premium feature';
            throw new Error(errMsg);
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
            guestId: null,
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

        const userDocRef = doc(db!, 'users', currentUser.id);
        await setDoc(userDocRef, updatedUser, { merge: true });
        
        if (auth) {
            await auth.signOut(); // This will trigger the auth state listener to clear the state
        }
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
                } else if (action.payload?.role === 'unassigned') {
                    state.currentPlan = plans.free; // Assign a temporary plan
                }
                 else {
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
            })
            .addCase(updateUserKycDetails.fulfilled, (state, action) => {
                state.currentUser = action.payload;
            });
    },
});

export const { setCurrentUser, updateUserPlan } = userSlice.actions;
export default userSlice.reducer;
