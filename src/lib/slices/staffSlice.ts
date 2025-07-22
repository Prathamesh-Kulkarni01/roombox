

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Staff, Invite, User } from '../types';
import { db, isFirebaseConfigured, auth } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, query, where, updateDoc, writeBatch } from 'firebase/firestore';
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
    async (userId: string) => {
        const staffCollection = collection(db, 'users_data', userId, 'staff');
        const snap = await getDocs(staffCollection);
        return snap.docs.map(d => d.data() as Staff);
    }
);

export const addStaff = createAsyncThunk<Staff, NewStaffData, { state: RootState }>(
    'staff/addStaff',
    async (staffData, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser || !staffData.email) return rejectWithValue('No user or staff email');

        const userQuery = query(collection(db, "users"), where("email", "==", staffData.email));
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
        
        const invite: Invite = {
            email: newStaff.email,
            ownerId: user.currentUser.id,
            role: newStaff.role, // Ensure role is included in invite
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

        const batch = writeBatch(db);
        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const staffDocRef = doc(db, 'users_data', user.currentUser.id, 'staff', updatedStaff.id);
            batch.set(staffDocRef, updatedStaff, { merge: true });

            if (updatedStaff.userId) {
                // If user has already logged in, update their main user document
                const userDocRef = doc(db, 'users', updatedStaff.userId);
                batch.update(userDocRef, { role: updatedStaff.role });
            } else if (updatedStaff.email) {
                // If user has not logged in yet, update their invite document
                const inviteDocRef = doc(db, 'invites', updatedStaff.email);
                const inviteDoc = await getDoc(inviteDocRef);
                if (inviteDoc.exists()) {
                    batch.update(inviteDocRef, { role: updatedStaff.role, 'details.role': updatedStaff.role });
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
