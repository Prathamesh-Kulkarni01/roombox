

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Staff, Invite } from '../types';
import { db, isFirebaseConfigured, auth } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { RootState } from '../store';
import { sendSignInLinkToEmail } from 'firebase/auth';

interface StaffState {
    staff: Staff[];
}

const initialState: StaffState = {
    staff: [],
};

type NewStaffData = Omit<Staff, 'id'>;

// Async Thunks
export const fetchStaff = createAsyncThunk(
    'staff/fetchStaff',
    async ({ userId, useCloud }: { userId: string, useCloud: boolean }) => {
        if (useCloud) {
            const staffCollection = collection(db, 'users_data', userId, 'staff');
            const snap = await getDocs(staffCollection);
            return snap.docs.map(d => d.data() as Staff);
        } else {
            if(typeof window === 'undefined') return [];
            const localData = localStorage.getItem('staff');
            return localData ? JSON.parse(localData) : [];
        }
    }
);

export const addStaff = createAsyncThunk<Staff, NewStaffData, { state: RootState }>(
    'staff/addStaff',
    async (staffData, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser || !staffData.email) return rejectWithValue('No user or staff email');

        const newStaff: Staff = { id: `staff-${Date.now()}`, ...staffData };
        
        const invite: Invite = {
            email: newStaff.email,
            ownerId: user.currentUser.id,
            role: newStaff.role,
            details: newStaff,
        };

        if (isFirebaseConfigured() && auth) {
             const actionCodeSettings = {
                url: `${window.location.origin}/login/verify`,
                handleCodeInApp: true,
            };
            try {
                await sendSignInLinkToEmail(auth, newStaff.email, actionCodeSettings);
            } catch (error) {
                console.error("Failed to send sign-in link:", error);
            }
        }

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const staffDocRef = doc(db, 'users_data', user.currentUser.id, 'staff', newStaff.id);
            const inviteDocRef = doc(db, 'invites', newStaff.email);
            await Promise.all([
                setDoc(staffDocRef, newStaff),
                setDoc(inviteDocRef, invite),
            ]);
        }
        return newStaff;
    }
);

export const updateStaff = createAsyncThunk<Staff, Staff, { state: RootState }>(
    'staff/updateStaff',
    async (updatedStaff, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser) return rejectWithValue('No user');

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const docRef = doc(db, 'users_data', user.currentUser.id, 'staff', updatedStaff.id);
            await setDoc(docRef, updatedStaff, { merge: true });
        }
        return updatedStaff;
    }
);

export const deleteStaff = createAsyncThunk<string, string, { state: RootState }>(
    'staff/deleteStaff',
    async (staffId, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser) return rejectWithValue('No user');

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const docRef = doc(db, 'users_data', user.currentUser.id, 'staff', staffId);
            await deleteDoc(docRef);
        }
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
