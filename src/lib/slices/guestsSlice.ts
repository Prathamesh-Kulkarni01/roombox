'use client'

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Guest, Invite, PG, User, LedgerEntry, Room, KycDocumentConfig, SubmittedKycDocument, Staff } from '../types';
import { auth, db, isFirebaseConfigured, getOwnerClientDb, selectOwnerDataDb } from '../firebase';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, setDoc, writeBatch, query, where, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { RootState } from '../store';
import { produce } from 'immer';
import { addNotification } from './notificationsSlice';
import { verifyKyc } from '@/ai/flows/verify-kyc-flow';
import { format, addMonths, isAfter, parseISO, differenceInMonths, isSameDay, setDate, lastDayOfMonth } from 'date-fns';
import { uploadDataUriToStorage } from '../storage';
import { deletePg } from './pgsSlice';
import { calculateFirstDueDate } from '@/lib/utils';
import { runReconciliationLogic } from '../reconciliation';
import { createAndSendNotification } from '../actions/notificationActions';

interface GuestsState {
    guests: Guest[];
}

const initialState: GuestsState = {
    guests: [],
};

type NewGuestData = Omit<Guest, 'id'>;

// Async Thunks
export const addGuest = createAsyncThunk<{ newGuest: Guest; updatedPg: PG, existingUser?: User }, NewGuestData, { state: RootState }>(
    'guests/addGuest',
    async (guestData, { getState, dispatch, rejectWithValue }) => {
        const { user, pgs } = getState();
        if (!user.currentUser || !guestData.email) return rejectWithValue('No user or guest email');
       
        const selectedDb = selectOwnerDataDb(user.currentUser);
        const batch = writeBatch(selectedDb);
        let existingUser: User | null = null;

        // Check if a user with this email already exists
        const userQuery = query(collection(db!, "users"), where("email", "==", guestData.email));
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
            existingUser = userSnapshot.docs[0].data() as User;
            if (existingUser.role === 'owner') {
                return rejectWithValue('This email is associated with an owner account. Please use a different email.');
            }
             // Check if the user is already an active guest somewhere
            if (existingUser.guestId && existingUser.ownerId) {
                const oldGuestRef = doc(selectedDb, 'users_data', existingUser.ownerId, 'guests', existingUser.guestId);
                const oldGuestDoc = await getDoc(oldGuestRef);
                if (oldGuestDoc.exists() && !oldGuestDoc.data().isVacated) {
                    return rejectWithValue(`This guest is already active in "${oldGuestDoc.data().pgName}". Please vacate their previous stay before adding them to a new one.`);
                }
            }
        }
        
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
        
        if (existingUser) {
            // Update existing user to point to new active guest record
            newGuest.userId = existingUser.id;
            const userDocRef = doc(selectedDb, 'users', existingUser.id);
            batch.update(userDocRef, {
                guestId: newGuest.id,
                pgId: newGuest.pgId,
                ownerId: user.currentUser.id,
                guestHistoryIds: arrayUnion(existingUser.guestId)
            });
        } else {
             // Create an invite for a completely new user
            const invite: Invite = { email: newGuest.email, ownerId: user.currentUser.id, role: 'tenant', details: newGuest };
            const inviteDocRef = doc(db!, 'invites', newGuest.email);
            batch.set(inviteDocRef, invite);

            if (isFirebaseConfigured() && auth) {
                const actionCodeSettings = { url: `${window.location.origin}/login/verify`, handleCodeInApp: true };
                try {
                    await sendSignInLinkToEmail(auth, newGuest.email, actionCodeSettings);
                } catch (error) { console.error("Failed to send sign-in link:", error); }
            }
        }

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const guestDocRef = doc(selectedDb, 'users_data', user.currentUser.id, 'guests', newGuest.id);
            const pgDocRef = doc(selectedDb, 'users_data', user.currentUser.id, 'pgs', updatedPg.id);
            batch.set(guestDocRef, newGuest);
            batch.set(pgDocRef, updatedPg);
            await batch.commit();
        }

        // Send notification to owner
        dispatch(createAndSendNotification({
            ownerId: user.currentUser.id,
            notification: {
                type: 'new-guest',
                title: 'New Guest Onboarded',
                message: `${newGuest.name} has been added to ${newGuest.pgName}. Welcome!`,
                link: `/dashboard/tenant-management/${newGuest.id}`,
                targetId: user.currentUser.id,
            }
        }));
        
        return { newGuest, updatedPg, existingUser: existingUser || undefined };
    }
);

