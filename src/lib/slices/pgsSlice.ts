
'use client'

import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { PG, MenuTemplate } from '../types';
import type { RootState } from '../store';

interface PgsState {
    pgs: PG[];
    optimisticPgs: Record<string, PG>;
}

const initialState: PgsState = {
    pgs: [],
    optimisticPgs: {},
};

const pgsSlice = createSlice({
    name: 'pgs',
    initialState,
    reducers: {
        setPgs: (state, action: PayloadAction<PG[]>) => {
            state.pgs = action.payload;
            // Reconciliation: Remove optimistic PGs that have been superseded by authoritative data
            action.payload.forEach(pg => {
                const optPg = state.optimisticPgs[pg.id];
                if (optPg) {
                    // Reconciliation: Remove optimistic PG if real data is newer or identical.
                    // Identical timestamps usually mean the server has caught up to the client's write.
                    if (!optPg.updatedAt || (pg.updatedAt && pg.updatedAt >= optPg.updatedAt)) {
                        delete state.optimisticPgs[pg.id];
                    }
                }
            });
        },
        updatePg: (state, action: PayloadAction<PG>) => {
            const pg = action.payload;
            const index = state.pgs.findIndex(p => p.id === pg.id);
            if (index !== -1) {
                state.pgs[index] = pg;
            } else {
                state.pgs.push(pg);
            }

            // Reconciliation
            const optPg = state.optimisticPgs[pg.id];
            if (optPg) {
                if (!optPg.updatedAt || (pg.updatedAt && pg.updatedAt >= optPg.updatedAt)) {
                    delete state.optimisticPgs[pg.id];
                }
            }
        },
        setOptimisticPg: (state, action: PayloadAction<PG>) => {
            // Set pending flag for UI markers
            state.optimisticPgs[action.payload.id] = {
                ...action.payload,
                pending: true
            };
        },
        removeOptimisticPg: (state, action: PayloadAction<string>) => {
            delete state.optimisticPgs[action.payload];
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
                state.optimisticPgs = {};
            });
    },
});

// Selectors
export const selectPgsState = (state: RootState) => state.pgs;

export const selectMergedPgs = createSelector(
    [selectPgsState],
    (state) => {
        const merged = [...state.pgs];
        
        // Overlay optimistic PGs
        Object.values(state.optimisticPgs).forEach(optPg => {
            const index = merged.findIndex(p => p.id === optPg.id);
            if (index !== -1) {
                // If real data exists but optPg is pending, overlay optPg
                merged[index] = optPg;
            } else {
                // New optimistic PG
                merged.push(optPg);
            }
        });

        return merged;
    }
);

export const { setPgs, updatePg, setOptimisticPg, removeOptimisticPg, addMenuTemplate, deleteMenuTemplate } = pgsSlice.actions;
export default pgsSlice.reducer;
