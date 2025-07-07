
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { PG, Floor, Room, Bed } from '../types';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { produce } from 'immer';
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
    async ({ userId, useCloud }: { userId: string, useCloud: boolean }, { rejectWithValue }) => {
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
            await setDoc(docRef, updatedPg, { merge: true });
        }
        return updatedPg;
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
                const { newGuest } = action.payload;
                const pgToUpdate = state.pgs.find(p => p.id === newGuest.pgId);
                if (pgToUpdate) {
                    pgToUpdate.occupancy += 1;
                    pgToUpdate.floors?.forEach(floor => {
                        floor.rooms.forEach(room => {
                            const bed = room.beds.find(b => b.id === newGuest.bedId);
                            if (bed) bed.guestId = newGuest.id;
                        });
                    });
                }
            })
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.pgs = [];
            });
    },
});

export const { setPgs } = pgsSlice.actions;
export default pgsSlice.reducer;