export const updateGuestKyc = createAsyncThunk<Guest, {
    documents: { config: KycDocumentConfig; dataUri: string }[]
}, { state: RootState }>(
    'guests/updateGuestKyc',
    async (kycData, { getState, dispatch, rejectWithValue }) => {
        const { user, guests } = getState();
        const guestToUpdate = guests.guests.find(g => g.id === user.currentUser?.guestId);
        const ownerId = user.currentUser?.ownerId;

        if (!user.currentUser || !guestToUpdate || !ownerId) {
            return rejectWithValue('User, guest, or owner not found');
        }

        const selectedDb = selectOwnerDataDb(user.currentUser);

        const uploadedDocuments: SubmittedKycDocument[] = [];
        for (const docData of kycData.documents) {
            const url = await uploadDataUriToStorage(docData.dataUri, `kyc/${ownerId}/${guestToUpdate.id}`);
            uploadedDocuments.push({
                configId: docData.config.id,
                label: docData.config.label,
                url: url,
                status: 'pending'
            });
        }
        
        let kycUpdate: Partial<Guest> = { kycStatus: 'pending', documents: uploadedDocuments };
        
        const updatedGuest = { ...guestToUpdate, ...kycUpdate };
        
        if (isFirebaseConfigured()) {
            const guestDocRef = doc(selectedDb, 'users_data', ownerId, 'guests', guestToUpdate.id);
            await setDoc(guestDocRef, { kycStatus: 'pending', documents: uploadedDocuments }, { merge: true });
        }
        
        // Notify owner
        dispatch(createAndSendNotification({
            ownerId: ownerId,
            notification: {
                type: 'kyc-submitted',
                title: `KYC Submitted by ${updatedGuest.name}`,
                message: `New documents are ready for your review.`,
                link: `/dashboard/tenant-management/${updatedGuest.id}`,
                targetId: ownerId,
            }
        }));

        return updatedGuest;
    }
);

export const updateGuestKycFromOwner = createAsyncThunk<Guest, {
    guestId: string;
    documents: { config: KycDocumentConfig; dataUri: string }[];
}, { state: RootState }>(
    'guests/updateGuestKycFromOwner',
    async ({ guestId, documents }, { getState, dispatch, rejectWithValue }) => {
        const { user, guests } = getState();
        const guestToUpdate = guests.guests.find(g => g.id === guestId);
        const ownerId = user.currentUser?.id;

        if (!user.currentUser || !guestToUpdate || !ownerId) {
            return rejectWithValue('User or guest not found');
        }

        const selectedDb = selectOwnerDataDb(user.currentUser);
        const uploadedDocuments: SubmittedKycDocument[] = [];
        for (const docData of documents) {
            const url = await uploadDataUriToStorage(docData.dataUri, `kyc/${ownerId}/${guestToUpdate.id}`);
            uploadedDocuments.push({
                configId: docData.config.id,
                label: docData.config.label,
                url: url,
                status: 'pending'
            });
        }
        
        let kycUpdate: Partial<Guest> = { kycStatus: 'pending', documents: uploadedDocuments };
        
        const updatedGuest = { ...guestToUpdate, ...kycUpdate };

        if (isFirebaseConfigured()) {
            const guestDocRef = doc(selectedDb, 'users_data', ownerId, 'guests', updatedGuest.id);
            await setDoc(guestDocRef, { 
                kycStatus: 'pending', 
                documents: uploadedDocuments
            }, { merge: true });
        }
        
        if(updatedGuest.userId) {
            dispatch(createAndSendNotification({
                ownerId: ownerId,
                notification: {
                    type: 'kyc-submitted',
                    title: `KYC Status Updated`,
                    message: `Your property manager has submitted documents for you. They are now under review.`,
                    link: `/tenants/kyc`,
                    targetId: updatedGuest.userId,
                }
            }));
        }

        return updatedGuest;
    }
);

