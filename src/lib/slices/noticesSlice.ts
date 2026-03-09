
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Notice } from '../types';
import { db, isFirebaseConfigured, selectOwnerDataDb } from '../firebase';
import { collection, doc, getDocs, setDoc, query, orderBy } from 'firebase/firestore';
import { RootState } from '../store';

interface NoticesState {
    notices: Notice[];
    isLoading: boolean;
    error: string | null;
}

const initialState: NoticesState = {
    notices: [],
    isLoading: false,
    error: null,
};

export const fetchNotices = createAsyncThunk<Notice[], void, { state: RootState }>(
    'notices/fetchNotices',
    async (_, { getState, rejectWithValue }) => {
        const { user } = getState();
        const ownerId = user.currentUser?.id;

        if (!user.currentUser || !ownerId || user.currentUser.role !== 'owner') {
            return rejectWithValue('Only owners can fetch notice history.');
        }

        try {
            if (isFirebaseConfigured()) {
                const selectedDb = selectOwnerDataDb(user.currentUser);
                const noticesRef = collection(selectedDb, 'users_data', ownerId, 'notices');
                const q = query(noticesRef, orderBy('date', 'desc'));
                const querySnapshot = await getDocs(q);
                return querySnapshot.docs.map(doc => doc.data() as Notice);
            }
            return [];
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const addNotice = createAsyncThunk<Notice, Notice, { state: RootState }>(
    'notices/addNotice',
    async (newNotice, { getState, rejectWithValue }) => {
        const { user } = getState();
        const ownerId = user.currentUser?.id;

        if (!user.currentUser || !ownerId || user.currentUser.role !== 'owner') {
            return rejectWithValue('Only owners can save notices.');
        }

        try {
            if (isFirebaseConfigured()) {
                const selectedDb = selectOwnerDataDb(user.currentUser);
                const docRef = doc(selectedDb, 'users_data', ownerId, 'notices', newNotice.id);
                await setDoc(docRef, newNotice);
            }
            return newNotice;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

const noticesSlice = createSlice({
    name: 'notices',
    initialState,
    reducers: {
        setNotices: (state, action: PayloadAction<Notice[]>) => {
            state.notices = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchNotices.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchNotices.fulfilled, (state, action) => {
                state.isLoading = false;
                state.notices = action.payload;
            })
            .addCase(fetchNotices.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            .addCase(addNotice.fulfilled, (state, action) => {
                state.notices.unshift(action.payload);
            })
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.notices = [];
                state.error = null;
            });
    },
});

export const { setNotices } = noticesSlice.actions;
export default noticesSlice.reducer;
