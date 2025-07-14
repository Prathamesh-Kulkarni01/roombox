

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Guest, PG } from '../types';
import { auth, db, isFirebaseConfigured } from '../firebase';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { collection, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { RootState } from '../store';
import { produce } from 'immer';
import { addNotification } from './notificationsSlice';
import { verifyKyc } from '@/ai/flows/verify-kyc-flow';
import { format } from 'date-fns';

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

        const newGuest: Guest = { 
            ...guestData, 
            id: `g-${Date.now()}`,
            kycStatus: 'not-started',
        };

        const updatedPg = produce(pg, draft => {
            draft.occupancy += 1;
            const floor = draft.floors?.find(f => f.rooms.some(r => r.beds.some(b => b.id === newGuest.bedId)));
            const room = floor?.rooms.find(r => r.beds.some(b => b.id === newGuest.bedId));
            const bed = room?.beds.find(b => b.id === newGuest.bedId);
            if (bed) {
                bed.guestId = newGuest.id;
            }
        });

        if (isFirebaseConfigured() && auth) {
            const actionCodeSettings = {
                url: `${window.location.origin}/login/verify`,
                handleCodeInApp: true,
            };
            try {
                await sendSignInLinkToEmail(auth, newGuest.email, actionCodeSettings);
            } catch (error) {
                console.error("Failed to send sign-in link:", error);
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

export const updateGuestKyc = createAsyncThunk<Guest, {
    aadhaarDataUri: string;
    photoDataUri: string;
    optionalDoc1DataUri?: string;
    optionalDoc2DataUri?: string;
}, { state: RootState }>(
    'guests/updateGuestKyc',
    async (kycData, { getState, dispatch, rejectWithValue }) => {
        const { user, guests } = getState();
        const guestToUpdate = guests.guests.find(g => g.id === user.currentUser?.guestId);

        if (!user.currentUser || !guestToUpdate) {
            return rejectWithValue('User or guest not found');
        }

        let kycUpdate: Partial<Guest> = {
            ...kycData,
            kycStatus: 'pending',
        };

        if (user.currentPlan?.hasKycVerification) {
            try {
                const verificationResult = await verifyKyc({ idDocumentUri: kycData.aadhaarDataUri, selfieUri: kycData.photoDataUri });
                kycUpdate.kycStatus = (verificationResult.isIdValid && verificationResult.isFaceMatch) ? 'verified' : 'rejected';
                kycUpdate.kycRejectReason = verificationResult.reason;
            } catch (e) {
                console.error("AI KYC verification failed", e);
                kycUpdate.kycStatus = 'pending';
                kycUpdate.kycRejectReason = 'AI verification failed. Needs manual review.';
            }
        }

        const updatedGuest = { ...guestToUpdate, ...kycUpdate };

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const docRef = doc(db, 'users_data', user.ownerId || user.currentUser.id, 'guests', updatedGuest.id);
            await setDoc(docRef, updatedGuest, { merge: true });
        }
        
        dispatch(addNotification({
            type: 'kyc-submitted',
            title: `KYC Submitted by ${updatedGuest.name}`,
            message: `KYC status: ${updatedGuest.kycStatus}. Review their documents.`,
            link: `/dashboard/tenant-management/${updatedGuest.id}`,
            targetId: updatedGuest.id,
        }));

        return updatedGuest;
    }
);


export const updateGuest = createAsyncThunk<{ updatedGuest: Guest, updatedPg?: PG }, { updatedGuest: Guest, updatedPg?: PG }, { state: RootState }>(
    'guests/updateGuest',
    async ({ updatedGuest, updatedPg }, { getState, dispatch, rejectWithValue }) => {
        const { user, guests, pgs } = getState();
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
            const batch = writeBatch(db);
            const guestDocRef = doc(db, 'users_data', user.currentUser.id, 'guests', updatedGuest.id);
            batch.set(guestDocRef, updatedGuest, { merge: true });

            if (updatedPg) {
                const pgDocRef = doc(db, 'users_data', user.currentUser.id, 'pgs', updatedPg.id);
                batch.set(pgDocRef, updatedPg);
            }
             await batch.commit();
        }
        
        return { updatedGuest, updatedPg };
    }
);

export const vacateGuest = createAsyncThunk<{ guest: Guest, pg: PG }, string, { state: RootState }>(
    'guests/vacateGuest',
    async (guestId, { getState, rejectWithValue }) => {
        const { user, guests, pgs } = getState();
        const guest = guests.guests.find(g => g.id === guestId);
        const pg = pgs.pgs.find(p => p.id === guest?.pgId);

        if (!user.currentUser || !guest || !pg) return rejectWithValue('User, guest, or PG not found');
        
        const updatedGuest = { ...guest, exitDate: format(new Date(), 'yyyy-MM-dd'), rentStatus: 'paid', rentPaidAmount: guest.rentAmount };
        const updatedPg = produce(pg, draft => {
            draft.occupancy = Math.max(0, draft.occupancy - 1);
            const floor = draft.floors?.find(f => f.rooms.some(r => r.beds.some(b => b.guestId === guest.id)));
            const room = floor?.rooms.find(r => r.beds.some(b => b.guestId === guest.id));
            const bed = room?.beds.find(b => b.guestId === guest.id);
            if (bed) {
                bed.guestId = null;
            }
        });

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const batch = writeBatch(db);
            const guestDocRef = doc(db, 'users_data', user.currentUser.id, 'guests', guest.id);
            const pgDocRef = doc(db, 'users_data', user.currentUser.id, 'pgs', pg.id);
            
            batch.set(guestDocRef, updatedGuest, { merge: true });
            batch.set(pgDocRef, updatedPg);
            
            await batch.commit();
        }

        return { guest: updatedGuest, pg: updatedPg };
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
            .addCase(updateGuestKyc.fulfilled, (state, action) => {
                const index = state.guests.findIndex(g => g.id === action.payload.id);
                if (index !== -1) {
                    state.guests[index] = action.payload;
                }
            })
            .addCase(vacateGuest.fulfilled, (state, action) => {
                 const index = state.guests.findIndex(g => g.id === action.payload.guest.id);
                if (index !== -1) {
                    state.guests[index] = action.payload.guest;
                }
            })
            .addCase('pgs/deletePg/fulfilled', (state, action) => {
                state.guests = state.guests.filter(g => g.pgId !== action.payload);
            })
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.guests = [];
            });
    },
});

export const { setGuests } = guestsSlice.actions;
export default guestsSlice.reducer;
