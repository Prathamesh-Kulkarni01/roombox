
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Complaint } from '../types';
import { db, isFirebaseConfigured, selectOwnerDataDb } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { RootState } from '../store';
import { deletePg } from './pgsSlice';

interface ComplaintsState {
    complaints: Complaint[];
}

const initialState: ComplaintsState = {
    complaints: [],
};

export type NewComplaintData = Omit<Complaint, 'id' | 'date' | 'status' | 'guestName'>;

export const addComplaint = createAsyncThunk<Complaint, NewComplaintData, { state: RootState }>(
    'complaints/addComplaint',
    async (newComplaintData, { getState, rejectWithValue }) => {
        const { user, guests } = getState();
        if (!user.currentUser) return rejectWithValue('No user');
        const ownerId = user.currentUser.role === 'owner' ? user.currentUser.id : user.currentUser.ownerId;
        if (!ownerId) return rejectWithValue('Owner not found');
        
        let guestName = 'Owner Reported';
        if (newComplaintData.guestId) {
            const guest = guests.guests.find(g => g.id === newComplaintData.guestId);
            if (guest) guestName = guest.name;
        } else if (user.currentUser.role === 'tenant') {
            guestName = user.currentUser.name;
        }

        const newComplaint: Complaint = { 
            ...newComplaintData,
            id: `cmp-${Date.now()}`,
            date: new Date().toISOString(),
            status: 'open',
            guestName,
        };

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const selectedDb = selectOwnerDataDb(user.currentUser);
            const docRef = doc(selectedDb!, 'users_data', ownerId, 'complaints', newComplaint.id);
            await setDoc(docRef, newComplaint);
        }
        
        return newComplaint;
    }
);

export const updateComplaint = createAsyncThunk<Complaint, Complaint, { state: RootState }>(
    'complaints/updateComplaint',
    async (updatedComplaint, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser) return rejectWithValue('No user');
        const ownerId = user.currentUser.role === 'owner' ? user.currentUser.id : user.currentUser.ownerId;
        if (!ownerId) return rejectWithValue('Owner not found');

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const selectedDb = selectOwnerDataDb(user.currentUser);
            const docRef = doc(selectedDb!, 'users_data', ownerId, 'complaints', updatedComplaint.id);
            await setDoc(docRef, updatedComplaint, { merge: true });
        }
        
        return updatedComplaint;
    }
);


const complaintsSlice = createSlice({
    name: 'complaints',
    initialState,
    reducers: {
        setComplaints: (state, action: PayloadAction<Complaint[]>) => {
            state.complaints = action.payload.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(addComplaint.fulfilled, (state, action) => {
                state.complaints.unshift(action.payload);
            })
            .addCase(updateComplaint.fulfilled, (state, action) => {
                const index = state.complaints.findIndex(c => c.id === action.payload.id);
                if (index !== -1) {
                    state.complaints[index] = action.payload;
                }
            })
            .addCase(deletePg.fulfilled, (state, action: PayloadAction<string>) => {
                state.complaints = state.complaints.filter(c => c.pgId !== action.payload);
            })
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.complaints = [];
            });
    },
});

export const { setComplaints } = complaintsSlice.actions;
export default complaintsSlice.reducer;
