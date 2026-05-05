

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Complaint } from '../types';
import { db, isFirebaseConfigured, selectOwnerDataDb } from '../firebase';
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { RootState } from '../store';
import { createAndSendNotification } from '../actions/notificationActions';
import { getCurrentPlan } from '../utils';

interface ComplaintsState {
    complaints: Complaint[];
    optimisticComplaints: Record<string, Complaint>;
}

const initialState: ComplaintsState = {
    complaints: [],
    optimisticComplaints: {},
};

export const addComplaint = createAsyncThunk<Complaint, Complaint, { state: RootState }>(
    'complaints/addComplaint',
    async (complaint, { getState, rejectWithValue }) => {
        const { user } = getState();
        const ownerId = user.currentUser?.role === 'owner' ? user.currentUser.id : user.currentUser?.ownerId;

        if (!ownerId) return rejectWithValue('Owner ID not found.');

        try {
            if (isFirebaseConfigured()) {
                const selectedDb = selectOwnerDataDb(user.currentUser);
                if (!selectedDb) throw new Error('DB not available');
                const docRef = doc(selectedDb, 'users_data', ownerId, 'complaints', complaint.id);
                await setDoc(docRef, complaint);
            }
            return complaint;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const addOwnerComplaint = createAsyncThunk<Complaint[], Complaint[], { state: RootState }>(
    'complaints/addOwnerComplaint',
    async (complaints, { getState, rejectWithValue }) => {
        const { user } = getState();
        const ownerId = user.currentUser?.id;
        if (!ownerId || user.currentUser?.role !== 'owner') return rejectWithValue('Only owners can use this.');

        try {
            if (isFirebaseConfigured()) {
                const selectedDb = selectOwnerDataDb(user.currentUser);
                if (!selectedDb) throw new Error('DB not available');
                const batch = writeBatch(selectedDb);
                complaints.forEach(c => {
                    const ref = doc(selectedDb, 'users_data', ownerId, 'complaints', c.id);
                    batch.set(ref, c);
                });
                await batch.commit();
            }
            return complaints;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const updateComplaint = createAsyncThunk<Complaint, Complaint, { state: RootState }>(
    'complaints/updateComplaint',
    async (complaint, { getState, rejectWithValue }) => {
        const { user } = getState();
        const ownerId = user.currentUser?.role === 'owner' ? user.currentUser.id : user.currentUser?.ownerId;

        if (!ownerId) return rejectWithValue('Owner ID not found.');

        try {
            if (isFirebaseConfigured()) {
                const selectedDb = selectOwnerDataDb(user.currentUser);
                if (!selectedDb) throw new Error('DB not available');
                const docRef = doc(selectedDb, 'users_data', ownerId, 'complaints', complaint.id);
                await setDoc(docRef, complaint, { merge: true });
            }
            return complaint;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const deleteComplaint = createAsyncThunk<string, string, { state: RootState }>(
    'complaints/deleteComplaint',
    async (complaintId, { getState, rejectWithValue }) => {
        const { user } = getState();
        const ownerId = user.currentUser?.role === 'owner' ? user.currentUser.id : user.currentUser?.ownerId;

        if (!ownerId) return rejectWithValue('Owner ID not found.');

        try {
            if (isFirebaseConfigured()) {
                const selectedDb = selectOwnerDataDb(user.currentUser);
                if (!selectedDb) throw new Error('DB not available');
                const docRef = doc(selectedDb, 'users_data', ownerId, 'complaints', complaintId);
                await deleteDoc(docRef);
            }
            return complaintId;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

const complaintsSlice = createSlice({
    name: 'complaints',
    initialState,
    reducers: {
        setComplaints: (state, action: PayloadAction<Complaint[]>) => {
            state.complaints = action.payload.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            // Reconciliation
            action.payload.forEach(complaint => {
                const optComplaint = state.optimisticComplaints[complaint.id];
                if (optComplaint) {
                    if (!optComplaint.updatedAt || (complaint.updatedAt && complaint.updatedAt >= optComplaint.updatedAt)) {
                        delete state.optimisticComplaints[complaint.id];
                    }
                }
            });
        },
        setOptimisticComplaint: (state, action: PayloadAction<Complaint>) => {
            state.optimisticComplaints[action.payload.id] = action.payload;
        },
        removeOptimisticComplaint: (state, action: PayloadAction<string>) => {
            delete state.optimisticComplaints[action.payload];
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(addComplaint.fulfilled, (state, action) => {
                if (!state.complaints.find(c => c.id === action.payload.id)) {
                    state.complaints.unshift(action.payload);
                }
            })
            .addCase(addOwnerComplaint.fulfilled, (state, action) => {
                const newComplaints = action.payload.filter(
                    (newC: Complaint) => !state.complaints.find(existing => existing.id === newC.id)
                );
                state.complaints.unshift(...newComplaints);
            })
            .addCase(updateComplaint.fulfilled, (state, action) => {
                const index = state.complaints.findIndex(c => c.id === action.payload.id);
                if (index !== -1) {
                    state.complaints[index] = action.payload;
                }
            })
            .addCase(deleteComplaint.fulfilled, (state, action) => {
                state.complaints = state.complaints.filter(c => c.id !== action.payload);
            })
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.complaints = [];
                state.optimisticComplaints = {};
            });
    },
});

export const { setComplaints, setOptimisticComplaint, removeOptimisticComplaint } = complaintsSlice.actions;
export default complaintsSlice.reducer;
