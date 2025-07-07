
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { User, Plan, PlanName, UserRole } from '../types';
import { plans } from '../mock-data';
import { auth, db, isFirebaseConfigured } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { fetchPgs } from './pgsSlice';
import { fetchGuests } from './guestsSlice';
import { fetchComplaints } from './complaintsSlice';
import { fetchExpenses } from './expensesSlice';
import { fetchStaff } from './staffSlice';
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
export const initializeUser = createAsyncThunk<User, FirebaseUser, { state: RootState }>(
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

export const fetchAllData = createAsyncThunk<void, User, { dispatch: any, state: RootState }>(
    'user/fetchAllData',
    async (user, { dispatch, getState }) => {
        const plan = plans[user.subscription?.planId || 'free'];
        const useCloud = plan.hasCloudSync && isFirebaseConfigured();
        
        dispatch(fetchPgs({ userId: user.id, useCloud }));
        dispatch(fetchGuests({ userId: user.id, useCloud }));
        dispatch(fetchComplaints({ userId: user.id, useCloud }));
        dispatch(fetchExpenses({ userId: user.id, useCloud }));
        dispatch(fetchStaff({ userId: user.id, useCloud }));
    }
);

export const updateUserPlan = createAsyncThunk<User, PlanName, { state: RootState }>(
    'user/updateUserPlan',
    async (planId, { getState, rejectWithValue }) => {
        const { currentUser } = (getState() as RootState).user;
        if (!currentUser || !isFirebaseConfigured()) return rejectWithValue('User or Firebase not available');

        const updatedUser: User = { ...currentUser, subscription: { ...(currentUser.subscription || { status: 'active' }), planId: planId } };
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
