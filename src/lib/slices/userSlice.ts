
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { User, Plan, PlanName, UserRole } from '../types';
import { plans } from '../mock-data';
import { auth, db, isFirebaseConfigured } from '../firebase';
import { doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { RootState } from '../store';

interface UserState {
    currentUser: User | null;
    currentPlan: Plan | null;
}

const initialState: UserState = {
    currentUser: null,
    currentPlan: null,
};

// Async Thunks
export const initializeUser = createAsyncThunk<User, FirebaseUser>(
    'user/initializeUser',
    async (firebaseUser, { rejectWithValue }) => {
        if (!isFirebaseConfigured()) return rejectWithValue('Firebase not configured');
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            return userDoc.data() as User;
        } else {
            const newUser: User = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || 'New User',
                email: firebaseUser.email || undefined,
                role: 'owner',
                subscription: { planId: 'free', status: 'active' },
                avatarUrl: firebaseUser.photoURL || `https://placehold.co/40x40.png?text=${(firebaseUser.displayName || 'NU').slice(0, 2).toUpperCase()}`
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
        const isDowngrading = oldPlan.hasCloudSync && !newPlan.hasCloudSync;
        
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
                guests.forEach(guest => batch.set(doc(db, 'users_data', userId, 'guests', guest.id), guest));
                complaints.forEach(complaint => batch.set(doc(db, 'users_data', userId, 'complaints', complaint.id), complaint));
                expenses.forEach(expense => batch.set(doc(db, 'users_data', userId, 'expenses', expense.id), expense));
                staff.forEach(staffMember => batch.set(doc(db, 'users_data', userId, 'staff', staffMember.id), staffMember));
                notifications.forEach(notification => batch.set(doc(db, 'users_data', userId, 'notifications', notification.id), notification));
                
                await batch.commit();
            } catch (error) {
                console.error("Failed to sync local data to cloud on upgrade:", error);
                return rejectWithValue('Failed to sync data on upgrade.');
            }
        } else if (isDowngrading) {
            // Save latest cloud data (already in state) to local storage
            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem('pgs', JSON.stringify(state.pgs.pgs));
                    localStorage.setItem('guests', JSON.stringify(state.guests.guests));
                    localStorage.setItem('complaints', JSON.stringify(state.complaints.complaints));
                    localStorage.setItem('expenses', JSON.stringify(state.expenses.expenses));
                    localStorage.setItem('staff', JSON.stringify(state.staff.staff));
                    localStorage.setItem('notifications', JSON.stringify(state.notifications.notifications));
                } catch (error) {
                    console.error("Failed to sync cloud data to local on downgrade:", error);
                    return rejectWithValue('Failed to save data locally on downgrade.');
                }
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
        if (!currentUser || !isFirebaseConfigured()) return rejectWithValue('User or Firebase not available');
        
        const { guestId, ...restOfUser } = currentUser;
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
        if(isFirebaseConfigured()) {
            await auth.signOut();
        }
        if (typeof window !== 'undefined') {
            localStorage.removeItem('pgs');
            localStorage.removeItem('guests');
            localStorage.removeItem('complaints');
            localStorage.removeItem('expenses');
            localStorage.removeItem('staff');
            localStorage.removeItem('notifications');
            localStorage.removeItem('selectedPgId');
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
            .addCase(initializeUser.fulfilled, (state, action) => {
                state.currentUser = action.payload;
                state.currentPlan = plans[action.payload.subscription?.planId || 'free'];
            })
            .addCase(initializeUser.rejected, (state) => {
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
