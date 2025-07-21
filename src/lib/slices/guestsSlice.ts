

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Guest, Invite, PG, User, AdditionalCharge } from '../types';
import { auth, db, isFirebaseConfigured } from '../firebase';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, setDoc, writeBatch, query, where, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
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
export const fetchGuests = createAsyncThunk(
    'guests/fetchGuests',
    async (userId: string) => {
        const guestsCollection = collection(db, 'users_data', userId, 'guests');
        const guestsSnap = await getDocs(guestsCollection);
        return guestsSnap.docs.map(d => d.data() as Guest).filter(g => !g.isVacated);
    }
);

export const addGuest = createAsyncThunk<{ newGuest: Guest; updatedPg: PG }, NewGuestData, { state: RootState }>(
    'guests/addGuest',
    async (guestData, { getState, dispatch, rejectWithValue }) => {
        const { user, pgs } = getState();
        if (!user.currentUser || !guestData.email) return rejectWithValue('No user or guest email');
        
        // Check if a user with this email already exists and is an owner
        const userQuery = query(collection(db, "users"), where("email", "==", guestData.email));
        const userSnapshot = await getDocs(userQuery);
        if (!userSnapshot.empty) {
            const existingUser = userSnapshot.docs[0].data() as User;
            if (existingUser.role === 'owner') {
                return rejectWithValue('This email belongs to an owner. Please use a different email to invite a guest.');
            }
        }

        const pg = pgs.pgs.find(p => p.id === guestData.pgId);
        if (!pg) return rejectWithValue('PG not found');

        const newGuest: Guest = { 
            ...guestData, 
            id: `g-${Date.now()}`,
            kycStatus: 'not-started',
            isVacated: false,
            additionalCharges: [],
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
        
        const invite: Invite = {
            email: newGuest.email,
            ownerId: user.currentUser.id,
            role: 'tenant',
            details: newGuest
        };

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
            const inviteDocRef = doc(db, 'invites', newGuest.email);
            
            batch.set(guestDocRef, newGuest);
            batch.set(pgDocRef, updatedPg);
            batch.set(inviteDocRef, invite);

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
        const ownerId = user.currentUser?.role === 'owner' ? user.currentUser.id : user.currentUser?.ownerId;
        
        if (!user.currentUser || !guestToUpdate || !ownerId) {
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
            const docRef = doc(db, 'users_data', ownerId, 'guests', updatedGuest.id);
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
        if (!user.currentUser) return rejectWithValue('No user');
        const ownerId = user.currentUser.role === 'owner' ? user.currentUser.id : user.currentUser.ownerId;
        if (!ownerId) return rejectWithValue('Owner ID not found');

        const originalGuest = guests.guests.find(g => g.id === updatedGuest.id);

        if (originalGuest) {
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
        }
        
        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const batch = writeBatch(db);
            const guestDocRef = doc(db, 'users_data', ownerId, 'guests', updatedGuest.id);
            batch.set(guestDocRef, updatedGuest, { merge: true });

            if (updatedPg) {
                const pgDocRef = doc(db, 'users_data', ownerId, 'pgs', updatedPg.id);
                batch.set(pgDocRef, updatedPg);
            }
             await batch.commit();
        }
        
        return { updatedGuest, updatedPg };
    }
);

export const addAdditionalCharge = createAsyncThunk<Guest, { guestId: string, charge: Omit<AdditionalCharge, 'id'> }, { state: RootState }>(
    'guests/addAdditionalCharge',
    async ({ guestId, charge }, { getState, rejectWithValue }) => {
        const { user, guests } = getState();
        const ownerId = user.currentUser?.id;
        const guest = guests.guests.find(g => g.id === guestId);

        if (!ownerId || !guest) return rejectWithValue('User or guest not found');
        
        const newCharge: AdditionalCharge = { ...charge, id: `charge-${Date.now()}` };
        
        if (isFirebaseConfigured()) {
            const guestDocRef = doc(db, 'users_data', ownerId, 'guests', guestId);
            await updateDoc(guestDocRef, {
                additionalCharges: arrayUnion(newCharge)
            });
        }
        
        const updatedGuest = {
            ...guest,
            additionalCharges: [...(guest.additionalCharges || []), newCharge],
        };

        return updatedGuest;
    }
);

export const removeAdditionalCharge = createAsyncThunk<Guest, { guestId: string, chargeId: string }, { state: RootState }>(
    'guests/removeAdditionalCharge',
    async ({ guestId, chargeId }, { getState, rejectWithValue }) => {
        const { user, guests } = getState();
        const ownerId = user.currentUser?.id;
        const guest = guests.guests.find(g => g.id === guestId);

        if (!ownerId || !guest) return rejectWithValue('User or guest not found');
        
        const chargeToRemove = (guest.additionalCharges || []).find(c => c.id === chargeId);
        if (!chargeToRemove) return rejectWithValue('Charge not found');
        
        if (isFirebaseConfigured()) {
            const guestDocRef = doc(db, 'users_data', ownerId, 'guests', guestId);
            await updateDoc(guestDocRef, {
                additionalCharges: arrayRemove(chargeToRemove)
            });
        }
        
        const updatedGuest = {
            ...guest,
            additionalCharges: (guest.additionalCharges || []).filter(c => c.id !== chargeId),
        };

        return updatedGuest;
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

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const guestDocRef = doc(db, 'users_data', user.currentUser.id, 'guests', guestId);
            await setDoc(guestDocRef, updatedGuest, { merge: true });
        }

        return updatedGuest;
    }
);

export const vacateGuest = createAsyncThunk<{ guest: Guest, pg: PG }, string, { state: RootState }>(
    'guests/vacateGuest',
    async (guestId, { getState, rejectWithValue }) => {
        const { user, guests, pgs } = getState();
        const guest = guests.guests.find(g => g.id === guestId);
        if (!user.currentUser || !guest) return rejectWithValue('User or guest not found');

        const pg = pgs.pgs.find(p => p.id === guest.pgId);
        if (!pg) return rejectWithValue('PG not found for guest');

        const updatedPg = produce(pg, draft => {
            draft.occupancy = Math.max(0, draft.occupancy - 1);
            for (const floor of draft.floors || []) {
                for (const room of floor.rooms) {
                    const bed = room.beds.find(b => b.guestId === guestId);
                    if (bed) {
                        bed.guestId = null;
                        break;
                    }
                }
            }
        });
        
        const updatedGuest = { ...guest, exitDate: new Date().toISOString(), isVacated: true };

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const batch = writeBatch(db);
            const guestDocRef = doc(db, 'users_data', user.currentUser.id, 'guests', guestId);
            const pgDocRef = doc(db, 'users_data', user.currentUser.id, 'pgs', updatedPg.id);
            batch.set(guestDocRef, updatedGuest, { merge: true }); // Keep history by merging
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
            .addCase(addAdditionalCharge.fulfilled, (state, action) => {
                const index = state.guests.findIndex(g => g.id === action.payload.id);
                if (index !== -1) {
                    state.guests[index] = action.payload;
                }
            })
             .addCase(removeAdditionalCharge.fulfilled, (state, action) => {
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
