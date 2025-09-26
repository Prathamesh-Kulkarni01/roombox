
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Expense } from '../types';
import { db, isFirebaseConfigured, selectOwnerDataDb } from '../firebase';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { RootState } from '../store';
import { deletePg } from './pgsSlice';

interface ExpensesState {
    expenses: Expense[];
}

const initialState: ExpensesState = {
    expenses: [],
};

type NewExpenseData = Omit<Expense, 'id'>;

export const addExpense = createAsyncThunk<Expense, NewExpenseData, { state: RootState }>(
    'expenses/addExpense',
    async (expenseData, { getState, rejectWithValue }) => {
        const { user } = getState();
        if (!user.currentUser) return rejectWithValue('No user');

        const newExpense: Expense = { id: `exp-${Date.now()}`, ...expenseData };

        if (user.currentPlan?.hasCloudSync && isFirebaseConfigured()) {
            const selectedDb = selectOwnerDataDb(user.currentUser);
            const docRef = doc(selectedDb!, 'users_data', user.currentUser.id, 'expenses', newExpense.id);
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
            .addCase(deletePg.fulfilled, (state, action: PayloadAction<string>) => {
                state.expenses = state.expenses.filter(e => e.pgId !== action.payload);
            })
            .addCase('user/logoutUser/fulfilled', (state) => {
                state.expenses = [];
            });
    },
});

export const { setExpenses } = expensesSlice.actions;
export default expensesSlice.reducer;
