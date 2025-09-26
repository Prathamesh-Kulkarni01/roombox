
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Complaint } from '../types';
import { db, isFirebaseConfigured, selectOwnerDataDb } from '../firebase';
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

export const addComplaint = createAsyncThunk<Complaint, Omit<Complaint, 'id'>, { state: RootState }>(
    'complaints/addComplaint',
    async (newComplaintData, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser) return rejectWithValue('No user');
        const newComplaint: Complaint = { ...newComplaintData, id: `cmp-${Date.now()}` };

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const selectedDb = selectOwnerDataDb(user.currentUser);
            const docRef = doc(selectedDb!, 'users_data', user.currentUser.id, 'complaints', newComplaint.id);
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

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const selectedDb = selectOwnerDataDb(user.currentUser);
            const docRef = doc(selectedDb!, 'users_data', user.currentUser.id, 'complaints', updatedComplaint.id);
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
