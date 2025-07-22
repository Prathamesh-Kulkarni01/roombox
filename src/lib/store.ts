

import { configureStore, Middleware } from '@reduxjs/toolkit';
import appReducer from './slices/appSlice';
import userReducer from './slices/userSlice';
import pgsReducer from './slices/pgsSlice';
import guestsReducer from './slices/guestsSlice';
import complaintsReducer from './slices/complaintsSlice';
import expensesReducer from './slices/expensesSlice';
import staffReducer from './slices/staffSlice';
import notificationsReducer from './slices/notificationsSlice';
import chargeTemplatesReducer from './slices/chargeTemplatesSlice';

const actionsToPersist = [
    'pgs/addPg/fulfilled', 'pgs/updatePg/fulfilled', 'pgs/deletePg/fulfilled',
    'guests/addGuest/fulfilled', 'guests/updateGuest/fulfilled', 'guests/addAdditionalCharge/fulfilled', 'guests/removeAdditionalCharge/fulfilled', 'guests/addSharedChargeToRoom/fulfilled', 'guests/initiateGuestExit/fulfilled', 'guests/vacateGuest/fulfilled',
    'complaints/addComplaint/fulfilled', 'complaints/updateComplaint/fulfilled',
    'expenses/addExpense/fulfilled',
    'staff/addStaff/fulfilled', 'staff/updateStaff/fulfilled', 'staff/deleteStaff/fulfilled',
    'user/setCurrentUser',
    'chargeTemplates/saveChargeTemplate/fulfilled', 'chargeTemplates/updateChargeTemplate/fulfilled', 'chargeTemplates/deleteChargeTemplate/fulfilled'
];

const localStorageMiddleware: Middleware = store => next => action => {
    const result = next(action);
    
    const state = store.getState();
    const useCloud = state.user.currentPlan?.hasCloudSync ?? false;

    if (typeof window !== 'undefined' && !useCloud && actionsToPersist.some(prefix => action.type.startsWith(prefix))) {
        try {
            if (action.type.startsWith('pgs/')) localStorage.setItem('pgs', JSON.stringify(state.pgs.pgs));
            if (action.type.startsWith('guests/')) localStorage.setItem('guests', JSON.stringify(state.guests.guests));
            if (action.type.startsWith('complaints/')) localStorage.setItem('complaints', JSON.stringify(state.complaints.complaints));
            if (action.type.startsWith('expenses/')) localStorage.setItem('expenses', JSON.stringify(state.expenses.expenses));
            if (action.type.startsWith('staff/')) localStorage.setItem('staff', JSON.stringify(state.staff.staff));
            if (action.type.startsWith('chargeTemplates/')) localStorage.setItem('chargeTemplates', JSON.stringify(state.chargeTemplates.chargeTemplates));
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
        chargeTemplates: chargeTemplatesReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
        serializableCheck: false, 
        immutableCheck: false,
    }).concat(localStorageMiddleware),
    devTools: process.env.NODE_ENV !== 'production',
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
