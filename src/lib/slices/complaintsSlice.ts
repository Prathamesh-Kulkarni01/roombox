

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Complaint } from '../types';
import { db, isFirebaseConfigured, selectOwnerDataDb } from '../firebase';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { RootState } from '../store';
import { deletePg } from './pgsSlice';
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
    async (newComplaintData, { getState, rejectWithValue, dispatch }) => {
        const { user, guests } = getState();
        const currentGuest = guests.guests.find(g => g.id === user.currentUser?.guestId);
        const ownerId = user.currentUser?.ownerId;

        if (!user.currentUser || !currentGuest || !ownerId) {
            return rejectWithValue('User or guest data is incomplete');
        }

        // Image URLs are already uploaded URLs at this point
        const newComplaint: Complaint = { 
            ...newComplaintData,
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

        await createAndSendNotification({
            ownerId: ownerId,
            notification: {
                type: 'new-complaint',
                title: `New Complaint: ${newComplaint.category}`,
                message: `${newComplaint.guestName} reported: "${newComplaint.description.substring(0, 100)}${newComplaint.description.length > 100 ? '...' : ''}"`,
                link: `/dashboard/complaints`,
                targetId: ownerId, // Send to the owner
            }
        });
        
        if (currentGuest.userId) {
            await createAndSendNotification({
                ownerId,
                notification: {
                    type: 'new-complaint-confirmation',
                    title: 'Complaint Logged',
                    message: `We have received your complaint about "${newComplaint.category}". The manager has been notified.`,
                    link: '/tenants/complaints',
                    targetId: currentGuest.userId
                }
            });
        }
        
        return newComplaint;
    }
);

// For owners raising a complaint, now supports multiple entities
export type NewOwnerComplaintData = {
    pgIds: string[];
    targetType: 'general' | 'specific';
    roomIds?: string[];
    guestIds?: string[];
    category: 'maintenance' | 'cleanliness' | 'wifi' | 'food' | 'other';
    description: string;
    imageUrls?: string[];
    isPublic: boolean;
};

export const addOwnerComplaint = createAsyncThunk<Complaint[], NewOwnerComplaintData, { state: RootState }>(
    'complaints/addOwnerComplaint',
    async (complaintData, { getState, rejectWithValue }) => {
        const { user, guests, pgs } = getState();
        const ownerId = user.currentUser?.id;

        if (!user.currentUser || !ownerId || user.currentUser.role !== 'owner') {
            return rejectWithValue('Only owners can perform this action.');
        }

        const selectedDb = selectOwnerDataDb(user.currentUser);
        const batch = writeBatch(selectedDb);
        const createdComplaints: Complaint[] = [];

        const createComplaintObject = (
            pgId: string, 
            guestId: string | null, 
            roomId: string | null, 
            floorId: string | null
        ): Complaint => {
            const guestName = guestId ? (guests.guests.find(g => g.id === guestId)?.name || 'Unknown Guest') : 'Owner Reported';
            const pgName = pgs.pgs.find(p => p.id === pgId)?.name || 'Unknown PG';
            
            return {
                id: `cmp-${Date.now()}-${Math.random()}`,
                date: new Date().toISOString(),
                status: 'open',
                pgId,
                pgName,
                guestId,
                guestName,
                roomId: roomId || undefined,
                floorId: floorId || undefined,
                category: complaintData.category,
                description: complaintData.description,
                imageUrls: complaintData.imageUrls,
                isPublic: complaintData.isPublic,
            };
        };

        if (complaintData.targetType === 'general') {
            for (const pgId of complaintData.pgIds) {
                const newComplaint = createComplaintObject(pgId, null, null, null);
                const docRef = doc(selectedDb, 'users_data', ownerId, 'complaints', newComplaint.id);
                batch.set(docRef, newComplaint);
                createdComplaints.push(newComplaint);
            }
        } else { // 'specific'
            const handledGuests = new Set<string>();

            // Handle specific guests first
            if (complaintData.guestIds && complaintData.guestIds.length > 0) {
                for (const guestId of complaintData.guestIds) {
                    const guest = guests.guests.find(g => g.id === guestId);
                    if (guest && complaintData.pgIds.includes(guest.pgId)) {
                        const pg = pgs.pgs.find(p => p.id === guest.pgId);
                        const room = pg?.floors?.flatMap(f => f.rooms).find(r => r.beds.some(b => b.guestId === guest.id));
                        const floor = pg?.floors?.find(f => f.id === room?.floorId);
                        
                        const newComplaint = createComplaintObject(guest.pgId, guestId, room?.id || null, floor?.id || null);
                        const docRef = doc(selectedDb, 'users_data', ownerId, 'complaints', newComplaint.id);
                        batch.set(docRef, newComplaint);
                        createdComplaints.push(newComplaint);
                        handledGuests.add(guestId);
                    }
                }
            }

            // Handle specific rooms, but only for guests not already covered
            if (complaintData.roomIds && complaintData.roomIds.length > 0) {
                for (const roomId of complaintData.roomIds) {
                    const pg = pgs.pgs.find(p => p.floors?.some(f => f.rooms.some(r => r.id === roomId)));
                    const floor = pg?.floors?.find(f => f.rooms.some(r => r.id === roomId));
                    
                    if (pg && complaintData.pgIds.includes(pg.id)) {
                        const guestsInRoom = guests.guests.filter(g => g.roomId === roomId && !g.isVacated && !handledGuests.has(g.id));
                        if(guestsInRoom.length > 0) {
                             for (const guest of guestsInRoom) {
                                const newComplaint = createComplaintObject(pg.id, guest.id, roomId, floor?.id || null);
                                const docRef = doc(selectedDb, 'users_data', ownerId, 'complaints', newComplaint.id);
                                batch.set(docRef, newComplaint);
                                createdComplaints.push(newComplaint);
                                handledGuests.add(guest.id);
                            }
                        } else {
                            // Room-specific complaint with no active guest
                            const newComplaint = createComplaintObject(pg.id, null, roomId, floor?.id || null);
                            const docRef = doc(selectedDb, 'users_data', ownerId, 'complaints', newComplaint.id);
                            batch.set(docRef, newComplaint);
                            createdComplaints.push(newComplaint);
                        }
                    }
                }
            }
        }
        
        if (createdComplaints.length === 0) {
            return rejectWithValue("No valid targets found for the complaint.");
        }
        
        await batch.commit();
        
        return createdComplaints;
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
                state.complaints.unshift(...action.payload);
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
