

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Plan, UserRole } from '../types';
import { db, isFirebaseConfigured } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { RootState } from '../store';
import { navItems } from '../mock-data';

export type Permissions = Record<UserRole, string[]>;

interface PermissionsState {
    permissions: Permissions | null;
}

const getDefaultPermissions = (plan: Plan): Permissions => {
    const staffRoles: UserRole[] = ['manager', 'cook', 'cleaner', 'security', 'other'];
    const permissions: Partial<Permissions> = {};

    staffRoles.forEach(role => {
        switch(role) {
            case 'manager':
                permissions[role] = [
                    '/dashboard', 
                    '/dashboard/tenant-management', 
                    '/dashboard/complaints', 
                    ...(plan.hasStaffManagement ? ['/dashboard/staff'] : []),
                    '/dashboard/food', 
                    '/dashboard/expense'
                ];
                break;
            case 'cook':
                permissions[role] = ['/dashboard/food', '/dashboard/expense'];
                break;
            case 'cleaner':
                permissions[role] = ['/dashboard/complaints'];
                break;
            case 'security':
                permissions[role] = ['/dashboard/tenant-management', '/dashboard/complaints'];
                break;
            default:
                permissions[role] = [];
        }
    });

    // Owner always gets all permissions
    permissions['owner'] = navItems.map(item => item.href);

    return permissions as Permissions;
};

const initialState: PermissionsState = {
    permissions: null,
};

// Async Thunks
export const fetchPermissions = createAsyncThunk<Permissions, { ownerId: string, plan: Plan }>(
    'permissions/fetchPermissions',
    async ({ ownerId, plan }, { rejectWithValue }) => {
        if (!isFirebaseConfigured() || !db) return rejectWithValue('Firebase not configured');
        const docRef = doc(db, 'users_data', ownerId, 'permissions', 'staff_roles');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as Permissions;
        } else {
            // No custom permissions found, create and set defaults
            const defaultPermissions = getDefaultPermissions(plan);
            await setDoc(docRef, defaultPermissions);
            return defaultPermissions;
        }
    }
);

export const updatePermissions = createAsyncThunk<Permissions, Permissions, { state: RootState }>(
    'permissions/updatePermissions',
    async (updatedPermissions, { getState, rejectWithValue }) => {
        const { user } = getState();
        const ownerId = user.currentUser?.id;
        if (!ownerId || !isFirebaseConfigured()) return rejectWithValue('User or Firebase not available');

        const docRef = doc(db, 'users_data', ownerId, 'permissions', 'staff_roles');
        await setDoc(docRef, updatedPermissions);
        return updatedPermissions;
    }
);

const permissionsSlice = createSlice({
    name: 'permissions',
    initialState,
    reducers: {
        setPermissions: (state, action: PayloadAction<Permissions | null>) => {
            state.permissions = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPermissions.fulfilled, (state, action) => {
                state.permissions = action.payload;
            })
             .addCase(fetchPermissions.rejected, (state, action) => {
                console.error("Failed to fetch permissions:", action.payload);
                state.permissions = null;
            })
            .addCase(updatePermissions.fulfilled, (state, action) => {
                state.permissions = action.payload;
            })
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.permissions = null;
            });
    },
});

export const { setPermissions } = permissionsSlice.actions;
export default permissionsSlice.reducer;
