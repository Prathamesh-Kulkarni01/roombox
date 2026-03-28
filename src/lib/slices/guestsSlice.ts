'use client'

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import type { Guest, KycDocumentConfig } from '../types';

interface GuestsState {
    guests: Guest[];
    loading: boolean;
    error: string | null;
}

const initialState: GuestsState = {
    guests: [],
    loading: false,
    error: null,
};

export const updateGuestKyc = createAsyncThunk(
    'guests/updateKyc',
    async (payload: { documents: { config: KycDocumentConfig; dataUri: string }[] }, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/guest/kyc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            });
    },
});

export const { setGuests } = guestsSlice.actions;
export default guestsSlice.reducer;
