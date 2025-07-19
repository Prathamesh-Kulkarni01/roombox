
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Complaint } from '../types';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { RootState } from '../store';
import { addNotification } from './notificationsSlice';

interface ComplaintsState {
    complaints: Complaint[];
}

const initialState: ComplaintsState = {
    complaints: [],
};

type NewComplaintData = Pick<Complaint, 'category' | 'description' | 'isPublic' | 'imageUrls'>;

// Async Thunks
export const fetchComplaints = createAsyncThunk(
    'complaints/fetchComplaints',
    async (userId: string) => {
        const complaintsCollection = collection(db, 'users_data', userId, 'complaints');
        const snap = await getDocs(complaintsCollection);
        return snap.docs.map(d => d.data() as Complaint);
    }
);

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

        await dispatch(addNotification({
            type: 'new-complaint',
            title: 'New Complaint Received',
            message: `${newComplaint.guestName} raised a complaint about ${newComplaint.category}.`,
            link: `/dashboard/complaints`,
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
            .addCase(fetchComplaints.fulfilled, (state, action) => {
                state.complaints = action.payload.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
