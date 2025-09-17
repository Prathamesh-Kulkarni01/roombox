
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { ChargeTemplate } from '../types';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { RootState } from '../store';

interface ChargeTemplatesState {
    chargeTemplates: ChargeTemplate[];
}

const initialState: ChargeTemplatesState = {
    chargeTemplates: [],
};

export const saveChargeTemplate = createAsyncThunk<ChargeTemplate, Omit<ChargeTemplate, 'id'>, { state: RootState }>(
    'chargeTemplates/saveChargeTemplate',
    async (templateData, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser) return rejectWithValue('No user');

        const newTemplate: ChargeTemplate = { 
            id: `ct-${Date.now()}`, 
            ...templateData,
            unitCost: templateData.unitCost ?? null,
        };

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const docRef = doc(db, 'users_data', user.currentUser.id, 'chargeTemplates', newTemplate.id);
            await setDoc(docRef, newTemplate);
        }
        return newTemplate;
    }
);

export const updateChargeTemplate = createAsyncThunk<ChargeTemplate, ChargeTemplate, { state: RootState }>(
    'chargeTemplates/updateChargeTemplate',
    async (templateData, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser) return rejectWithValue('No user');
        
        const updatedTemplate = {
            ...templateData,
            unitCost: templateData.unitCost ?? null,
        }

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const docRef = doc(db, 'users_data', user.currentUser.id, 'chargeTemplates', updatedTemplate.id);
            await setDoc(docRef, updatedTemplate, { merge: true });
        }
        return updatedTemplate;
    }
);

export const deleteChargeTemplate = createAsyncThunk<string, string, { state: RootState }>(
    'chargeTemplates/deleteChargeTemplate',
    async (templateId, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser) return rejectWithValue('No user');

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const docRef = doc(db, 'users_data', user.currentUser.id, 'chargeTemplates', templateId);
            await deleteDoc(docRef);
        }
        return templateId;
    }
);

const chargeTemplatesSlice = createSlice({
    name: 'chargeTemplates',
    initialState,
    reducers: {
        setChargeTemplates: (state, action: PayloadAction<ChargeTemplate[]>) => {
            state.chargeTemplates = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.chargeTemplates = [];
            });
    },
});

export const { setChargeTemplates } = chargeTemplatesSlice.actions;
export default chargeTemplatesSlice.reducer;