export const updateGuestKycStatus = createAsyncThunk<Guest, {
    guestId: string;
    status: 'verified' | 'rejected';
    reason?: string;
}, { state: RootState }>(
    'guests/updateGuestKycStatus',
    async ({ guestId, status, reason }, { getState, dispatch, rejectWithValue }) => {
        const { user, guests } = getState();
        const guestToUpdate = guests.guests.find(g => g.id === guestId);
        const ownerId = user.currentUser?.id;

        if (!user.currentUser || !guestToUpdate || !ownerId) {
            return rejectWithValue('User or guest not found');
        }

        const selectedDb = selectOwnerDataDb(user.currentUser);

        const updatedGuest = { ...guestToUpdate, kycStatus: status, kycRejectReason: reason || null };

        if (isFirebaseConfigured()) {
            const docRef = doc(selectedDb, 'users_data', ownerId, 'guests', guestId);
            await setDoc(docRef, { kycStatus: status, kycRejectReason: reason || null }, { merge: true });
        }

        if (updatedGuest.userId) {
            dispatch(createAndSendNotification({
                ownerId: ownerId,
                notification: {
                    type: 'kyc-update',
                    title: 'KYC Status Updated',
                    message: `Your KYC has been ${status}. ${reason ? `Reason: ${reason}` : ''}`,
                    link: '/tenants/kyc',
                    targetId: updatedGuest.userId,
                }
            }));
        }
        return updatedGuest;
    }
);

export const resetGuestKyc = createAsyncThunk<string, string, { state: RootState }>(
    'guests/resetGuestKyc',
    async (guestId, { getState, rejectWithValue }) => {
        const { user, guests } = getState();
        const guestToUpdate = guests.guests.find(g => g.id === guestId);
        const ownerId = user.currentUser?.id;

        if (!user.currentUser || !guestToUpdate || !ownerId) {
            return rejectWithValue('User or guest not found');
        }
        
        // Don't need to do anything with Cloudinary files for now, they can be orphaned.

        if (isFirebaseConfigured()) {
           const selectedDb = selectOwnerDataDb(user.currentUser);

            const docRef = doc(selectedDb, 'users_data', ownerId, 'guests', guestId);
            await updateDoc(docRef, {
                kycStatus: 'not-started',
                kycRejectReason: null,
                documents: [],
            });
        }
        return guestId;
    }
);


export const updateGuest = createAsyncThunk<{ updatedGuest: Guest, updatedPg?: PG }, { updatedGuest: Guest, updatedPg?: PG }, { state: RootState }>(
    'guests/updateGuest',
    async ({ updatedGuest, updatedPg }, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser) return rejectWithValue('No user');
        const ownerId = user.currentUser.role === 'owner' ? user.currentUser.id : user.currentUser.ownerId;
        if (!ownerId) return rejectWithValue('Owner ID not found');
        
        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
           const selectedDb = selectOwnerDataDb(user.currentUser);

            const batch = writeBatch(selectedDb);
            const guestDocRef = doc(selectedDb, 'users_data', ownerId, 'guests', updatedGuest.id);
            batch.set(guestDocRef, updatedGuest, { merge: true });

            if (updatedPg) {
                const pgDocRef = doc(selectedDb, 'users_data', ownerId, 'pgs', updatedPg.id);
                batch.set(pgDocRef, updatedPg);
            }
             await batch.commit();
        }
        
        return { updatedGuest, updatedPg };
    }
);

