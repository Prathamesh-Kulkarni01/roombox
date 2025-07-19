
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Expense } from '../types';
import { RootState } from '../store';

interface ExpensesState {
    expenses: Expense[];
}

const initialState: ExpensesState = {
    expenses: [],
};

type NewExpenseData = Omit<Expense, 'id'>;

// Async Thunks
export const fetchExpenses = createAsyncThunk<Expense[], void, { state: RootState }>(
    'expenses/fetchExpenses',
    async (_, { getState }) => {
        const { user } = getState();
        if (!user.currentUser) return [];
        const res = await fetch('/api/data/expenses');
        return await res.json();
    }
);

export const addExpense = createAsyncThunk<Expense, NewExpenseData, { state: RootState }>(
    'expenses/addExpense',
    async (expenseData, { rejectWithValue }) => {
        const res = await fetch('/api/data/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(expenseData)
        });
        if (!res.ok) return rejectWithValue('Failed to add expense');
        return await res.json();
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
