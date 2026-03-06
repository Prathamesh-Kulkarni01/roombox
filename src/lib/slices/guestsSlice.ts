'use client'

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Guest } from '../types';

interface GuestsState {
    guests: Guest[];
}

const initialState: GuestsState = {
    guests: [],
};

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
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.guests = [];
            });
    },
});

export const { setGuests } = guestsSlice.actions;
export default guestsSlice.reducer;
