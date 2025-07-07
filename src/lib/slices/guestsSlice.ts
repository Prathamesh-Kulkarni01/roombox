
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Guest, PG } from '../types';
import { auth, db, isFirebaseConfigured } from '../firebase';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { collection, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { RootState } from '../store';
import { produce } from 'immer';
import { addNotification } from './notificationsSlice';

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

export const addGuest = createAsyncThunk<{ newGuest: Guest; updatedPg: PG }, NewGuestData, { state: RootState }>(
    'guests/addGuest',
    async (guestData, { getState, dispatch, rejectWithValue }) => {
        const { user, pgs } = getState();
        if (!user.currentUser || !guestData.email) return rejectWithValue('No user or guest email');

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

        // Send the passwordless sign-in link
        if (isFirebaseConfigured() && auth) {
            const actionCodeSettings = {
                url: `${window.location.origin}/login/verify`,
                handleCodeInApp: true,
            };
            try {
                await sendSignInLinkToEmail(auth, newGuest.email, actionCodeSettings);
                console.log(`Sign-in link sent to ${newGuest.email}`);
            } catch (error) {
                console.error("Failed to send sign-in link:", error);
                // Even if email fails, we continue to create the guest record
            }
        }

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const batch = writeBatch(db);
            const guestDocRef = doc(db, 'users_data', user.currentUser.id, 'guests', newGuest.id);
            const pgDocRef = doc(db, 'users_data', user.currentUser.id, 'pgs', updatedPg.id);
            const inviteDocRef = doc(db, 'guest_invites', newGuest.email);
            
            batch.set(guestDocRef, newGuest);
            batch.set(pgDocRef, updatedPg);
            batch.set(inviteDocRef, { ownerId: user.currentUser.id, guestId: newGuest.id });

            await batch.commit();
        }

        // Dispatch a notification for the owner
        dispatch(addNotification({
            type: 'new-guest',
            title: 'Guest Added & Invited',
            message: `${newGuest.name} has been added. A sign-in link was sent to their email.`,
            link: `/dashboard/tenant-management/${newGuest.id}`,
            targetId: newGuest.id,
        }));
        
        return { newGuest, updatedPg };
    }
);

export const updateGuest = createAsyncThunk<Guest, Guest, { state: RootState }>(
    'guests/updateGuest',
    async (updatedGuest, { getState, dispatch, rejectWithValue }) => {
        const { user, guests } = getState();
        const originalGuest = guests.guests.find(g => g.id === updatedGuest.id);
        if (!user.currentUser || !originalGuest) return rejectWithValue('No user or original guest');

        const rentStatusChanged = updatedGuest.rentStatus !== originalGuest.rentStatus;
        if (rentStatusChanged && updatedGuest.rentStatus === 'paid') {
            await dispatch(addNotification({
                type: 'rent-paid',
                title: 'Rent Collected',
                message: `You collected rent from ${updatedGuest.name}.`,
                link: `/dashboard/tenant-management/${updatedGuest.id}`,
                targetId: updatedGuest.id,
            }));
        }

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const guestDocRef = doc(db, 'users_data', user.currentUser.id, 'guests', updatedGuest.id);
            await setDoc(guestDocRef, updatedGuest, { merge: true });
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
