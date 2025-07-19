
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { PG, Guest } from '../types';
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
export const fetchPgs = createAsyncThunk<PG[], void, { state: RootState }>(
    'pgs/fetchPgs',
    async (_, { getState }) => {
        const { user } = getState();
        if (!user.currentUser) return [];
        const res = await fetch('/api/data/pgs');
        return await res.json();
    }
);

export const addPg = createAsyncThunk<PG, NewPgData, { state: RootState }>(
    'pgs/addPg',
    async (newPgData, { rejectWithValue }) => {
        const res = await fetch('/api/data/pgs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPgData)
        });
        if (!res.ok) return rejectWithValue('Failed to add PG');
        return await res.json();
    }
);

export const updatePg = createAsyncThunk<PG, PG, { state: RootState }>(
    'pgs/updatePg',
    async (updatedPg, { rejectWithValue }) => {
        const res = await fetch(`/api/data/pgs/${updatedPg.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedPg)
        });
        if (!res.ok) return rejectWithValue('Failed to update PG');
        return await res.json();
    }
);

export const deletePg = createAsyncThunk<string, string, { state: RootState }>(
    'pgs/deletePg',
    async (pgId, { getState, rejectWithValue }) => {
        const { guests } = getState();
        const hasActiveGuests = guests.guests.some(g => g.pgId === pgId && !g.exitDate);
        if (hasActiveGuests) {
            return rejectWithValue('Cannot delete property with active guests. Please vacate all guests first.');
        }

        const res = await fetch(`/api/data/pgs/${pgId}`, { method: 'DELETE' });
        if (!res.ok) return rejectWithValue('Failed to delete PG');
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
