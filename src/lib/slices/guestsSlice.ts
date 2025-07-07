
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Guest } from '../types';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { RootState } from '../store';

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

export const addGuest = createAsyncThunk<{ newGuest: Guest } | null, NewGuestData, { state: RootState }>(
    'guests/addGuest',
    async (guestData, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser) return rejectWithValue('No user');

        const newGuest: Guest = { ...guestData, id: `g-${Date.now()}` };

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const docRef = doc(db, 'users_data', user.currentUser.id, 'guests', newGuest.id);
            await setDoc(docRef, newGuest);
        }
        return { newGuest };
    }
);

export const updateGuest = createAsyncThunk<Guest, Guest, { state: RootState }>(
    'guests/updateGuest',
    async (updatedGuest, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser) return rejectWithValue('No user');

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const docRef = doc(db, 'users_data', user.currentUser.id, 'guests', updatedGuest.id);
            await setDoc(docRef, updatedGuest, { merge: true });
        }
        return updatedGuest;
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
                const index = state.guests.findIndex(g => g.id === action.payload.id);
                if (index !== -1) {
                    state.guests[index] = action.payload;
                }
            })
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.guests = [];
            });
    },
});

export const { setGuests } = guestsSlice.actions;
export default guestsSlice.reducer;
