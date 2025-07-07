
import { configureStore, Middleware } from '@reduxjs/toolkit';
import appReducer from './slices/appSlice';
import userReducer from './slices/userSlice';
import pgsReducer from './slices/pgsSlice';
import guestsReducer from './slices/guestsSlice';
import complaintsReducer from './slices/complaintsSlice';
import expensesReducer from './slices/expensesSlice';
import staffReducer from './slices/staffSlice';
import notificationsReducer from './slices/notificationsSlice';

const actionsToPersist = [
    'pgs/setPgs', 'pgs/addPg/fulfilled', 'pgs/updatePg/fulfilled',
    'guests/setGuests', 'guests/addGuest/fulfilled', 'guests/updateGuest/fulfilled',
    'complaints/setComplaints', 'complaints/addComplaint/fulfilled', 'complaints/updateComplaint/fulfilled',
    'expenses/setExpenses', 'expenses/addExpense/fulfilled',
    'staff/setStaff', 'staff/addStaff/fulfilled', 'staff/updateStaff/fulfilled', 'staff/deleteStaff/fulfilled',
    'user/setCurrentUser'
];

const localStorageMiddleware: Middleware = store => next => action => {
    const result = next(action);
    if (typeof window !== 'undefined' && actionsToPersist.includes(action.type)) {
        const state = store.getState();
        try {
            if (action.type.startsWith('pgs/')) localStorage.setItem('pgs', JSON.stringify(state.pgs.pgs));
            if (action.type.startsWith('guests/')) localStorage.setItem('guests', JSON.stringify(state.guests.guests));
            if (action.type.startsWith('complaints/')) localStorage.setItem('complaints', JSON.stringify(state.complaints.complaints));
            if (action.type.startsWith('expenses/')) localStorage.setItem('expenses', JSON.stringify(state.expenses.expenses));
            if (action.type.startsWith('staff/')) localStorage.setItem('staff', JSON.stringify(state.staff.staff));
            if (action.type === 'user/setCurrentUser') localStorage.setItem('currentUserId', JSON.stringify(state.user.currentUser?.id || null));
        } catch (e) {
            console.error("Could not save to localStorage", e);
        }
    }
    return result;
};


export const makeStore = () => {
  return configureStore({
    reducer: {
        app: appReducer,
        user: userReducer,
        pgs: pgsReducer,
        guests: guestsReducer,
        complaints: complaintsReducer,
        expenses: expensesReducer,
        staff: staffReducer,
        notifications: notificationsReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(localStorageMiddleware),
    devTools: process.env.NODE_ENV !== 'production',
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
