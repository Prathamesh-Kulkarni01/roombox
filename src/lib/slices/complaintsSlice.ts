
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Complaint } from '../types';
import { RootState } from '../store';
import { addNotification } from './notificationsSlice';

interface ComplaintsState {
    complaints: Complaint[];
}

const initialState: ComplaintsState = {
    complaints: [],
};

type NewComplaintData = Pick<Complaint, 'category' | 'description'>;

// Async Thunks
export const fetchComplaints = createAsyncThunk<Complaint[], void, { state: RootState }>(
    'complaints/fetchComplaints',
    async (_, { getState }) => {
        const { user } = getState();
        if (!user.currentUser) return [];
        const res = await fetch(`/api/data/complaints?ownerId=${user.currentUser.ownerId || user.currentUser.id}`);
        return await res.json();
    }
);

export const addComplaint = createAsyncThunk<Complaint, NewComplaintData, { state: RootState }>(
    'complaints/addComplaint',
    async (complaintData, { getState, dispatch, rejectWithValue }) => {
        const { user, guests } = getState();
        const currentGuest = guests.guests.find(g => g.id === user.currentUser?.guestId);
        if (!user.currentUser || !currentGuest) return rejectWithValue('No user or guest');

        const newComplaint: Omit<Complaint, 'id'> = { 
            ...complaintData, 
            guestId: currentGuest.id, 
            guestName: currentGuest.name,
            pgId: currentGuest.pgId,
            pgName: currentGuest.pgName,
            status: 'open',
            date: new Date().toISOString(),
            upvotes: 0
        };
        
        const res = await fetch('/api/data/complaints', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newComplaint)
        });
        const addedComplaint = await res.json();

        await dispatch(addNotification({
            type: 'new-complaint',
            title: 'Complaint Submitted',
            message: `Your complaint about ${addedComplaint.category} has been sent to the property manager.`,
            link: `/tenants/complaints`,
            targetId: addedComplaint.id,
        }));
        
        return addedComplaint;
    }
);

export const updateComplaint = createAsyncThunk<Complaint, Complaint, { state: RootState }>(
    'complaints/updateComplaint',
    async (updatedComplaint, { rejectWithValue }) => {
        const res = await fetch(`/api/data/complaints/${updatedComplaint.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedComplaint)
        });
        if (!res.ok) return rejectWithValue('Failed to update complaint');
        return await res.json();
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
