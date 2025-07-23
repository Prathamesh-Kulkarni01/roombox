

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Plan, UserRole } from '../types';
import { db, isFirebaseConfigured } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { RootState } from '../store';
import { navItems } from '../mock-data';
import { featurePermissionConfig, type FeaturePermissions, RolePermissions } from '../permissions';

// This maps a UserRole to a full set of feature permissions

interface PermissionsState {
    featurePermissions: RolePermissions | null;
}

const getDefaultPermissions = (plan: Plan): RolePermissions => {
    const staffRoles: UserRole[] = ['manager', 'cook', 'cleaner', 'security', 'other'];
    const permissions: Partial<RolePermissions> = {};

    staffRoles.forEach(role => {
        const perms: FeaturePermissions = {};
        for (const feature in featurePermissionConfig) {
            perms[feature] = {};
            for (const action in featurePermissionConfig[feature as keyof typeof featurePermissionConfig].actions) {
                // Default all to false for staff
                perms[feature][action] = false;
            }
        }
        
        // Sensible defaults for a manager on a paying plan
        if (role === 'manager' && plan.hasStaffManagement) {
            perms.properties = { view: true, add: true, edit: true, delete: false };
            perms.guests = { view: true, add: true, edit: true, delete: true };
            perms.finances = { view: true, add: true };
            perms.complaints = { view: true, edit: true };
            perms.food = { view: true, edit: true };
            perms.staff = { view: true, add: false, edit: false, delete: false };
        }
        
        // Defaults for a cook
        if (role === 'cook') {
            perms.food = { view: true, edit: true };
            perms.finances = { view: true, add: true }; // for expense tracking
        }

        permissions[role] = perms;
    });

    // Owner always gets all permissions
    const ownerPerms: FeaturePermissions = {};
    for (const feature in featurePermissionConfig) {
        ownerPerms[feature] = {};
        for (const action in featurePermissionConfig[feature as keyof typeof featurePermissionConfig].actions) {
            ownerPerms[feature][action] = true;
        }
    }
    permissions['owner'] = ownerPerms;

    return permissions as RolePermissions;
};

const initialState: PermissionsState = {
    featurePermissions: null,
};

// Async Thunks
export const fetchPermissions = createAsyncThunk<RolePermissions, { ownerId: string, plan: Plan }>(
    'permissions/fetchPermissions',
    async ({ ownerId, plan }, { rejectWithValue }) => {
        if (!isFirebaseConfigured() || !db) return rejectWithValue('Firebase not configured');
        const docRef = doc(db, 'users_data', ownerId, 'permissions', 'staff_roles_v2');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as RolePermissions;
        } else {
            // No custom permissions found, create and set defaults
            const defaultPermissions = getDefaultPermissions(plan);
            // Only save to DB if it's a paying customer to avoid writing on every free user's first load.
            // Owner on free plan will just use these defaults in-memory.
            if(plan.id !== 'free') {
                try {
                    await setDoc(docRef, defaultPermissions);
                } catch (error) {
                    console.error("Failed to set default permissions in Firestore:", error)
                }
            }
            return defaultPermissions;
        }
    }
);

export const updatePermissions = createAsyncThunk<RolePermissions, RolePermissions, { state: RootState }>(
    'permissions/updatePermissions',
    async (updatedPermissions, { getState, rejectWithValue }) => {
        const { user } = getState();
        const ownerId = user.currentUser?.id;
        if (!ownerId || !isFirebaseConfigured()) return rejectWithValue('User or Firebase not available');

        const docRef = doc(db, 'users_data', ownerId, 'permissions', 'staff_roles_v2');
        await setDoc(docRef, updatedPermissions);
        return updatedPermissions;
    }
);

const permissionsSlice = createSlice({
    name: 'permissions',
    initialState,
    reducers: {
        setPermissions: (state, action: PayloadAction<RolePermissions | null>) => {
            state.featurePermissions = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPermissions.fulfilled, (state, action) => {
                state.featurePermissions = action.payload;
            })
             .addCase(fetchPermissions.rejected, (state, action) => {
                console.error("Failed to fetch permissions:", action.payload);
                state.featurePermissions = null;
            })
            .addCase(updatePermissions.fulfilled, (state, action) => {
                state.featurePermissions = action.payload;
            })
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.featurePermissions = null;
            });
    },
});

export const { setPermissions } = permissionsSlice.actions;
export default permissionsSlice.reducer;
