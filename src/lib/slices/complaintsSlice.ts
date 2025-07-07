
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Complaint } from '../types';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { RootState } from '../store';
import { format } from 'date-fns';
import { addNotification } from './notificationsSlice';

interface ComplaintsState {
    complaints: Complaint[];
}

const initialState: ComplaintsState = {
    complaints: [],
};

type NewComplaintData = Pick<Complaint, 'category' | 'description'>;

// Async Thunks
export const fetchComplaints = createAsyncThunk(
    'complaints/fetchComplaints',
    async ({ userId, useCloud }: { userId: string, useCloud: boolean }) => {
        if (useCloud) {
            const complaintsCollection = collection(db, 'users_data', userId, 'complaints');
            const snap = await getDocs(complaintsCollection);
            return snap.docs.map(d => d.data() as Complaint);
        } else {
            if(typeof window === 'undefined') return [];
            const localData = localStorage.getItem('complaints');
            return localData ? JSON.parse(localData) : [];
        }
    }
);

export const addComplaint = createAsyncThunk<Complaint, NewComplaintData, { state: RootState }>(
    'complaints/addComplaint',
    async (complaintData, { getState, dispatch, rejectWithValue }) => {
        const { user, guests } = getState();
        const currentGuest = guests.guests.find(g => g.id === user.currentUser?.guestId);
        if (!user.currentUser || !currentGuest) return rejectWithValue('No user or guest');

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

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const docRef = doc(db, 'users_data', user.currentUser.id, 'complaints', newComplaint.id);
            await setDoc(docRef, newComplaint);
        }

        await dispatch(addNotification({
            type: 'new-complaint',
            title: 'Complaint Submitted',
            message: `Your complaint about ${newComplaint.category} has been sent to the manager.`,
            link: `/tenants/complaints`,
            targetId: newComplaint.id,
        }));
        
        return newComplaint;
    }
);

export const updateComplaint = createAsyncThunk<Complaint, Complaint, { state: RootState }>(
    'complaints/updateComplaint',
    async (updatedComplaint, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser) return rejectWithValue('No user');

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const docRef = doc(db, 'users_data', user.currentUser.id, 'complaints', updatedComplaint.id);
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
            state.complaints = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchComplaints.fulfilled, (state, action) => {
                state.complaints = action.payload;
            })
            .addCase(addComplaint.fulfilled, (state, action) => {
                state.complaints.unshift(action.payload);
            })
            .addCase(updateComplaint.fulfilled, (state, action) => {
                const index = state.complaints.findIndex(c => c.id === action.payload.id);
                if (index !== -1) {
                    state.complaints[index] = action.payload;
                }
            })
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.complaints = [];
            });
    },
});

export const { setComplaints } = complaintsSlice.actions;
export default complaintsSlice.reducer;
