
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { KycDocumentConfig } from '../types';
import { db, isFirebaseConfigured } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { RootState } from '../store';

interface KycConfigState {
    kycConfigs: KycDocumentConfig[];
}

const initialState: KycConfigState = {
    kycConfigs: [],
};

// Async Thunks
export const fetchKycConfig = createAsyncThunk<KycDocumentConfig[], { ownerId: string }>(
    'kycConfig/fetchKycConfig',
    async ({ ownerId }, { rejectWithValue }) => {
        if (!isFirebaseConfigured() || !db) return rejectWithValue('Firebase not configured');
        const docRef = doc(db, 'users_data', ownerId, 'settings', 'kycConfig');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().configs) {
            return docSnap.data().configs as KycDocumentConfig[];
        } else {
            return []; // Return empty array if not configured
        }
    }
);

export const saveKycConfig = createAsyncThunk<KycDocumentConfig[], KycDocumentConfig[], { state: RootState }>(
    'kycConfig/saveKycConfig',
    async (configs, { getState, rejectWithValue }) => {
        const { user } = getState();
        const ownerId = user.currentUser?.id;

        if (!ownerId || !isFirebaseConfigured()) {
            return rejectWithValue('User or Firebase not available');
        }

        const docRef = doc(db, 'users_data', ownerId, 'settings', 'kycConfig');
        await setDoc(docRef, { configs });
        return configs;
    }
);

const kycConfigSlice = createSlice({
    name: 'kycConfig',
    initialState,
    reducers: {
        setKycConfig: (state, action: PayloadAction<KycDocumentConfig[]>) => {
            state.kycConfigs = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchKycConfig.fulfilled, (state, action) => {
                state.kycConfigs = action.payload;
            })
            .addCase(saveKycConfig.fulfilled, (state, action) => {
                state.kycConfigs = action.payload;
            })
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.kycConfigs = [];
            });
    },
});

export const { setKycConfig } = kycConfigSlice.actions;
export default kycConfigSlice.reducer;
