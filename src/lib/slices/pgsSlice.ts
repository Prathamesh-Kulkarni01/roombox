
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { PG } from '../types';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { defaultMenu } from '../mock-data';
import { RootState } from '../store';

interface PgsState {
    pgs: PG[];
}

const initialState: PgsState = {
    pgs: [],
};

type NewPgData = Pick<PG, 'name' | 'location' | 'city' | 'gender'>;

export const addPg = createAsyncThunk<PG, NewPgData, { state: RootState }>(
    'pgs/addPg',
    async (newPgData, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser) return rejectWithValue('No user');

        const newPg: PG = { 
            id: `pg-${Date.now()}`, 
            ...newPgData, 
            ownerId: user.currentUser.id, 
            images: ['https://placehold.co/600x400.png'], 
            rating: 0, 
            occupancy: 0, 
            totalBeds: 0, 
            rules: [], 
            contact: '', 
            priceRange: { min: 0, max: 0 }, 
            amenities: ['wifi', 'food'], 
            floors: [], 
            menu: defaultMenu 
        };

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const docRef = doc(db, 'users_data', user.currentUser.id, 'pgs', newPg.id);
            await setDoc(docRef, newPg);
        }
        return newPg;
    }
);

export const updatePg = createAsyncThunk<PG, PG, { state: RootState }>(
    'pgs/updatePg',
    async (updatedPg, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser) return rejectWithValue('No user');

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const docRef = doc(db, 'users_data', user.currentUser.id, 'pgs', updatedPg.id);
            await setDoc(docRef, updatedPg, { merge: true });
        }
        return updatedPg;
    }
);

export const deletePg = createAsyncThunk<string, string, { state: RootState }>(
    'pgs/deletePg',
    async (pgId, { getState, rejectWithValue }) => {
        const { user, guests } = getState();
        if (!user.currentUser) return rejectWithValue('No user');

        const hasActiveGuests = guests.guests.some(g => g.pgId === pgId && !g.isVacated);
        if (hasActiveGuests) {
            return rejectWithValue('Cannot delete property with active guests. Please vacate all guests first.');
        }

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const docRef = doc(db, 'users_data', user.currentUser.id, 'pgs', pgId);
            await deleteDoc(docRef);
        }
        return pgId;
    }
);

const pgsSlice = createSlice({
    name: 'pgs',
    initialState,
    reducers: {
        setPgs: (state, action: PayloadAction<PG[]>) => {
            state.pgs = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.pgs = [];
            });
    },
});

export const { setPgs } = pgsSlice.actions;
export default pgsSlice.reducer;