export const reconcileGuestPayment = createAsyncThunk<Guest, {
    guest: Guest;
    paymentAmount: number;
    paymentMethod: 'cash' | 'upi' | 'in-app';
}, { state: RootState }>(
    'guests/reconcileGuestPayment',
    async ({ guest, paymentAmount, paymentMethod }, { getState, dispatch, rejectWithValue }) => {
        const { user } = getState();
        const ownerId = user.currentUser?.id;
        if (!ownerId) return rejectWithValue('Not authenticated as owner');

        const newPayment: Payment = {
            id: `pay-${Date.now()}`,
            date: new Date().toISOString(),
            amount: paymentAmount,
            method: paymentMethod,
            forMonth: format(new Date(guest.dueDate), 'MMMM yyyy'),
        };

        const ledgerEntry: LedgerEntry = {
            id: `credit-${newPayment.id}`,
            date: newPayment.date,
            type: 'credit',
            description: `Rent payment via ${paymentMethod}`,
            amount: paymentAmount
        };

        const guestWithPayment = produce(guest, draft => {
            if (!draft.ledger) draft.ledger = [];
            if (!draft.paymentHistory) draft.paymentHistory = [];
            draft.ledger.push(ledgerEntry);
            draft.paymentHistory.push(newPayment);

            // Immediately recalculate balance and set status based on this payment
            const totalDebits = draft.ledger.filter(e => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0);
            const totalCredits = draft.ledger.filter(e => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0);
            const newBalance = totalDebits - totalCredits;

            if (newBalance <= 0) {
                draft.rentStatus = 'paid';
            } else {
                draft.rentStatus = 'partial';
            }
        });
        
        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const selectedDb = selectOwnerDataDb(user.currentUser);
            const guestDocRef = doc(selectedDb, 'users_data', ownerId, 'guests', guestWithPayment.id);
            await setDoc(guestDocRef, guestWithPayment);
        }

        // Notify owner and tenant
        dispatch(createAndSendNotification({ ownerId, notification: { type: 'rent-paid', title: 'Rent Collected!', message: `Received ₹${paymentAmount} from ${guest.name}.`, link: `/dashboard/tenant-management/${guest.id}`, targetId: ownerId } }));
        if (guest.userId) {
            dispatch(createAndSendNotification({ ownerId, notification: { type: 'rent-receipt', title: 'Payment Confirmation', message: `Your payment of ₹${paymentAmount} has been successfully recorded.`, link: '/tenants/my-pg', targetId: guest.userId } }));
        }


        // Run reconciliation separately to advance the cycle if needed
        dispatch(reconcileRentCycle(guest.id));

        return guestWithPayment;
    }
);


export const addAdditionalCharge = createAsyncThunk<Guest, { guestId: string, charge: Omit<LedgerEntry, 'id' | 'date' | 'type'> }, { state: RootState }>(
    'guests/addAdditionalCharge',
    async ({ guestId, charge }, { getState, rejectWithValue }) => {
        const { user, guests } = getState();
        const ownerId = user.currentUser?.id;
        const guest = guests.guests.find(g => g.id === guestId);

        if (!ownerId || !guest) return rejectWithValue('User or guest not found');
        
        const newCharge: LedgerEntry = { ...charge, id: `charge-${Date.now()}`, date: new Date().toISOString(), type: 'debit' };
        
        if (isFirebaseConfigured()) {
           const selectedDb = selectOwnerDataDb(user.currentUser);
            const guestDocRef = doc(selectedDb, 'users_data', ownerId, 'guests', guestId);
            await updateDoc(guestDocRef, {
                ledger: arrayUnion(newCharge)
            });
        }
        
        return produce(guest, draft => {
             if (!draft.ledger) draft.ledger = [];
             draft.ledger.push(newCharge);
        });
    }
);

export const removeAdditionalCharge = createAsyncThunk<Guest, { guestId: string, chargeId: string }, { state: RootState }>(
    'guests/removeAdditionalCharge',
    async ({ guestId, chargeId }, { getState, rejectWithValue }) => {
        const { user, guests } = getState();
        const ownerId = user.currentUser?.id;
        const guest = guests.guests.find(g => g.id === guestId);

        if (!ownerId || !guest) return rejectWithValue('User or guest not found');
        
        const chargeToRemove = (guest.ledger || []).find(c => c.id === chargeId);
        if (!chargeToRemove) return rejectWithValue('Charge not found');
        
        if (isFirebaseConfigured()) {
           const selectedDb = selectOwnerDataDb(user.currentUser);
            const guestDocRef = doc(selectedDb, 'users_data', ownerId, 'guests', guestId);
            await updateDoc(guestDocRef, {
                ledger: arrayRemove(chargeToRemove)
            });
        }
        
        return produce(guest, draft => {
            draft.ledger = (draft.ledger || []).filter(c => c.id !== chargeId);
        });
    }
);

