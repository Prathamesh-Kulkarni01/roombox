
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Complaint } from '../types';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, doc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { RootState } from '../store';
import { deletePg } from './pgsSlice';

interface ComplaintsState {
    complaints: Complaint[];
}

const initialState: ComplaintsState = {
    complaints: [],
};

type NewComplaintData = Pick<Complaint, 'category' | 'description' | 'isPublic' | 'imageUrls'>;

export const addComplaint = createAsyncThunk<Complaint, NewComplaintData, { state: RootState }>(
    'complaints/addComplaint',
    async (complaintData, { getState, dispatch, rejectWithValue }) => {
        const { user, guests } = getState();
        const currentGuest = guests.guests.find(g => g.id === user.currentUser?.guestId);
        const ownerId = user.currentUser?.ownerId;
        
        if (!user.currentUser || !currentGuest || !ownerId) {
             return rejectWithValue('User, guest, or owner information is missing');
        }

        const newComplaint: Complaint = { 
            id: `c-${Date.now()}`, 
            ...complaintData, 
            guestId: currentGuest.id, 
            guestName: currentGuest.name,
            pgId: currentGuest.pgId,
            pgName: currentGuest.pgName,
            status: 'open',
            date: new Date().toISOString(),
            upvotes: 0
        };

        if (isFirebaseConfigured()) {
            const docRef = doc(db, 'users_data', ownerId, 'complaints', newComplaint.id);
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
        if (!ownerId) return rejectWithValue('Could not determine owner to update complaint');

        if(isFirebaseConfigured()) {
            const docRef = doc(db, 'users_data', ownerId, 'complaints', updatedComplaint.id);
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
