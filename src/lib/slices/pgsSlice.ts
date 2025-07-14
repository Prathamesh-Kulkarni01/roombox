

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { PG, Floor, Room, Bed } from '../types';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { defaultMenu } from '../mock-data';
import { RootState } from '../store';
import { addGuest } from './guestsSlice';

interface PgsState {
    pgs: PG[];
}

const initialState: PgsState = {
    pgs: [],
};

type NewPgData = Pick<PG, 'name' | 'location' | 'city' | 'gender'>;

// Async Thunks
export const fetchPgs = createAsyncThunk(
    'pgs/fetchPgs',
    async ({ userId, useCloud }: { userId: string, useCloud: boolean }) => {
        if (useCloud) {
            const pgsCollection = collection(db, 'users_data', userId, 'pgs');
            const pgsSnap = await getDocs(pgsCollection);
            return pgsSnap.docs.map(d => d.data() as PG);
        } else {
            if(typeof window === 'undefined') return [];
            const localPgs = localStorage.getItem('pgs');
            return localPgs ? JSON.parse(localPgs) : [];
        }
    }
);

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
            await setDoc(docRef, updatedPg);
        }
        return updatedPg;
    }
);

export const deletePg = createAsyncThunk<string, string, { state: RootState }>(
    'pgs/deletePg',
    async (pgId, { getState, rejectWithValue }) => {
        const { user, guests } = getState();
        if (!user.currentUser) return rejectWithValue('No user');

        const hasActiveGuests = guests.guests.some(g => g.pgId === pgId && !g.exitDate);
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
            .addCase(fetchPgs.fulfilled, (state, action) => {
                state.pgs = action.payload;
            })
            .addCase(addPg.fulfilled, (state, action) => {
                state.pgs.push(action.payload);
            })
            .addCase(updatePg.fulfilled, (state, action) => {
                const index = state.pgs.findIndex(p => p.id === action.payload.id);
                if (index !== -1) {
                    state.pgs[index] = action.payload;
                }
            })
            .addCase(addGuest.fulfilled, (state, action) => {
                if (!action.payload) return;
                const { updatedPg } = action.payload;
                const index = state.pgs.findIndex(p => p.id === updatedPg.id);
                if (index !== -1) {
                    state.pgs[index] = updatedPg;
                }
            })
            .addCase('guests/updateGuest/fulfilled', (state, action: PayloadAction<{ updatedGuest: Guest, updatedPg?: PG }>) => {
                if (!action.payload.updatedPg) return;
                const { updatedPg } = action.payload;
                const index = state.pgs.findIndex(p => p.id === updatedPg.id);
                if (index !== -1) {
                    state.pgs[index] = updatedPg;
                }
            })
            .addCase('guests/vacateGuest/fulfilled', (state, action: PayloadAction<{ guest: Guest, pg: PG }>) => {
                 if (!action.payload.pg) return;
                const { pg } = action.payload;
                const index = state.pgs.findIndex(p => p.id === pg.id);
                if (index !== -1) {
                    state.pgs[index] = pg;
                }
            })
             .addCase(deletePg.fulfilled, (state, action) => {
                state.pgs = state.pgs.filter(p => p.id !== action.payload);
            })
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.pgs = [];
            });
    },
});

export const { setPgs } = pgsSlice.actions;
export default pgsSlice.reducer;