export const addSharedChargeToRoom = createAsyncThunk<Guest[], { roomId: string, description: string, totalAmount: number }, { state: RootState }>(
    'guests/addSharedChargeToRoom',
    async ({ roomId, description, totalAmount }, { getState, rejectWithValue }) => {
        const { user, guests, pgs } = getState();
        const ownerId = user.currentUser?.id;
        if (!ownerId) return rejectWithValue('User not found');

        const selectedDb = selectOwnerDataDb(user.currentUser);

        const pg = pgs.pgs.find(p => p.floors?.some(f => f.rooms.some(r => r.id === roomId)));
        if (!pg) return rejectWithValue('PG not found');

        const room = pg.floors?.flatMap(f => f.rooms).find(r => r.id === roomId);
        if (!room) return rejectWithValue('Room not found');

        const guestsInRoom = guests.guests.filter(g => room.beds.some(b => b.id === g.bedId));
        if (guestsInRoom.length === 0) return rejectWithValue('No guests in this room to apply charges to.');

        const chargePerGuest = totalAmount / guestsInRoom.length;
        const updatedGuests: Guest[] = [];

        const batch = isFirebaseConfigured() ? writeBatch(selectedDb) : null;
        
        for (const guest of guestsInRoom) {
            const newCharge: LedgerEntry = {
                id: `charge-${Date.now()}-${guest.id}`,
                date: new Date().toISOString(),
                type: 'debit',
                description: description,
                amount: chargePerGuest,
            };
            
            const updatedGuest = produce(guest, draft => {
                if (!draft.ledger) {
                    draft.ledger = [];
                }
                draft.ledger.push(newCharge);
            });
            updatedGuests.push(updatedGuest);

            if (batch) {
                const guestDocRef = doc(selectedDb, 'users_data', ownerId, 'guests', guest.id);
                batch.update(guestDocRef, {
                    ledger: arrayUnion(newCharge)
                });
            }
        }
        
        if (batch) {
            await batch.commit();
        }
        
        return updatedGuests;
    }
);


export const initiateGuestExit = createAsyncThunk<Guest, string, { state: RootState }>(
    'guests/initiateGuestExit',
    async (guestId, { getState, dispatch, rejectWithValue }) => {
        const { user, guests } = getState();
        const guest = guests.guests.find(g => g.id === guestId);
        const ownerId = user.currentUser?.id;

        if (!user.currentUser || !guest || !ownerId) return rejectWithValue('User or guest not found');
        
        const exitDate = new Date();
        exitDate.setDate(exitDate.getDate() + guest.noticePeriodDays);
        const updatedGuest: Guest = { ...guest, exitDate: exitDate.toISOString() };

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
           const selectedDb = selectOwnerDataDb(user.currentUser);

            const guestDocRef = doc(selectedDb, 'users_data', ownerId, 'guests', guestId);
            await setDoc(guestDocRef, updatedGuest, { merge: true });
        }
        
        if (guest.userId) {
            dispatch(createAndSendNotification({ ownerId, notification: { type: 'guest-exit', title: 'Notice Period Started', message: `Your notice period has been initiated and will end on ${format(exitDate, 'do MMM, yyyy')}.`, link: '/tenants/my-pg', targetId: guest.userId }}));
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
           const selectedDb = selectOwnerDataDb(user.currentUser);

            const batch = writeBatch(selectedDb);
            const guestDocRef = doc(selectedDb, 'users_data', user.currentUser.id, 'guests', guestId);
            const pgDocRef = doc(selectedDb, 'users_data', user.currentUser.id, 'pgs', updatedPg.id);
            batch.set(guestDocRef, updatedGuest, { merge: true }); // Keep history by merging
            batch.set(pgDocRef, updatedPg);

            // Also update the user record to clear the active guestId
            if (guest.userId) {
                const userDocRef = doc(db!, 'users', guest.userId);
                batch.update(userDocRef, {
                    guestId: null,
                    pgId: null,
                    guestHistoryIds: arrayUnion(guest.id)
                });
            }
            await batch.commit();
        }

        return { guest: updatedGuest, pg: updatedPg };
    }
);

