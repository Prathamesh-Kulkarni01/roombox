
'use client'

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { PG, MenuTemplate } from '../types';

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
        updatePg: (state, action: PayloadAction<PG>) => {
            const index = state.pgs.findIndex(pg => pg.id === action.payload.id);
            if (index !== -1) {
                state.pgs[index] = action.payload;
            }
        },
        addMenuTemplate: (state, action: PayloadAction<{ pgId: string; template: MenuTemplate }>) => {
            const pg = state.pgs.find(p => p.id === action.payload.pgId);
            if (pg) {
                if (!pg.menuTemplates) pg.menuTemplates = [];
                pg.menuTemplates.push(action.payload.template);
            }
        },
        deleteMenuTemplate: (state, action: PayloadAction<{ pgId: string; templateId: string }>) => {
            const pg = state.pgs.find(p => p.id === action.payload.pgId);
            if (pg && pg.menuTemplates) {
                pg.menuTemplates = pg.menuTemplates.filter(t => t.id !== action.payload.templateId);
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.pgs = [];
            });
    },
});

export const { setPgs, updatePg, addMenuTemplate, deleteMenuTemplate } = pgsSlice.actions;
export default pgsSlice.reducer;
