
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Staff } from '../types';
import { RootState } from '../store';

interface StaffState {
    staff: Staff[];
}

const initialState: StaffState = {
    staff: [],
};

type NewStaffData = Omit<Staff, 'id'>;

// Async Thunks
export const fetchStaff = createAsyncThunk<Staff[], void, { state: RootState }>(
    'staff/fetchStaff',
    async (_, { getState }) => {
        const { user } = getState();
        if (!user.currentUser) return [];
        const res = await fetch('/api/data/staff');
        return await res.json();
    }
);

export const addStaff = createAsyncThunk<Staff, NewStaffData, { state: RootState }>(
    'staff/addStaff',
    async (staffData, { rejectWithValue }) => {
        const res = await fetch('/api/data/staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(staffData)
        });
        if (!res.ok) return rejectWithValue('Failed to add staff');
        return await res.json();
    }
);

export const updateStaff = createAsyncThunk<Staff, Staff, { state: RootState }>(
    'staff/updateStaff',
    async (updatedStaff, { rejectWithValue }) => {
        const res = await fetch(`/api/data/staff/${updatedStaff.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedStaff)
        });
        if (!res.ok) return rejectWithValue('Failed to update staff');
        return await res.json();
    }
);

export const deleteStaff = createAsyncThunk<string, string, { state: RootState }>(
    'staff/deleteStaff',
    async (staffId, { rejectWithValue }) => {
        const res = await fetch(`/api/data/staff/${staffId}`, { method: 'DELETE' });
        if (!res.ok) return rejectWithValue('Failed to delete staff');
        return staffId;
    }
);

const staffSlice = createSlice({
    name: 'staff',
    initialState,
    reducers: {
        setStaff: (state, action: PayloadAction<Staff[]>) => {
            state.staff = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchStaff.fulfilled, (state, action) => {
                state.staff = action.payload;
            })
            .addCase(addStaff.fulfilled, (state, action) => {
                state.staff.push(action.payload);
            })
            .addCase(updateStaff.fulfilled, (state, action) => {
                const index = state.staff.findIndex(s => s.id === action.payload.id);
                if (index !== -1) {
                    state.staff[index] = action.payload;
                }
            })
            .addCase(deleteStaff.fulfilled, (state, action) => {
                state.staff = state.staff.filter(s => s.id !== action.payload);
            })
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.staff = [];
            });
    },
});

export const { setStaff } = staffSlice.actions;
export default staffSlice.reducer;