export const reconcileRentCycle = createAsyncThunk<Guest, string, { state: RootState }>(
    'guests/reconcileRentCycle',
    async (guestId, { getState, rejectWithValue }) => {
        const { user, guests, app } = getState();
        const guest = guests.guests.find(g => g.id === guestId);

        if (!user.currentUser || !guest || !guest.dueDate) {
            return rejectWithValue('Guest or due date not found');
        }

        const now = app.mockDate ? parseISO(app.mockDate) : new Date();
        const { guest: reconciledGuest, cyclesProcessed } = runReconciliationLogic(guest, now);
        
        if (cyclesProcessed === 0) {
            // Even if no new cycle, there might be a status update (e.g. balance became 0)
            if (JSON.stringify(guest) !== JSON.stringify(reconciledGuest)) {
                 if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
                    const ownerId = user.currentUser.role === 'owner' ? user.currentUser.id : user.currentUser.ownerId;
                    if (ownerId) {
                        const selectedDb = selectOwnerDataDb(user.currentUser);
                        const guestDocRef = doc(selectedDb, 'users_data', ownerId, 'guests', guestId);
                        await setDoc(guestDocRef, reconciledGuest, { merge: true });
                    }
                }
                return reconciledGuest;
            }
            return rejectWithValue('No reconciliation needed.');
        }

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const ownerId = user.currentUser.role === 'owner' ? user.currentUser.id : user.currentUser.ownerId;
            if (ownerId) {
                const selectedDb = selectOwnerDataDb(user.currentUser);
                const guestDocRef = doc(selectedDb, 'users_data', ownerId, 'guests', guestId);
                await setDoc(guestDocRef, reconciledGuest, { merge: true });
            }
        }
        
        return reconciledGuest;
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
            .addCase(addGuest.fulfilled, (state, action) => {
                if (action.payload) state.guests.push(action.payload.newGuest);
            })
            .addCase(updateGuest.fulfilled, (state, action) => {
                const index = state.guests.findIndex(g => g.id === action.payload.updatedGuest.id);
                if (index !== -1) {
                    state.guests[index] = action.payload.updatedGuest;
                } else if (state.guests.length === 1 && state.guests[0].id === action.payload.updatedGuest.id) {
                    // This handles the case for a tenant updating their own record
                    state.guests[0] = action.payload.updatedGuest;
                }
            })
             .addCase(reconcileGuestPayment.fulfilled, (state, action) => {
                const index = state.guests.findIndex(g => g.id === action.payload.id);
                if (index !== -1) {
                    state.guests[index] = action.payload;
                }
            })
            .addCase(updateGuestKyc.fulfilled, (state, action) => {
                const index = state.guests.findIndex(g => g.id === action.payload.id);
                if (index !== -1) {
                    state.guests[index] = action.payload;
                }
            })
            .addCase(updateGuestKycFromOwner.fulfilled, (state, action) => {
                const index = state.guests.findIndex(g => g.id === action.payload.id);
                if (index !== -1) {
                    state.guests[index] = action.payload;
                }
            })
            .addCase(updateGuestKycStatus.fulfilled, (state, action) => {
                const index = state.guests.findIndex(g => g.id === action.payload.id);
                if (index !== -1) {
                    state.guests[index] = action.payload;
                }
            })
            .addCase(resetGuestKyc.fulfilled, (state, action) => {
                const index = state.guests.findIndex(g => g.id === action.payload);
                if (index !== -1) {
                    state.guests[index].kycStatus = 'not-started';
                    state.guests[index].kycRejectReason = null;
                    state.guests[index].documents = [];
                }
            })
            .addCase(initiateGuestExit.fulfilled, (state, action) => {
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
            .addCase(reconcileRentCycle.fulfilled, (state, action) => {
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
             .addCase(addSharedChargeToRoom.fulfilled, (state, action) => {
                action.payload.forEach(updatedGuest => {
                    const index = state.guests.findIndex(g => g.id === updatedGuest.id);
                    if (index !== -1) {
                        state.guests[index] = updatedGuest;
                    }
                });
            })
            .addCase(deletePg.fulfilled, (state, action: PayloadAction<string>) => {
                // Also remove guests from the deleted PG from local state
                state.guests = state.guests.filter(g => g.pgId !== action.payload);
            })
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.guests = [];
            });
    },
});

export const { setGuests } = guestsSlice.actions;
export default guestsSlice.reducer;
