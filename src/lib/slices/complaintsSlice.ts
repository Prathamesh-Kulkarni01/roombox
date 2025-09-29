

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Complaint } from '../types';
import { db, isFirebaseConfigured, selectOwnerDataDb } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { RootState } from '../store';
import { deletePg } from './pgsSlice';
import { uploadDataUriToStorage } from '../storage';
import { createAndSendNotification } from '../actions/notificationActions';

interface ComplaintsState {
    complaints: Complaint[];
}

const initialState: ComplaintsState = {
    complaints: [],
};

// For tenants raising a complaint
export type NewTenantComplaintData = Omit<Complaint, 'id' | 'date' | 'status' | 'guestName' | 'guestId' | 'pgId' | 'pgName'>;
export const addComplaint = createAsyncThunk<Complaint, NewTenantComplaintData, { state: RootState }>(
    'complaints/addComplaint',
    async (newComplaintData, { getState, rejectWithValue }) => {
        const { user, guests } = getState();
        const currentGuest = guests.guests.find(g => g.id === user.currentUser?.guestId);
        const ownerId = user.currentUser?.ownerId;

        if (!user.currentUser || !currentGuest || !ownerId) {
            return rejectWithValue('User or guest data is incomplete');
        }

        const imageUrls = [];
        if (newComplaintData.imageUrls) {
            for (const dataUri of newComplaintData.imageUrls) {
                try {
                    const url = await uploadDataUriToStorage(dataUri, `complaints/${ownerId}/${Date.now()}`);
                    imageUrls.push(url);
                } catch (e) {
                    console.error("Failed to upload complaint image:", e);
                }
            }
        }
        
        const newComplaint: Complaint = { 
            ...newComplaintData,
            imageUrls,
            id: `cmp-${Date.now()}`,
            date: new Date().toISOString(),
            status: 'open',
            guestId: currentGuest.id,
            guestName: currentGuest.name,
            pgId: currentGuest.pgId,
            pgName: currentGuest.pgName,
            isPublic: newComplaintData.isPublic ?? true,
        };
        
        if (isFirebaseConfigured()) {
            const selectedDb = selectOwnerDataDb(user.currentUser);
            const docRef = doc(selectedDb, 'users_data', ownerId, 'complaints', newComplaint.id);
            await setDoc(docRef, newComplaint);
        }
        
        return newComplaint;
    }
);

// For owners raising a complaint
export type NewOwnerComplaintData = Omit<Complaint, 'id' | 'date' | 'status' | 'guestName' | 'pgName'>;
export const addOwnerComplaint = createAsyncThunk<Complaint, NewOwnerComplaintData, { state: RootState }>(
    'complaints/addOwnerComplaint',
    async (newComplaintData, { getState, rejectWithValue }) => {
        const { user, guests, pgs } = getState();
        const ownerId = user.currentUser?.id;

        if (!user.currentUser || !ownerId || user.currentUser.role !== 'owner') {
            return rejectWithValue('Only owners can perform this action.');
        }

        let guestName = 'Owner Reported';
        if (newComplaintData.guestId) {
            const guest = guests.guests.find(g => g.id === newComplaintData.guestId);
            if (guest) guestName = guest.name;
        }

        const pgName = pgs.pgs.find(p => p.id === newComplaintData.pgId)?.name || 'Unknown PG';

        const imageUrls = [];
        if (newComplaintData.imageUrls) {
            for (const dataUri of newComplaintData.imageUrls) {
                try {
                    const url = await uploadDataUriToStorage(dataUri, `complaints/${ownerId}/${Date.now()}`);
                    imageUrls.push(url);
                } catch (e) {
                    console.error("Failed to upload complaint image:", e);
                }
            }
        }

        const newComplaint: Complaint = {
            ...newComplaintData,
            imageUrls,
            id: `cmp-${Date.now()}`,
            date: new Date().toISOString(),
            status: 'open',
            guestName,
            pgName,
            guestId: newComplaintData.guestId || null,
        };

        if (isFirebaseConfigured()) {
            const selectedDb = selectOwnerDataDb(user.currentUser);
            const docRef = doc(selectedDb, 'users_data', ownerId, 'complaints', newComplaint.id);
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
        
        // Send notification to tenant if status changes
        if (updatedComplaint.guestId && user.currentUser.role === 'owner') {
             await createAndSendNotification({
                ownerId: ownerId,
                notification: {
                    type: 'complaint-update',
                    title: `Your complaint status is now "${updatedComplaint.status}"`,
                    message: `Your issue about "${updatedComplaint.category}" has been updated.`,
                    link: '/tenants/complaints',
                    targetId: updatedComplaint.guestId,
                }
            });
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
             .addCase(addOwnerComplaint.fulfilled, (state, action) => {
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
