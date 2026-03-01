
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { PG, Floor, Room, Bed, MenuTemplate } from '../types';
import { db, isFirebaseConfigured, getOwnerClientDb, selectOwnerDataDb } from '../firebase';
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

// Helper: update owner summary counters in App DB
async function updateOwnerPgSummary(selectedDb: any, ownerId: string) {
    if (!isFirebaseConfigured() || !db) return;
    const pgsSnap = await getDocs(collection(selectedDb, 'users_data', ownerId, 'pgs'));
    let totalProperties = 0;
    let totalRooms = 0;
    let totalBeds = 0;
    pgsSnap.forEach(docSnap => {
        totalProperties += 1;
        const pg = docSnap.data() as PG;
        totalBeds += (pg.totalBeds || 0);
        const roomsInPg = (pg.floors || []).reduce((sum, f) => sum + (f.rooms?.length || 0), 0);
        totalRooms += roomsInPg;
    });
    await setDoc(doc(db, 'users', ownerId), {
        pgSummary: { totalProperties, totalRooms, totalBeds }
    }, { merge: true });
}

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
            totalRooms: 0,
            rules: [], 
            contact: '', 
            priceRange: { min: 0, max: 0 }, 
            amenities: ['wifi', 'food'], 
            floors: [], 
            menu: defaultMenu,
            status: 'pending_approval' // Set default status
        };

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
           const selectedDb = selectOwnerDataDb(user.currentUser);

            const docRef = doc(selectedDb, 'users_data', user.currentUser.id, 'pgs', newPg.id);
            await setDoc(docRef, newPg);
            await updateOwnerPgSummary(selectedDb, user.currentUser.id);
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
           const selectedDb = selectOwnerDataDb(user.currentUser);

            const docRef = doc(selectedDb, 'users_data', user.currentUser.id, 'pgs', sanitizedPg.id);
            await setDoc(docRef, sanitizedPg, { merge: true });
            await updateOwnerPgSummary(selectedDb, user.currentUser.id);
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
           const selectedDb = selectOwnerDataDb(user.currentUser);

            const docRef = doc(selectedDb, 'users_data', user.currentUser.id, 'pgs', pgId);
            await updateDoc(docRef, {
                menuTemplates: arrayUnion(template)
            });
            await updateOwnerPgSummary(selectedDb, user.currentUser.id);
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
           const selectedDb = selectOwnerDataDb(user.currentUser);

            const docRef = doc(selectedDb, 'users_data', user.currentUser.id, 'pgs', pgId);
            await updateDoc(docRef, {
                menuTemplates: arrayRemove(templateToDelete)
            });
            await updateOwnerPgSummary(selectedDb, user.currentUser.id);
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

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
           const selectedDb = selectOwnerDataDb(user.currentUser);

            const batch = writeBatch(selectedDb);
            
            const pgDocRef = doc(selectedDb, 'users_data', ownerId, 'pgs', pgId);
            batch.delete(pgDocRef);

            const subCollections = ['guests', 'staff', 'complaints', 'expenses'];
            for (const subCollection of subCollections) {
                const q = query(collection(selectedDb, 'users_data', ownerId, subCollection), where('pgId', '==', pgId));
                const snapshot = await getDocs(q);
                snapshot.docs.forEach(docSnap => {
                    batch.delete(docSnap.ref);
                });
            }
            await batch.commit();
            await updateOwnerPgSummary(selectedDb, ownerId);
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
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(addPg.fulfilled, (state, action) => {
                state.pgs.push(action.payload);
            })
            .addCase(updatePg.fulfilled, (state, action) => {
                const index = state.pgs.findIndex(p => p.id === action.payload.id);
                if (index !== -1) state.pgs[index] = action.payload;
            })
            .addCase(deletePg.fulfilled, (state, action) => {
                state.pgs = state.pgs.filter(p => p.id !== action.payload);
            })
            .addCase(addMenuTemplate.fulfilled, (state, action) => {
                const { pgId, template } = action.payload;
                const pg = state.pgs.find(p => p.id === pgId);
                if (!pg) return;
                pg.menuTemplates = [...(pg.menuTemplates || []), template];
            })
            .addCase(deleteMenuTemplate.fulfilled, (state, action) => {
                const { pgId, templateId } = action.payload;
                const pg = state.pgs.find(p => p.id === pgId);
                if (!pg) return;
                pg.menuTemplates = (pg.menuTemplates || []).filter(t => t.id !== templateId);
            });
    }
});

export const { setPgs } = pgsSlice.actions;
export default pgsSlice.reducer;
