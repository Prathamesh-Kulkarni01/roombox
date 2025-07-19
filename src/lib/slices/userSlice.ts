
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { User, Plan, PlanName } from '../types';
import { plans } from '../mock-data';
import { auth } from '../firebase';
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
        try {
            const res = await fetch('/api/user-init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL
                }),
            });
            if (!res.ok) throw new Error('Failed to initialize user on backend');
            return await res.json();
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const updateUserPlan = createAsyncThunk<User, PlanName, { state: RootState }>(
    'user/updateUserPlan',
    async (planId, { getState, rejectWithValue }) => {
        const { currentUser } = (getState() as RootState).user;
        if (!currentUser) return rejectWithValue('User not logged in');

        try {
             const res = await fetch('/api/user-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId }),
            });
            if (!res.ok) throw new Error('Failed to update plan on backend');
            return await res.json();
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const disassociateAndCreateOwnerAccount = createAsyncThunk<User, void, { state: RootState }>(
    'user/disassociateAndCreateOwnerAccount',
    async (_, { getState, rejectWithValue }) => {
        const { currentUser } = (getState() as RootState).user;
        if (!currentUser) return rejectWithValue('User not logged in');
        
        try {
             const res = await fetch('/api/user-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newRole: 'owner' }),
            });
            if (!res.ok) throw new Error('Failed to update role on backend');
            await auth.signOut();
            return await res.json();
        } catch(error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const logoutUser = createAsyncThunk(
    'user/logoutUser',
    async () => {
        await auth.signOut();
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
