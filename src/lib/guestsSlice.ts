
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Guest, PG } from '../types';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { RootState } from '../store';
import { produce } from 'immer';

interface GuestsState {
    guests: Guest[];
}

const initialState: GuestsState = {
    guests: [],
};

type NewGuestData = Omit<Guest, 'id'>;

// Async Thunks
export const fetchGuests = createAsyncThunk(
    'guests/fetchGuests',
    async ({ userId, useCloud }: { userId: string, useCloud: boolean }) => {
        if (useCloud) {
            const guestsCollection = collection(db, 'users_data', userId, 'guests');
            const guestsSnap = await getDocs(guestsCollection);
            return guestsSnap.docs.map(d => d.data() as Guest);
        } else {
            if(typeof window === 'undefined') return [];
            const localGuests = localStorage.getItem('guests');
            return localGuests ? JSON.parse(localGuests) : [];
        }
    }
);

export const addGuest = createAsyncThunk<{ newGuest: Guest; updatedPg: PG } | null, NewGuestData, { state: RootState }>(
    'guests/addGuest',
    async (guestData, { getState, rejectWithValue }) => {
        const { user, pgs } = getState();
        if (!user.currentUser) return rejectWithValue('No user');

        const pg = pgs.pgs.find(p => p.id === guestData.pgId);
        if (!pg) return rejectWithValue('PG not found');

        const newGuest: Guest = { ...guestData, id: `g-${Date.now()}` };

        const updatedPg = produce(pg, draft => {
            draft.occupancy += 1;
            const floor = draft.floors?.find(f => f.rooms.some(r => r.beds.some(b => b.id === newGuest.bedId)));
            const room = floor?.rooms.find(r => r.beds.some(b => b.id === newGuest.bedId));
            const bed = room?.beds.find(b => b.id === newGuest.bedId);
            if (bed) {
                bed.guestId = newGuest.id;
            }
        });

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const batch = writeBatch(db);
            const guestDocRef = doc(db, 'users_data', user.currentUser.id, 'guests', newGuest.id);
            const pgDocRef = doc(db, 'users_data', user.currentUser.id, 'pgs', updatedPg.id);
            
            batch.set(guestDocRef, newGuest);
            batch.set(pgDocRef, updatedPg);
            
            await batch.commit();
        }
        return { newGuest, updatedPg };
    }
);

export const updateGuest = createAsyncThunk<{ updatedGuest: Guest, updatedPg?: PG }, Guest, { state: RootState }>(
    'guests/updateGuest',
    async (updatedGuest, { getState, rejectWithValue }) => {
        const { user, pgs } = getState();
        const originalGuest = getState().guests.guests.find(g => g.id === updatedGuest.id);
        if (!user.currentUser || !originalGuest) return rejectWithValue('No user or original guest');

        let updatedPg: PG | undefined = undefined;
        
        // Handle vacating a bed
        const isVacating = !!updatedGuest.exitDate && !originalGuest.exitDate;
        if(isVacating) {
            const pg = pgs.pgs.find(p => p.id === updatedGuest.pgId);
            if(pg) {
                updatedPg = produce(pg, draft => {
                    draft.occupancy = Math.max(0, draft.occupancy - 1);
                    const floor = draft.floors?.find(f => f.rooms.some(r => r.beds.some(b => b.guestId === updatedGuest.id)));
                    const room = floor?.rooms.find(r => r.beds.some(b => b.guestId === updatedGuest.id));
                    const bed = room?.beds.find(b => b.guestId === updatedGuest.id);
                    if (bed) {
                        bed.guestId = null;
                    }
                });
            }
        }


        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const batch = writeBatch(db);
            const guestDocRef = doc(db, 'users_data', user.currentUser.id, 'guests', updatedGuest.id);
            batch.set(guestDocRef, updatedGuest, { merge: true });

            if (updatedPg) {
                const pgDocRef = doc(db, 'users_data', user.currentUser.id, 'pgs', updatedPg.id);
                batch.set(pgDocRef, updatedPg);
            } else {
                 await batch.commit();
            }
        }
        return { updatedGuest, updatedPg };
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
            .addCase(fetchGuests.fulfilled, (state, action) => {
                state.guests = action.payload;
            })
            .addCase(addGuest.fulfilled, (state, action) => {
                if(action.payload) state.guests.push(action.payload.newGuest);
            })
            .addCase(updateGuest.fulfilled, (state, action) => {
                const index = state.guests.findIndex(g => g.id === action.payload.updatedGuest.id);
                if (index !== -1) {
                    state.guests[index] = action.payload.updatedGuest;
                }
            })
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.guests = [];
            });
    },
});

export const { setGuests } = guestsSlice.actions;
export default guestsSlice.reducer;
