'use client'

import { createSlice, PayloadAction, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import type { Guest, KycDocumentConfig } from '../types';
import type { RootState } from '../store';
import { auth } from '../firebase';

interface GuestsState {
    guests: Guest[];
    loading: boolean;
    error: string | null;
    optimisticGuests: Record<string, Guest>;
}

const initialState: GuestsState = {
    guests: [],
    loading: false,
    error: null,
    optimisticGuests: {},
};

export const updateGuestKyc = createAsyncThunk(
    'guests/updateKyc',
    async (payload: { documents: { config: KycDocumentConfig; dataUri: string }[] }, { rejectWithValue }) => {
        try {
            const token = await auth?.currentUser?.getIdToken();
            const response = await fetch('/api/guest/kyc', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error('Failed to update KYC');
            return await response.json();
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

const guestsSlice = createSlice({
    name: 'guests',
    initialState,
    reducers: {
        setGuests: (state, action: PayloadAction<Guest[]>) => {
            state.guests = action.payload;
            // Reconciliation: Remove optimistic guests that have been superseded by authoritative data
            action.payload.forEach(guest => {
                const optGuest = state.optimisticGuests[guest.id];
                if (optGuest) {
                    // If real data is newer or same age as optimistic, clear optimistic
                    if (!optGuest.updatedAt || (guest.updatedAt && guest.updatedAt >= optGuest.updatedAt)) {
                        delete state.optimisticGuests[guest.id];
                    }
                }
            });
        },
        updateGuest: (state, action: PayloadAction<Guest>) => {
            const guest = action.payload;
            const index = state.guests.findIndex(g => g.id === guest.id);
            if (index !== -1) {
                state.guests[index] = guest;
            } else {
                state.guests.push(guest);
            }

            // Reconciliation
            const optGuest = state.optimisticGuests[guest.id];
            if (optGuest) {
                if (!optGuest.updatedAt || (guest.updatedAt && guest.updatedAt >= optGuest.updatedAt)) {
                    delete state.optimisticGuests[guest.id];
                }
            }
        },
        setOptimisticGuest: (state, action: PayloadAction<Guest>) => {
            state.optimisticGuests[action.payload.id] = {
                ...action.payload,
                pending: true
            };
        },
        removeOptimisticGuest: (state, action: PayloadAction<string>) => {
            delete state.optimisticGuests[action.payload];
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(updateGuestKyc.pending, (state) => {
                state.loading = true;
            })
            .addCase(updateGuestKyc.fulfilled, (state, action: PayloadAction<Guest>) => {
                state.loading = false;
                const index = state.guests.findIndex(g => g.id === action.payload.id);
                if (index !== -1) {
                    state.guests[index] = action.payload;
                }
            })
            .addCase(updateGuestKyc.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.guests = [];
                state.optimisticGuests = {};
            });
    },
});

// Selectors
export const selectGuestsState = (state: RootState) => state.guests;

export const selectMergedGuests = createSelector(
    [selectGuestsState],
    (state) => {
        const merged = [...state.guests];
        
        // Overlay optimistic guests
        Object.values(state.optimisticGuests).forEach(optGuest => {
            const index = merged.findIndex(g => g.id === optGuest.id);
            if (index !== -1) {
                merged[index] = optGuest;
            } else {
                merged.push(optGuest);
            }
        });

        return merged;
    }
);

export const { setGuests, updateGuest, setOptimisticGuest, removeOptimisticGuest } = guestsSlice.actions;
export default guestsSlice.reducer;
