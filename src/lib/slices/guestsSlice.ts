
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Guest, PG } from '../types';
import { RootState } from '../store';
import { produce } from 'immer';
import { addNotification } from './notificationsSlice';
import { verifyKyc } from '@/ai/flows/verify-kyc-flow';
import { format, addMonths } from 'date-fns';

interface GuestsState {
    guests: Guest[];
}

const initialState: GuestsState = {
    guests: [],
};

type NewGuestData = Omit<Guest, 'id'>;

// Async Thunks
export const fetchGuests = createAsyncThunk<Guest[], void, { state: RootState }>(
    'guests/fetchGuests',
    async (_, { getState }) => {
        const { user } = getState();
        if (!user.currentUser) return [];
        const res = await fetch(`/api/data/guests?ownerId=${user.currentUser.ownerId || user.currentUser.id}`);
        return await res.json();
    }
);

export const addGuest = createAsyncThunk<{ newGuest: Guest; updatedPg: PG }, NewGuestData, { state: RootState }>(
    'guests/addGuest',
    async (guestData, { getState, dispatch, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser || !guestData.email) return rejectWithValue('No user or guest email');

        const res = await fetch('/api/data/guests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(guestData),
        });

        if (!res.ok) return rejectWithValue('Failed to add guest');
        const { newGuest, updatedPg } = await res.json();
        
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

        const res = await fetch(`/api/data/guests/${updatedGuest.id}?ownerId=${user.ownerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedGuest)
        });

        if (!res.ok) return rejectWithValue('Failed to update KYC');
        const finalGuest = await res.json();
        
        dispatch(addNotification({
            type: 'kyc-submitted',
            title: `KYC Submitted by ${finalGuest.name}`,
            message: `KYC status: ${finalGuest.kycStatus}. Review their documents.`,
            link: `/dashboard/tenant-management/${finalGuest.id}`,
            targetId: finalGuest.id,
        }));

        return finalGuest;
    }
);


export const updateGuest = createAsyncThunk<{ updatedGuest: Guest, updatedPg?: PG }, { updatedGuest: Guest, updatedPg?: PG }, { state: RootState }>(
    'guests/updateGuest',
    async ({ updatedGuest, updatedPg }, { getState, dispatch, rejectWithValue }) => {
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

        const res = await fetch(`/api/data/guests/${updatedGuest.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updatedGuest, updatedPg })
        });
        if (!res.ok) return rejectWithValue('Failed to update guest');
        
        return await res.json();
    }
);

export const initiateGuestExit = createAsyncThunk<Guest, string, { state: RootState }>(
    'guests/initiateGuestExit',
    async (guestId, { getState, rejectWithValue }) => {
        const { user, guests } = getState();
        const guest = guests.guests.find(g => g.id === guestId);

        if (!user.currentUser || !guest) return rejectWithValue('User or guest not found');
        
        const exitDate = new Date();
        exitDate.setDate(exitDate.getDate() + guest.noticePeriodDays);
        const updatedGuest: Guest = { ...guest, exitDate: exitDate.toISOString() };

        const res = await fetch(`/api/data/guests/${guestId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updatedGuest })
        });
        if (!res.ok) return rejectWithValue('Failed to initiate exit');

        return (await res.json()).updatedGuest;
    }
);

export const vacateGuest = createAsyncThunk<{ guest: Guest, pg: PG }, string, { state: RootState }>(
    'guests/vacateGuest',
    async (guestId, { rejectWithValue }) => {
        const res = await fetch(`/api/data/guests/${guestId}?action=vacate`, {
            method: 'POST'
        });
        if (!res.ok) return rejectWithValue('Failed to vacate guest');
        
        return await res.json();
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
            .addCase(initiateGuestExit.fulfilled, (state, action) => {
                 const index = state.guests.findIndex(g => g.id === action.payload.id);
                if (index !== -1) {
                    state.guests[index] = action.payload;
                }
            })
            .addCase(vacateGuest.fulfilled, (state, action) => {
                state.guests = state.guests.filter(g => g.id !== action.payload.guest.id);
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
