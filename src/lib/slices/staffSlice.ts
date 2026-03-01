
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Staff, Invite, User } from '../types';
import { db, isFirebaseConfigured, auth, selectOwnerDataDb } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, query, where, writeBatch, getDoc, updateDoc } from 'firebase/firestore';
import { RootState } from '../store';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { deletePg } from './pgsSlice';

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
        if (!user.currentUser || !staffData.email) return rejectWithValue('No user or staff email');

        const userQuery = query(collection(db!, "users"), where("email", "==", staffData.email));
        const userSnapshot = await getDocs(userQuery);
        if (!userSnapshot.empty) {
            const existingUser = userSnapshot.docs[0].data() as User;
            if (existingUser.role === 'owner') {
                return rejectWithValue('This email belongs to an owner. Please use a different email to invite staff.');
            }
             if (existingUser.role === 'tenant') {
                return rejectWithValue('This email belongs to an active tenant. Please use a different email.');
            }
        }

        const newStaff: Staff = { id: `staff-${Date.now()}`, ...staffData };
        const invite: Invite = { email: newStaff.email, ownerId: user.currentUser.id, role: newStaff.role, details: newStaff };

        if (isFirebaseConfigured() && auth) {
             const actionCodeSettings = { url: `${window.location.origin}/login/verify`, handleCodeInApp: true };
            try { await sendSignInLinkToEmail(auth, newStaff.email, actionCodeSettings); } catch {}
        }

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const selectedDb = selectOwnerDataDb(user.currentUser);
            const batch = writeBatch(selectedDb!);
            const staffDocRef = doc(selectedDb!, 'users_data', user.currentUser.id, 'staff', newStaff.id);
            batch.set(staffDocRef, newStaff);
            // invites always on App DB
            const inviteDocRef = doc(db!, 'invites', newStaff.email);
            await setDoc(inviteDocRef, invite);
            await batch.commit();
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
            const selectedDb = selectOwnerDataDb(user.currentUser);
            const batch = writeBatch(selectedDb!);
            const staffDocRef = doc(selectedDb!, 'users_data', user.currentUser.id, 'staff', updatedStaff.id);
            batch.set(staffDocRef, updatedStaff, { merge: true });

            if (updatedStaff.userId) {
                const userDocRef = doc(db!, 'users', updatedStaff.userId);
                batch.update(userDocRef as any, { role: updatedStaff.role } as any);
            } else if (updatedStaff.email) {
                const inviteDocRef = doc(db!, 'invites', updatedStaff.email);
                const inviteDoc = await getDoc(inviteDocRef);
                if (inviteDoc.exists()) {
                    await updateDoc(inviteDocRef, { role: updatedStaff.role, 'details.role': updatedStaff.role });
                }
            }
            await batch.commit();
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
            const selectedDb = selectOwnerDataDb(user.currentUser);
            const docRef = doc(selectedDb!, 'users_data', user.currentUser.id, 'staff', staffId);
            await deleteDoc(docRef);
        }
        return staffId;
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
            .addCase(addStaff.fulfilled, (state, action) => { state.staff.push(action.payload); })
            .addCase(updateStaff.fulfilled, (state, action) => {
                const index = state.staff.findIndex(s => s.id === action.payload.id);
                if (index !== -1) { state.staff[index] = action.payload; }
            })
            .addCase(deleteStaff.fulfilled, (state, action) => { state.staff = state.staff.filter(s => s.id !== action.payload); })
            .addCase(deletePg.fulfilled, (state, action: PayloadAction<string>) => { state.staff = state.staff.filter(s => s.pgId !== action.payload); })
            .addCase('user/logoutUser/fulfilled', (state) => { state.staff = []; });
    },
});

export const { setStaff } = staffSlice.actions;
export default staffSlice.reducer;
