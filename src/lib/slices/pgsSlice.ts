
'use client'

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { PG } from '../types';

interface PgsState {
    pgs: PG[];
}

const initialState: PgsState = {
    pgs: [],
};

const pgsSlice = createSlice({
    name: 'pgs',
    initialState,
    reducers: {
        setPgs: (state, action: PayloadAction<PG[]>) => {
            state.pgs = action.payload;
        },
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
