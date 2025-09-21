
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { PG, Floor, Room, Bed, MenuTemplate } from '../types';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch, query, where, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
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
            inventory: updatedPg.inventory || [],
            menuTemplates: updatedPg.menuTemplates || [],
        };

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const docRef = doc(db, 'users_data', user.currentUser.id, 'pgs', sanitizedPg.id);
            await setDoc(docRef, sanitizedPg, { merge: true });
        }
        return sanitizedPg;
    }
);

export const addMenuTemplate = createAsyncThunk<{ pgId: string, template: MenuTemplate }, { pgId: string, template: MenuTemplate }, { state: RootState }>(
    'pgs/addMenuTemplate',
    async ({ pgId, template }, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser) return rejectWithValue('No user');

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const docRef = doc(db, 'users_data', user.currentUser.id, 'pgs', pgId);
            await updateDoc(docRef, {
                menuTemplates: arrayUnion(template)
            });
        }
        return { pgId, template };
    }
);

export const deleteMenuTemplate = createAsyncThunk<{ pgId: string, templateId: string }, { pgId: string, templateId: string }, { state: RootState }>(
    'pgs/deleteMenuTemplate',
    async ({ pgId, templateId }, { getState, rejectWithValue }) => {
        const { user, pgs } = getState();
        if (!user.currentUser) return rejectWithValue('No user');

        const pg = pgs.pgs.find(p => p.id === pgId);
        const templateToDelete = pg?.menuTemplates?.find(t => t.id === templateId);

        if (!templateToDelete) return rejectWithValue('Template not found');

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const docRef = doc(db, 'users_data', user.currentUser.id, 'pgs', pgId);
            await updateDoc(docRef, {
                menuTemplates: arrayRemove(templateToDelete)
            });
        }
        return { pgId, templateId };
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
            .addCase(addMenuTemplate.fulfilled, (state, action) => {
                const index = state.pgs.findIndex(p => p.id === action.payload.pgId);
                if (index !== -1) {
                    if (!state.pgs[index].menuTemplates) {
                        state.pgs[index].menuTemplates = [];
                    }
                    state.pgs[index].menuTemplates!.push(action.payload.template);
                }
            })
            .addCase(deleteMenuTemplate.fulfilled, (state, action) => {
                const index = state.pgs.findIndex(p => p.id === action.payload.pgId);
                if (index !== -1) {
                    state.pgs[index].menuTemplates = state.pgs[index].menuTemplates?.filter(t => t.id !== action.payload.templateId);
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
