
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
import permissionsReducer from './slices/permissionsSlice';
import kycConfigReducer from './slices/kycConfigSlice';

// A list of action types that should trigger a save to local storage
const actionsToPersist = [
    'pgs/addPg/fulfilled', 'pgs/updatePg/fulfilled', 'pgs/deletePg/fulfilled',
    'guests/addGuest/fulfilled', 'guests/updateGuest/fulfilled', 'guests/vacateGuest/fulfilled',
    'complaints/addComplaint/fulfilled', 'complaints/updateComplaint/fulfilled',
    'expenses/addExpense/fulfilled',
    'staff/addStaff/fulfilled', 'staff/updateStaff/fulfilled', 'staff/deleteStaff/fulfilled',
    'chargeTemplates/addChargeTemplate/fulfilled', 'chargeTemplates/updateChargeTemplate/fulfilled', 'chargeTemplates/deleteChargeTemplate/fulfilled',
    'permissions/updatePermissions/fulfilled',
    'kycConfig/saveKycConfig/fulfilled',
];

const localStorageMiddleware: Middleware = store => next => action => {
    const result = next(action);
    
    if (typeof window !== 'undefined' && actionsToPersist.includes(action.type)) {
        const state = store.getState();
        const useCloud = state.user.currentPlan?.hasCloudSync ?? false;

        if (!useCloud) {
            localStorage.setItem('pgs', JSON.stringify(state.pgs.pgs));
            localStorage.setItem('guests', JSON.stringify(state.guests.guests));
            localStorage.setItem('complaints', JSON.stringify(state.complaints.complaints));
            localStorage.setItem('expenses', JSON.stringify(state.expenses.expenses));
            localStorage.setItem('staff', JSON.stringify(state.staff.staff));
            localStorage.setItem('chargeTemplates', JSON.stringify(state.chargeTemplates.templates));
            localStorage.setItem('permissions', JSON.stringify(state.permissions.featurePermissions));
            localStorage.setItem('kycConfig', JSON.stringify(state.kycConfig.kycConfigs));
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
        permissions: permissionsReducer,
        kycConfig: kycConfigReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }).concat(localStorageMiddleware),
    devTools: process.env.NODE_ENV !== 'production',
  });
};

export const store = makeStore();

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

    