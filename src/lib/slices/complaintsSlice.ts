
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Complaint } from '../types';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, doc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { RootState } from '../store';
import { sendNotification } from '@/ai/flows/send-notification-flow';

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

        // Send a push notification to the owner
        await sendNotification({
            userId: ownerId,
            title: `New Complaint: ${newComplaint.category}`,
            body: `${newComplaint.guestName} reported: "${newComplaint.description.substring(0, 100)}${newComplaint.description.length > 100 ? '...' : ''}"`,
            link: `/dashboard/complaints`
        });
        
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
        
        // Notify tenant about status change, if the action was performed by an owner
        if (user.currentUser.role === 'owner' && updatedComplaint.guestId !== user.currentUser.id) {
            const guestToNotifyQuery = query(collection(db, 'users'), where('guestId', '==', updatedComplaint.guestId));
            const guestUserSnap = await getDocs(guestToNotifyQuery);

            if (!guestUserSnap.empty) {
                const guestUserId = guestUserSnap.docs[0].id;
                await sendNotification({
                    userId: guestUserId,
                    title: `Complaint Status: ${updatedComplaint.status.toUpperCase()}`,
                    body: `Your complaint about "${updatedComplaint.description.substring(0, 50)}${updatedComplaint.description.length > 50 ? '...' : ''}" was updated.`,
                    link: '/tenants/complaints'
                });
            }
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
                } else {
                    state.complaints.push(action.payload);
                }
            })
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.complaints = [];
            });
    },
});

export const { setComplaints } = complaintsSlice.actions;
export default complaintsSlice.reducer;
