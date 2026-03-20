
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Staff, Invite, User } from '../types';
import { db, isFirebaseConfigured, auth, selectOwnerDataDb } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, query, where, writeBatch, getDoc, updateDoc } from 'firebase/firestore';
import { RootState } from '../store';
import { sendSignInLinkToEmail } from 'firebase/auth';

interface StaffState {
    staff: Staff[];
}

const initialState: StaffState = {
    staff: [],
};

type NewStaffData = Omit<Staff, 'id'>;

export const addStaff = createAsyncThunk<Staff, NewStaffData, { state: RootState }>(
    'staff/addStaff',
    async (staffData, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser) return rejectWithValue('No user');

        try {
            const response = await fetch('/api/staff/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add',
                    ownerId: user.currentUser.id,
                    data: staffData
                }),
            });

            const result = await response.json();
            if (!response.ok) return rejectWithValue(result.error);
            return result.staff;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const updateStaff = createAsyncThunk<Staff, Staff, { state: RootState }>(
    'staff/updateStaff',
    async (updatedStaff, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser) return rejectWithValue('No user');

        try {
            const response = await fetch('/api/staff/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update',
                    ownerId: user.currentUser.id,
                    staffId: updatedStaff.id,
                    data: updatedStaff
                }),
            });

            const result = await response.json();
            if (!response.ok) return rejectWithValue(result.error);
            return updatedStaff;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const deleteStaff = createAsyncThunk<string, string, { state: RootState }>(
    'staff/deleteStaff',
    async (staffId, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser) return rejectWithValue('No user');

        try {
            const response = await fetch('/api/staff/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete',
                    ownerId: user.currentUser.id,
                    staffId: staffId
                }),
            });

            const result = await response.json();
            if (!response.ok) return rejectWithValue(result.error);
            return staffId;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchStaff = createAsyncThunk<Staff[], string, { state: RootState }>(
    'staff/fetchStaff',
    async (ownerId, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/staff/manage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'list', ownerId }),
            });
            const result = await response.json();
            if (!response.ok) return rejectWithValue(result.error);
            return result.staff;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

const staffSlice = createSlice({
    name: 'staff',
    initialState,
    reducers: {
        setStaff: (state, action: PayloadAction<Staff[]>) => { state.staff = action.payload; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchStaff.fulfilled, (state, action) => { state.staff = action.payload; })
            .addCase(addStaff.fulfilled, (state, action) => { state.staff.push(action.payload); })
            .addCase(updateStaff.fulfilled, (state, action) => {
                const index = state.staff.findIndex(s => s.id === action.payload.id);
                if (index !== -1) { state.staff[index] = action.payload; }
            })
            .addCase(deleteStaff.fulfilled, (state, action) => { state.staff = state.staff.filter(s => s.id !== action.payload); })
            .addCase('user/logoutUser/fulfilled', (state) => { state.staff = []; });
    },
});

export const { setStaff } = staffSlice.actions;
export default staffSlice.reducer;
