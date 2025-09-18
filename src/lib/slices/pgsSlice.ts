
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { PG, Floor, Room, Bed } from '../types';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';
import { defaultMenu } from '../mock-data';
import { RootState } from '../store';
import { addGuest, updateGuest } from './guestsSlice';

interface PgsState {
    pgs: PG[];
}

const initialState: PgsState = {
    pgs: [],
};

type NewPgData = Pick<PG, 'name' | 'location' | 'city' | 'gender'>;

// Async Thunks
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
            menu: defaultMenu,
            status: 'pending_approval' // Set default status
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
        
        // Ensure there are no undefined values
        const sanitizedPg: PG = {
            ...updatedPg,
            rules: updatedPg.rules || [],
            contact: updatedPg.contact || '',
            floors: updatedPg.floors || [],
            menu: updatedPg.menu || defaultMenu,
            amenities: updatedPg.amenities || [],
            images: updatedPg.images || [],
        };

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const docRef = doc(db, 'users_data', user.currentUser.id, 'pgs', sanitizedPg.id);
            await setDoc(docRef, sanitizedPg, { merge: true });
        }
        return sanitizedPg;
    }
);

export const deletePg = createAsyncThunk<string, string, { state: RootState }>(
    'pgs/deletePg',
    async (pgId, { getState, rejectWithValue }) => {
        const { user, guests } = getState();
        const ownerId = user.currentUser?.id;
        if (!ownerId) return rejectWithValue('No user');

        const hasActiveGuests = guests.guests.some(g => g.pgId === pgId && !g.isVacated);
        if (hasActiveGuests) {
            return rejectWithValue('Cannot delete property with active guests. Please vacate all guests first.');
        }

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured() && db) {
            const batch = writeBatch(db);
            
            const pgDocRef = doc(db, 'users_data', ownerId, 'pgs', pgId);
            batch.delete(pgDocRef);

            const subCollections = ['guests', 'staff', 'complaints', 'expenses'];
            for (const subCollection of subCollections) {
                const q = query(collection(db, 'users_data', ownerId, subCollection), where('pgId', '==', pgId));
                const snapshot = await getDocs(q);
                snapshot.docs.forEach(docSnap => {
                    batch.delete(docSnap.ref);
                });
            }

            await batch.commit();
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
            .addCase(addPg.fulfilled, (state, action) => {
                state.pgs.push(action.payload);
            })
            .addCase(updatePg.fulfilled, (state, action) => {
                const index = state.pgs.findIndex(p => p.id === action.payload.id);
                if (index !== -1) {
                    state.pgs[index] = action.payload;
                }
            })
            .addCase(deletePg.fulfilled, (state, action) => {
                state.pgs = state.pgs.filter(p => p.id !== action.payload);
            })
            .addCase(addGuest.fulfilled, (state, action) => {
                if (!action.payload) return;
                const { updatedPg } = action.payload;
                const index = state.pgs.findIndex(p => p.id === updatedPg.id);
                if (index !== -1) {
                    state.pgs[index] = updatedPg;
                }
            })
            .addCase(updateGuest.fulfilled, (state, action) => {
                if (!action.payload.updatedPg) return;
                const { updatedPg } = action.payload;
                const index = state.pgs.findIndex(p => p.id === updatedPg.id);
                if (index !== -1) {
                    state.pgs[index] = updatedPg;
                }
            })
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.pgs = [];
            });
    },
});

export const { setPgs } = pgsSlice.actions;
export default pgsSlice.reducer;
