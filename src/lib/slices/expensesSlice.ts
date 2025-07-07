
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Expense } from '../types';
import { db, isFirebaseConfigured } from '../firebase';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { RootState } from '../store';

interface ExpensesState {
    expenses: Expense[];
}

const initialState: ExpensesState = {
    expenses: [],
};

type NewExpenseData = Omit<Expense, 'id'>;

// Async Thunks
export const fetchExpenses = createAsyncThunk(
    'expenses/fetchExpenses',
    async ({ userId, useCloud }: { userId: string, useCloud: boolean }) => {
        if (useCloud) {
            const expensesCollection = collection(db, 'users_data', userId, 'expenses');
            const snap = await getDocs(expensesCollection);
            return snap.docs.map(d => d.data() as Expense);
        } else {
            if(typeof window === 'undefined') return [];
            const localData = localStorage.getItem('expenses');
            return localData ? JSON.parse(localData) : [];
        }
    }
);

export const addExpense = createAsyncThunk<Expense, NewExpenseData, { state: RootState }>(
    'expenses/addExpense',
    async (expenseData, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser) return rejectWithValue('No user');

        const newExpense: Expense = { id: `exp-${Date.now()}`, ...expenseData };

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const docRef = doc(db, 'users_data', user.currentUser.id, 'expenses', newExpense.id);
            await setDoc(docRef, newExpense);
        }
        return newExpense;
    }
);

const expensesSlice = createSlice({
    name: 'expenses',
    initialState,
    reducers: {
        setExpenses: (state, action: PayloadAction<Expense[]>) => {
            state.expenses = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchExpenses.fulfilled, (state, action) => {
                state.expenses = action.payload.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            })
            .addCase(addExpense.fulfilled, (state, action) => {
                state.expenses.unshift(action.payload);
            })
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.expenses = [];
            });
    },
});

export const { setExpenses } = expensesSlice.actions;
export default expensesSlice.reducer;
