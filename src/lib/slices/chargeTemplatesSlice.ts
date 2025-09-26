
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { ChargeTemplate } from '../types';
import { db, isFirebaseConfigured, selectOwnerDataDb } from '../firebase';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { RootState } from '../store';

interface ChargeTemplatesState {
    templates: ChargeTemplate[];
}

const initialState: ChargeTemplatesState = {
    templates: [],
};

export const addChargeTemplate = createAsyncThunk<ChargeTemplate, Omit<ChargeTemplate, 'id'>, { state: RootState }>(
    'chargeTemplates/add',
    async (newTemplateData, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser) return rejectWithValue('No user');
        const newTemplate: ChargeTemplate = { ...newTemplateData, id: `tmpl-${Date.now()}` };
        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const selectedDb = selectOwnerDataDb(user.currentUser);
            const docRef = doc(selectedDb!, 'users_data', user.currentUser.id, 'chargeTemplates', newTemplate.id);
            await setDoc(docRef, newTemplate);
        }
        return newTemplate;
    }
);

export const updateChargeTemplate = createAsyncThunk<ChargeTemplate, ChargeTemplate, { state: RootState }>(
    'chargeTemplates/update',
    async (updatedTemplate, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser) return rejectWithValue('No user');
        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const selectedDb = selectOwnerDataDb(user.currentUser);
            const docRef = doc(selectedDb!, 'users_data', user.currentUser.id, 'chargeTemplates', updatedTemplate.id);
            await setDoc(docRef, updatedTemplate, { merge: true });
        }
        return updatedTemplate;
    }
);

export const deleteChargeTemplate = createAsyncThunk<string, string, { state: RootState }>(
    'chargeTemplates/delete',
    async (templateId, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser) return rejectWithValue('No user');
        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const selectedDb = selectOwnerDataDb(user.currentUser);
            const docRef = doc(selectedDb!, 'users_data', user.currentUser.id, 'chargeTemplates', templateId);
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
            state.templates = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.templates = [];
            });
    },
});

export const { setChargeTemplates } = chargeTemplatesSlice.actions;
export default chargeTemplatesSlice.reducer;
