/**
 * USER SLICE
 * Changes:
 * - Added hydration logic for persistent user state.
 * - Improved login/logout state management for auth transition.
 */
'use client'

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { User, Plan, PlanName, UserRole, Guest, Staff, Invite, PremiumFeatures, PaymentMethod, BusinessKycDetails } from '../types';
import { plans } from '../mock-data';
import { auth, db, isFirebaseConfigured, getOwnerClientDb, getDynamicDb } from '../firebase';
import { doc, getDoc, setDoc, writeBatch, deleteDoc, collection, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { RootState } from '../store';
import { setLoading } from './appSlice';
import { fetchPermissions, updatePermissions } from './permissionsSlice';
import { isAfter, parseISO } from 'date-fns';
import { planPermissionConfig, type RolePermissions } from '../permissions';
import { togglePremiumFeature as togglePremiumFeatureAction } from '../actions/userActions';
import { updatePayoutMode as updatePayoutModeAction } from '../actions/payoutActions';
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
            console.log(`[initializeUser] Resolving user: ${firebaseUser.uid}`);
            const userDocRef = doc(db!, 'users', firebaseUser.uid);

            // Force server-side fetch initially to avoid stale cached roles
            let userDoc = await getDoc(userDocRef).catch((e) => {
                console.warn(`[initializeUser] Initial getDoc failed for ${firebaseUser.uid}:`, e);
                return getDoc(userDocRef);
            });

            // If still unassigned, wait briefly for propagation if a server-side update just happened
            if (userDoc.exists() && (userDoc.data() as User).role === 'unassigned') {
                console.log(`[initializeUser] Role is unassigned. Waiting for propagation...`);
                await new Promise(r => setTimeout(r, 800));
                userDoc = await getDoc(userDocRef);
            }

            const getPlanForUser = (user: User): Plan => {
                const sub = user.subscription;
                if (!sub || sub.status === 'inactive') return plans.free;
                const isActive = sub.status === 'active';
                const isTrialing = sub.status === 'trialing' && sub.trialEndDate && isAfter(parseISO(sub.trialEndDate), new Date());
                return (isActive || isTrialing) ? { ...plans.pro } : plans.free;
            };

            if (!userDoc.exists()) {
                console.log(`[initializeUser] Creating new skeleton user doc for ${firebaseUser.uid}`);
                const baseUser: User = {
                    id: firebaseUser.uid,
                    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'New User',
                    role: 'unassigned',
                    status: 'pending_approval',
                    avatarUrl: firebaseUser.photoURL || `https://placehold.co/40x40.png?text=${((firebaseUser.displayName || 'NU') || 'NU').slice(0, 2).toUpperCase()}`,
                    guestId: null as any,
                    createdAt: new Date().toISOString(),
                };
                if (firebaseUser.email) baseUser.email = firebaseUser.email;
                if (firebaseUser.phoneNumber) baseUser.phone = firebaseUser.phoneNumber;
                await setDoc(userDocRef, baseUser);
                userDoc = await getDoc(userDocRef);
            }

            let userData = { ...userDoc.data(), id: userDoc.id } as User;
            console.log(`[initializeUser] Firestore role: ${userData.role}, Id: ${userData.id}`);

            // --- Robust Role Resolution: Check Auth Claims vs Firestore ---
            // Force refresh token to get latest claims set by magic-login/set-password APIs
            const tokenResult = await firebaseUser.getIdTokenResult(true).catch(e => {
                console.warn('[initializeUser] Claims refresh failed, using cached:', e);
                return firebaseUser.getIdTokenResult();
            });
            const roleFromClaim = tokenResult.claims.role as UserRole;

            if (roleFromClaim && roleFromClaim !== 'unassigned') {
                if (userData.role !== roleFromClaim) {
                    console.log(`[initializeUser] Overriding Firestore role (${userData.role}) with Auth Claim: ${roleFromClaim}`);
                    userData.role = roleFromClaim;
                }
                
                // Always merge IDs from claims as they are more authoritative for the current session
                if (tokenResult.claims.ownerId) userData.ownerId = tokenResult.claims.ownerId as string;
                if (tokenResult.claims.guestId) userData.guestId = tokenResult.claims.guestId as string;
                if (tokenResult.claims.pgId) userData.pgId = tokenResult.claims.pgId as string;
                if (tokenResult.claims.pgs && Array.isArray(tokenResult.claims.pgs)) userData.pgIds = tokenResult.claims.pgs as string[];
                if (tokenResult.claims.permissions && Array.isArray(tokenResult.claims.permissions) && (tokenResult.claims.permissions as string[]).length > 0) {
                    userData.permissions = tokenResult.claims.permissions as string[];
                }
            }

            // --- Handle Invites (only if still unassigned) ---
            if (userData.role === 'unassigned' && userData.email) {
                try {
                    console.log(`[initializeUser] Checking global invites for ${userData.email}`);
                    const inviteDocRef = doc(db!, 'invites', userData.email);
                    const inviteDoc = await getDoc(inviteDocRef);

                    if (inviteDoc.exists()) {
                        const inviteData = inviteDoc.data() as Invite;
                        const batch = writeBatch(db!);
                        console.log(`[initializeUser] Found invite for role: ${inviteData.role}`);

                        // Optional Mapping logic for Enterprise/Staff
                        try {
                            const ownerDocRef = doc(db!, 'users', inviteData.ownerId);
                            const ownerDoc = await getDoc(ownerDocRef).catch(() => null);
                            if (ownerDoc && ownerDoc.exists()) {
                                const enterprise = ownerDoc.data()?.subscription?.enterpriseProject;
                                if (enterprise?.projectId || enterprise?.databaseId) {
                                    const enterpriseDb = enterprise.databaseId ? getDynamicDb(enterprise.databaseId) : db!;
                                    if (enterpriseDb) {
                                        const targetDocRef = inviteData.role === 'tenant'
                                            ? doc(enterpriseDb, 'users_data', inviteData.ownerId, 'guests', (inviteData.details as Guest).id)
                                            : doc(enterpriseDb, 'users_data', inviteData.ownerId, 'staff', (inviteData.details as Staff).id);
                                        await setDoc(targetDocRef, { userId: firebaseUser.uid }, { merge: true }).catch(e => console.warn('[initializeUser] Enterprise mapping failed:', e));
                                    }
                                }
                            }
                        } catch (err) { /* Expected for non-owners */ }

                        const roleUpdate: Partial<User> = { role: inviteData.role, ownerId: inviteData.ownerId };
                        if (inviteData.role === 'tenant') {
                            const guestDetails = inviteData.details as Guest;
                            roleUpdate.guestId = guestDetails.id;
                            roleUpdate.pgId = guestDetails.pgId;
                        }

                        batch.update(userDocRef, roleUpdate);
                        batch.delete(inviteDocRef);
                        await batch.commit().catch(e => console.warn('[initializeUser] Batch commit failed:', e));

                        // Local update of userData
                        userData = { ...userData, ...roleUpdate };
                    }
                } catch (inviteError) {
                    console.warn('[initializeUser] Invite resolution forbidden/failed:', inviteError);
                }
            }

            // --- Fetch owner subscription for non-owners ---
            let ownerIdForPermissions = userData.role === 'owner' ? userData.id : userData.ownerId;
            let finalUserData = userData;

            if (userData.role !== 'owner' && userData.role !== 'admin' && ownerIdForPermissions) {
                try {
                    const ownerDocRef = doc(db!, 'users', ownerIdForPermissions);
                    const ownerDoc = await getDoc(ownerDocRef);
                    if (ownerDoc.exists()) {
                        finalUserData.subscription = ownerDoc.data().subscription;
                    }
                } catch (subErr) {
                    console.warn('[initializeUser] Could not fetch owner subscription (forbidden):', subErr);
                }
            }

            const userPlan = getPlanForUser(finalUserData);
            if (ownerIdForPermissions) {
                console.log(`[initializeUser] Fetching permissions for role: ${finalUserData.role} under owner: ${ownerIdForPermissions}`);
                dispatch(fetchPermissions({ ownerId: ownerIdForPermissions, plan: userPlan }));
            }

            return finalUserData;
        } catch (error: any) {
            console.error('[initializeUser] CRITICAL FAILURE:', error);
            return rejectWithValue(error?.message || 'initializeUser failed');
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
                status: 'active', // Owners are active by default now
                subscription: {
                    planId: 'pro',
                    status: 'trialing',
                    trialEndDate: trialEndDate.toISOString(),
                    premiumFeatures: {
                        website: { enabled: true },
                        kyc: { enabled: true },
                        whatsapp: { enabled: true }
                    },
                    whatsappCredits: 150 // Initial 100 free template messages
                },
                isOnboarded: true,
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

export const updatePayoutMode = createAsyncThunk<User, 'PAYOUT' | 'ROUTE', { state: RootState }>(
    'user/updatePayoutMode',
    async (mode, { getState, rejectWithValue }) => {
        const { currentUser } = (getState() as RootState).user;
        if (!currentUser) return rejectWithValue('User not found.');

        try {
            const token = await auth?.currentUser?.getIdToken();
            const result = await updatePayoutModeAction(mode, token);
            if (result.success && result.updatedUser) {
                return result.updatedUser as User;
            }
            throw new Error('Failed to update payout mode');
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
                },
                whatsappCredits: 150 // Initial 100 free template messages
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
        if (isFirebaseConfigured() && auth) {
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
            if (action.payload && state.currentUser) {
                // Merge to preserve authoritative fields from claims that might be missing in Firestore skeleton doc
                const mergedUser = { ...state.currentUser, ...action.payload };
                
                // Explicitly preserve linking IDs and role if they exist in state but not in payload (or are default/unassigned)
                if (!action.payload.ownerId && state.currentUser.ownerId) mergedUser.ownerId = state.currentUser.ownerId;
                if (!action.payload.guestId && state.currentUser.guestId) mergedUser.guestId = state.currentUser.guestId;
                if (!action.payload.pgId && state.currentUser.pgId) mergedUser.pgId = state.currentUser.pgId;
                if (!action.payload.pgIds && state.currentUser.pgIds) mergedUser.pgIds = state.currentUser.pgIds;
                // Preserve claims-based permissions: Firestore skeleton doc often lacks this field
                if ((!action.payload.permissions || action.payload.permissions.length === 0) && state.currentUser.permissions && state.currentUser.permissions.length > 0) {
                    mergedUser.permissions = state.currentUser.permissions;
                }
                
                // CRITICAL: Preserve subscription if state has it but payload (likely from a skeleton user doc) doesn't
                if (!action.payload.subscription && state.currentUser.subscription) {
                    mergedUser.subscription = state.currentUser.subscription;
                }

                // Also preserve role if the payload has 'unassigned' but state has a specific role
                if (action.payload.role === 'unassigned' && state.currentUser.role !== 'unassigned') {
                    mergedUser.role = state.currentUser.role;
                }

                state.currentUser = mergedUser;
            } else {
                state.currentUser = action.payload;
            }

            if (state.currentUser) {
                const sub = state.currentUser.subscription;
                if (!sub || sub.status === 'inactive') {
                    state.currentPlan = plans.free;
                } else {
                    const isActive = sub.status === 'active';
                    const trialEndDate = sub.trialEndDate;
                    const isTrialing = sub.status === 'trialing' && trialEndDate && isAfter(parseISO(trialEndDate), new Date());
                    const basePlanId = (isActive || isTrialing) ? 'pro' : 'free';
                    state.currentPlan = { ...plans[basePlanId] };
                }
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
                // Don't clear user during re-auth — this causes redirect flicker
                // when signInWithCustomToken fires a new auth event.
                // User is only cleared on explicit logout via logoutUser.fulfilled.
            })
            .addCase(initializeUser.fulfilled, (state, action) => {
                state.currentUser = action.payload;
                if (action.payload?.subscription) {
                    const sub = action.payload.subscription;
                    const isActive = sub.status === 'active';
                    const trialEndDate = sub.trialEndDate;
                    const isTrialing = sub.status === 'trialing' && trialEndDate && isAfter(parseISO(trialEndDate), new Date());
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
                if (action.payload.role === 'owner') {
                    state.currentPlan = plans.pro; // Trial plan is a variant of pro
                }
            })
            .addCase(updateUserKycDetails.fulfilled, (state, action) => {
                state.currentUser = action.payload;
            })
            .addCase(updatePayoutMode.fulfilled, (state, action) => {
                state.currentUser = action.payload;
            });
    },
});

export const { setCurrentUser, updateUserPlan } = userSlice.actions;
export default userSlice.reducer;
